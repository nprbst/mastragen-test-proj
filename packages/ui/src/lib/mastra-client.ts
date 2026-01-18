const MASTRA_API_URL = import.meta.env.MASTRA_API_URL || 'http://localhost:4111';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Agent {
  id: string;
  name: string;
  instructions: string;
}

export interface Workflow {
  id: string;
  name?: string;
}

export async function listAgents(): Promise<Agent[]> {
  const response = await fetch(`${MASTRA_API_URL}/api/agents`);
  if (!response.ok) throw new Error('Failed to fetch agents');
  return response.json();
}

export async function listWorkflows(): Promise<Workflow[]> {
  const response = await fetch(`${MASTRA_API_URL}/api/workflows`);
  if (!response.ok) throw new Error('Failed to fetch workflows');
  return response.json();
}

export async function chatWithAgent(
  agentId: string,
  messages: Message[]
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${MASTRA_API_URL}/api/agents/${agentId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok || !response.body) {
    throw new Error('Failed to chat with agent');
  }
  return response.body;
}

export async function executeWorkflow(
  workflowId: string,
  input: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(`${MASTRA_API_URL}/api/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to execute workflow');
  return response.json();
}
