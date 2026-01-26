function getMastraApiUrl(): string {
  if (import.meta.env.PUBLIC_MASTRA_API_URL) {
    return import.meta.env.PUBLIC_MASTRA_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4111`;
  }
  return 'http://localhost:4111';
}

const MASTRA_API_URL = getMastraApiUrl();

async function getTraceIdForRun(runId: string): Promise<string | null> {
  const apiUrl = getMastraApiUrl();
  try {
    const response = await fetch(`${apiUrl}/workflows/trace-by-run/${runId}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.traceId ?? null;
  } catch {
    return null;
  }
}

export interface WeatherForecast {
  date: string;
  location: string;
  maxTemp: number;
  minTemp: number;
  precipitationChance: number;
  condition: string;
}

export interface WeatherWorkflowResult {
  forecast: WeatherForecast;
  activities: string;
}

export interface ContentWorkflowResult {
  finalCopy: string;
  runId: string;
  traceId?: string;
}

interface CreateRunResponse {
  runId: string;
}

interface WorkflowRunResponse<T = unknown> {
  runId: string;
  status: 'running' | 'success' | 'failed';
  result?: T;
}

export async function runWeatherWorkflow(city: string): Promise<WeatherWorkflowResult> {
  // Step 1: Create a workflow run
  const createRunResponse = await fetch(
    `${MASTRA_API_URL}/api/workflows/weatherWorkflow/create-run`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!createRunResponse.ok) {
    throw new Error(`Failed to create workflow run: ${createRunResponse.statusText}`);
  }

  const { runId } = (await createRunResponse.json()) as CreateRunResponse;

  // Step 2: Start the workflow with input data
  const startResponse = await fetch(
    `${MASTRA_API_URL}/api/workflows/weatherWorkflow/start?runId=${runId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputData: { city } }),
    }
  );

  if (!startResponse.ok) {
    throw new Error(`Failed to start workflow: ${startResponse.statusText}`);
  }

  // Step 3: Poll for completion
  const maxAttempts = 60;
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await fetch(
      `${MASTRA_API_URL}/api/workflows/weatherWorkflow/runs/${runId}`
    );

    if (!statusResponse.ok) {
      throw new Error(`Failed to get workflow status: ${statusResponse.statusText}`);
    }

    const run = (await statusResponse.json()) as WorkflowRunResponse<WeatherWorkflowResult>;

    if (run.status === 'success') {
      if (!run.result) {
        throw new Error('Workflow completed but no result found');
      }
      return run.result;
    }

    if (run.status === 'failed') {
      throw new Error('Workflow execution failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Workflow timed out');
}

export async function runContentWorkflow(topic: string): Promise<ContentWorkflowResult> {
  const apiUrl = getMastraApiUrl();

  // Step 1: Create a workflow run
  const createRunResponse = await fetch(
    `${apiUrl}/api/workflows/contentWorkflow/create-run`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!createRunResponse.ok) {
    throw new Error(`Failed to create workflow run: ${createRunResponse.statusText}`);
  }

  const { runId } = (await createRunResponse.json()) as CreateRunResponse;

  // Step 2: Start the workflow with input data
  const startResponse = await fetch(
    `${apiUrl}/api/workflows/contentWorkflow/start?runId=${runId}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputData: { topic } }),
    }
  );

  if (!startResponse.ok) {
    throw new Error(`Failed to start workflow: ${startResponse.statusText}`);
  }

  // Step 3: Poll for completion
  const maxAttempts = 120; // Content generation takes longer
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const statusResponse = await fetch(
      `${apiUrl}/api/workflows/contentWorkflow/runs/${runId}`
    );

    if (!statusResponse.ok) {
      throw new Error(`Failed to get workflow status: ${statusResponse.statusText}`);
    }

    const run = (await statusResponse.json()) as WorkflowRunResponse<Omit<ContentWorkflowResult, 'runId'>>;

    if (run.status === 'success') {
      if (!run.result) {
        throw new Error('Workflow completed but no result found');
      }
      // Resolve traceId from Phoenix after workflow completion
      const traceId = await getTraceIdForRun(runId);
      return { ...run.result, runId, traceId: traceId ?? undefined };
    }

    if (run.status === 'failed') {
      throw new Error('Workflow execution failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Workflow timed out');
}
