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

interface CreateRunResponse {
  runId: string;
}

interface WorkflowRunSnapshot {
  runId: string;
  status: 'running' | 'success' | 'failed';
  result?: WeatherWorkflowResult;
}

interface WorkflowRunResponse {
  snapshot: WorkflowRunSnapshot;
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

    const run = (await statusResponse.json()) as WorkflowRunResponse;

    if (run.snapshot.status === 'success') {
      if (!run.snapshot.result) {
        throw new Error('Workflow completed but no result found');
      }
      return run.snapshot.result;
    }

    if (run.snapshot.status === 'failed') {
      throw new Error('Workflow execution failed');
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error('Workflow timed out');
}
