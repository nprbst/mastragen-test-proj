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
}

export function createMastraAdapter(options: MastraAdapterOptions): ChatModelAdapter {
  const { agentId } = options;

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

      const response = await fetch(`${apiUrl}/api/agents/${agentId}/stream`, {
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

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
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

  // Mastra streams data in various formats depending on configuration
  // Try to detect and parse structured tool call data
  const lines = chunk.split('\n').filter(Boolean);

  for (const line of lines) {
    // Check for SSE-style data prefix
    const dataLine = line.startsWith('data: ') ? line.slice(6) : line;

    // Try to parse as JSON (tool call or structured response)
    try {
      const parsed = JSON.parse(dataLine);

      // Handle tool call format
      if (parsed.type === 'tool-call' || parsed.toolCall) {
        const tc = parsed.toolCall || parsed;
        toolCalls.push({
          id: tc.id || tc.toolCallId || crypto.randomUUID(),
          toolName: tc.toolName || tc.name,
          args: tc.args || tc.input || {},
          result: tc.result,
        });
        continue;
      }

      // Handle tool result format
      if (parsed.type === 'tool-result' && parsed.toolCallId) {
        const existingCallIndex = toolCalls.findIndex((tc) => tc.id === parsed.toolCallId);
        if (existingCallIndex >= 0) {
          toolCalls[existingCallIndex] = {
            ...toolCalls[existingCallIndex],
            result: parsed.result,
          };
        }
        continue;
      }

      // Handle text delta format
      if (parsed.type === 'text-delta' || parsed.textDelta) {
        text += parsed.textDelta || parsed.text || '';
        continue;
      }

      // If it's just text content
      if (typeof parsed.text === 'string') {
        text += parsed.text;
        continue;
      }
    } catch {
      // Not JSON, treat as plain text
      text += dataLine;
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
