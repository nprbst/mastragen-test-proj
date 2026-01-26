import { registerApiRoute } from '@mastra/core/server';

interface FeedbackRequest {
  spanId: string;
  label: 'thumbs_up' | 'thumbs_down';
  score: number;
  explanation?: string;
}

function getPhoenixConfig() {
  const endpoint = process.env.PHOENIX_ENDPOINT || 'http://localhost:6006/v1/traces';
  const baseUrl = endpoint.replace(/\/v1\/traces\/?$/, '');
  return {
    baseUrl,
    apiKey: process.env.PHOENIX_API_KEY,
  };
}

export const feedbackRoute = registerApiRoute('/feedback', {
  method: 'POST',
  handler: async (c) => {
    const body = await c.req.json<FeedbackRequest>();

    if (!body.spanId) {
      return c.json({ error: 'spanId is required' }, 400);
    }

    if (!body.label || !['thumbs_up', 'thumbs_down'].includes(body.label)) {
      return c.json({ error: 'label must be "thumbs_up" or "thumbs_down"' }, 400);
    }

    const { baseUrl, apiKey } = getPhoenixConfig();
    const annotationsUrl = `${baseUrl}/v1/span_annotations?sync=true`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers.api_key = apiKey;
    }

    const annotationPayload = {
      data: [
        {
          span_id: body.spanId,
          name: 'user_feedback',
          annotator_kind: 'HUMAN',
          result: {
            label: body.label,
            score: body.score ?? (body.label === 'thumbs_up' ? 1 : 0),
            explanation: body.explanation || null,
          },
          metadata: {
            timestamp: new Date().toISOString(),
          },
        },
      ],
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
      return c.json({ success: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return c.json({ error: 'Failed to submit feedback', details: message }, 500);
    }
  },
});
