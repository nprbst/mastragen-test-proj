import type { Mastra } from '@mastra/core/mastra';
import { registerApiRoute } from '@mastra/core/server';

interface StreamRequest {
  messages: Array<{ role: string; content: string }>;
}

export const agentStreamRoute = registerApiRoute('/agents/:agentId/stream-with-trace', {
  method: 'POST',
  handler: async (c) => {
    const agentId = c.req.param('agentId');
    const body = await c.req.json<StreamRequest>();

    if (!agentId) {
      return c.json({ error: 'agentId is required' }, 400);
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    const mastra = c.get('mastra') as Mastra;
    const agent = mastra.getAgent(agentId);

    if (!agent) {
      return c.json({ error: `Agent '${agentId}' not found` }, 404);
    }

    // Start the agent stream - traceId is available immediately
    const agentStream = await agent.stream(body.messages as Parameters<typeof agent.stream>[0]);

    // Create a readable stream that transforms the agent stream to SSE format
    const encoder = new TextEncoder();
    const traceId = agentStream.traceId;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send trace ID as first event so client can capture it
          if (traceId) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'trace-id', traceId })}\n\n`)
            );
          }
          for await (const chunk of agentStream.fullStream) {
            const data = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`)
          );
          controller.close();
        }
      },
    });

    // Build headers including X-Trace-Id and CORS headers
    const origin = c.req.header('Origin') || '*';
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Expose-Headers': 'X-Trace-Id',
    };

    if (agentStream.traceId) {
      headers['X-Trace-Id'] = agentStream.traceId;
    }

    return new Response(stream, { headers });
  },
});
