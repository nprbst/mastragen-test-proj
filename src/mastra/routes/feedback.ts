import { registerApiRoute } from '@mastra/core/server';

interface FeedbackRequest {
  traceId: string;
  label: 'thumbs_up' | 'thumbs_down';
  score: number;
  explanation?: string;
}

interface PhoenixSpan {
  context: {
    trace_id: string;
    span_id: string;
  };
  parent_id?: string;
  name: string;
}

function getPhoenixConfig() {
  const endpoint = process.env.PHOENIX_ENDPOINT || 'http://localhost:6006/v1/traces';
  const baseUrl = endpoint.replace(/\/v1\/traces\/?$/, '');
  return {
    baseUrl,
    apiKey: process.env.PHOENIX_API_KEY,
    projectName: process.env.PHOENIX_PROJECT_NAME || 'default',
  };
}

async function getSpanIdsForTrace(traceId: string): Promise<string[]> {
  const { baseUrl, apiKey, projectName } = getPhoenixConfig();

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.api_key = apiKey;
  }

  const response = await fetch(`${baseUrl}/v1/projects/${projectName}/spans?limit=100`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch spans: ${response.statusText}`);
  }

  const data = await response.json();
  const spans = data.data as PhoenixSpan[];

  // Filter spans matching this trace_id, return root span(s) - those without parent_id
  const rootSpans = spans
    .filter((span) => span.context.trace_id === traceId)
    .filter((span) => !span.parent_id)
    .map((span) => span.context.span_id);

  return rootSpans;
}

export const feedbackRoute = registerApiRoute('/feedback', {
  method: 'POST',
  handler: async (c) => {
    const body = await c.req.json<FeedbackRequest>();

    if (!body.traceId) {
      return c.json({ error: 'traceId is required' }, 400);
    }

    if (!body.label || !['thumbs_up', 'thumbs_down'].includes(body.label)) {
      return c.json({ error: 'label must be "thumbs_up" or "thumbs_down"' }, 400);
    }

    const { baseUrl, apiKey } = getPhoenixConfig();

    // Resolve traceId to actual span ID(s)
    let spanIds: string[];
    try {
      spanIds = await getSpanIdsForTrace(body.traceId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: 'Failed to resolve trace to spans', details: message }, 500);
    }

    if (spanIds.length === 0) {
      return c.json({ error: 'No spans found for trace', traceId: body.traceId }, 404);
    }

    const annotationsUrl = `${baseUrl}/v1/span_annotations?sync=true`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.api_key = apiKey;
    }

    // Create annotations for all resolved span IDs
    const annotationPayload = {
      data: spanIds.map((spanId) => ({
        span_id: spanId,
        name: 'user_feedback',
        annotator_kind: 'HUMAN',
        result: {
          label: body.label,
          score: body.score ?? (body.label === 'thumbs_up' ? 1 : 0),
          explanation: body.explanation || null,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          traceId: body.traceId,
        },
      })),
    };

    try {
      const response = await fetch(annotationsUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(annotationPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return c.json(
          {
            error: `Phoenix API error: ${response.statusText}`,
            details: errorText,
          },
          response.status as 400 | 401 | 403 | 404 | 500
        );
      }

      const result = await response.json();
      return c.json({ success: true, result, spanIds });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: 'Failed to submit feedback', details: message }, 500);
    }
  },
});
