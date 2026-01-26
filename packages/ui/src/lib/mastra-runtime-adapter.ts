import type { ChatModelAdapter, ChatModelRunResult } from '@assistant-ui/react';

const getMastraApiUrl = (): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_MASTRA_API_URL) {
    return import.meta.env.PUBLIC_MASTRA_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4111`;
  }
  return 'http://localhost:4111';
};

export interface MastraAdapterOptions {
  agentId: string;
  onTraceId?: (traceId: string) => void;
}

export function createMastraAdapter(options: MastraAdapterOptions): ChatModelAdapter {
  const { agentId, onTraceId } = options;

  return {
    async *run({ messages, abortSignal }) {
      const apiUrl = getMastraApiUrl();

      const formattedMessages = messages.map((msg) => ({
        role: msg.role,
        content: msg.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('\n'),
      }));

      const response = await fetch(`${apiUrl}/agents/${agentId}/stream-with-trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: formattedMessages }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`Failed to stream from agent: ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body from agent');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let toolCalls: ToolCall[] = [];
      let traceIdCaptured = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });

          // Check for trace-id event in the stream
          if (!traceIdCaptured && onTraceId) {
            const traceIdMatch = chunk.match(/"type":"trace-id","traceId":"([^"]+)"/);
            if (traceIdMatch) {
              onTraceId(traceIdMatch[1]);
              traceIdCaptured = true;
            }
          }

          const parseResult = parseMastraChunk(chunk, accumulatedText, toolCalls);
          accumulatedText = parseResult.text;
          toolCalls = parseResult.toolCalls;

          yield buildRunResult(accumulatedText, toolCalls);
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}

interface ToolCall {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}

function parseMastraChunk(
  chunk: string,
  currentText: string,
  currentToolCalls: ToolCall[]
): { text: string; toolCalls: ToolCall[] } {
  let text = currentText;
  const toolCalls = [...currentToolCalls];

  const lines = chunk.split('\n').filter(Boolean);

  for (const line of lines) {
    // Check for SSE-style data prefix
    const dataLine = line.startsWith('data: ') ? line.slice(6) : line;

    // Skip [DONE] marker
    if (dataLine === '[DONE]') {
      continue;
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(dataLine);

      // Skip trace-id event (handled separately)
      if (parsed.type === 'trace-id') {
        continue;
      }

      // Mastra stream format: data is nested in payload
      const payload = parsed.payload;

      // Handle text delta - Mastra format: {"type":"text-delta","payload":{"text":"..."}}
      if (parsed.type === 'text-delta' && payload?.text) {
        text += payload.text;
        continue;
      }

      // Handle tool call - Mastra format: {"type":"tool-call","payload":{"toolCallId","toolName","args"}}
      if (parsed.type === 'tool-call' && payload) {
        toolCalls.push({
          id: payload.toolCallId || payload.id || crypto.randomUUID(),
          toolName: payload.toolName || payload.name,
          args: payload.args || payload.input || {},
        });
        continue;
      }

      // Handle tool result - Mastra format: {"type":"tool-result","payload":{"toolCallId","result"}}
      if (parsed.type === 'tool-result' && payload?.toolCallId) {
        const existingCallIndex = toolCalls.findIndex((tc) => tc.id === payload.toolCallId);
        if (existingCallIndex >= 0) {
          toolCalls[existingCallIndex] = {
            ...toolCalls[existingCallIndex],
            result: payload.result,
          };
        }
        continue;
      }

      // Skip other event types (start, step-start, step-finish, finish, etc.)
      // These don't contain content to display
    } catch {
      // Not JSON - skip non-JSON lines
    }
  }

  return { text, toolCalls };
}

function buildRunResult(text: string, toolCalls: ToolCall[]): ChatModelRunResult {
  const parts: Array<{ type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown>; argsText: string; result?: unknown }> = [];

  // Add text content if present
  if (text.trim()) {
    parts.push({ type: 'text', text });
  }

  // Add tool calls
  for (const tc of toolCalls) {
    parts.push({
      type: 'tool-call',
      toolCallId: tc.id,
      toolName: tc.toolName,
      args: tc.args,
      argsText: JSON.stringify(tc.args),
      result: tc.result,
    });
  }

  // Ensure we always have some content
  if (parts.length === 0) {
    parts.push({ type: 'text', text: '' });
  }

  return { content: parts as ChatModelRunResult['content'] };
}
