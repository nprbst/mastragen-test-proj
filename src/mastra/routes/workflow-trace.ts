import { registerApiRoute } from '@mastra/core/server';

function getPhoenixConfig() {
  const endpoint = process.env.PHOENIX_ENDPOINT || 'http://localhost:6006/v1/traces';
  const baseUrl = endpoint.replace(/\/v1\/traces\/?$/, '');
  return {
    baseUrl,
    apiKey: process.env.PHOENIX_API_KEY,
    projectName: process.env.PHOENIX_PROJECT_NAME || 'default',
  };
}

interface PhoenixSpan {
  context: {
    trace_id: string;
    span_id: string;
  };
  name?: string;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

async function fetchSpansFromPhoenix(): Promise<PhoenixSpan[] | null> {
  const { baseUrl, apiKey, projectName } = getPhoenixConfig();

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers.api_key = apiKey;
  }

  const response = await fetch(`${baseUrl}/v1/projects/${projectName}/spans?limit=500`, {
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.data as PhoenixSpan[];
}

function findSpanByRunId(spans: PhoenixSpan[], runId: string): PhoenixSpan | undefined {
  return spans.find((span) => {
    const attrs = span.attributes || {};
    // Phoenix stores it as flattened key: attributes['metadata.runId']
    return attrs['metadata.runId'] === runId;
  });
}

async function getTraceIdByRunId(
  runId: string,
  maxRetries = 3,
  retryDelayMs = 1000
): Promise<{ traceId: string | null; debug?: unknown }> {
  // Retry loop to handle timing issues with Phoenix indexing
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }

    const spans = await fetchSpansFromPhoenix();

    if (!spans) {
      return { traceId: null, debug: { error: 'Phoenix API error', attempt } };
    }

    const matchingSpan = findSpanByRunId(spans, runId);

    if (matchingSpan) {
      return { traceId: matchingSpan.context?.trace_id ?? null };
    }
  }

  // All retries exhausted, fetch one more time for debug info
  const spans = await fetchSpansFromPhoenix();
  const workflowRunSpans = (spans || []).filter(
    (s) => s.attributes?.['mastra.span.type'] === 'workflow_run'
  );

  return {
    traceId: null,
    debug: {
      totalSpans: spans?.length ?? 0,
      workflowRunSpanCount: workflowRunSpans.length,
      retriesAttempted: maxRetries,
      availableRunIds: workflowRunSpans.slice(0, 5).map((s) => s.attributes?.['metadata.runId']),
    },
  };
}

export const workflowTraceRoute = registerApiRoute('/workflows/trace-by-run/:runId', {
  method: 'GET',
  handler: async (c) => {
    const runId = c.req.param('runId');

    if (!runId) {
      return c.json({ error: 'runId is required' }, 400);
    }

    const result = await getTraceIdByRunId(runId);

    if (!result.traceId) {
      return c.json({ error: 'Trace not found for runId', runId, debug: result.debug }, 404);
    }

    return c.json({ traceId: result.traceId, runId });
  },
});
