import React from 'react';
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useMessage,
} from '@assistant-ui/react';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { FeedbackButton } from '../feedback';
import { useLatestTraceId } from '../../lib/trace-context';

interface ThreadProps {
  agentName?: string;
}

export function Thread({ agentName = 'AI Assistant' }: ThreadProps) {
  return (
    <ThreadPrimitive.Root className="flex flex-col h-full bg-bg-primary">
      <ThreadHeader agentName={agentName} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />
      </div>
      <ThreadComposer />
    </ThreadPrimitive.Root>
  );
}

function ThreadHeader({ agentName }: { agentName: string }) {
  return (
    <div className="p-4 border-b border-border-color bg-bg-secondary">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-card bg-gradient-brand flex items-center justify-center shadow-glow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-text-primary">{agentName}</h2>
          <p className="text-text-secondary text-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Powered by Mastra
          </p>
        </div>
      </div>
    </div>
  );
}

function ThreadComposer() {
  return (
    <ComposerPrimitive.Root className="p-4 border-t border-border-color bg-bg-secondary">
      <div className="flex gap-3">
        <ComposerPrimitive.Input
          placeholder="Ask me anything..."
          className="input-primary flex-1"
          autoFocus
        />
        <ComposerPrimitive.Send className="btn-primary px-5">
          <Send className="w-5 h-5" />
        </ComposerPrimitive.Send>
      </div>
      <p className="text-text-muted text-xs mt-2">Press Enter to send, Shift+Enter for new line</p>
    </ComposerPrimitive.Root>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end animate-fade-in-up">
      <div className="flex gap-3 max-w-[85%]">
        <div className="bg-accent-primary/20 border border-accent-primary/30 rounded-card p-4">
          <MessagePrimitive.Content
            components={{
              Text: ({ text }) => <p className="text-text-primary whitespace-pre-wrap">{text}</p>,
            }}
          />
        </div>
        <div className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-accent-primary" />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  const message = useMessage();
  const isComplete = message?.status?.type === 'complete';
  const traceId = useLatestTraceId();

  return (
    <MessagePrimitive.Root className="flex justify-start animate-fade-in-up">
      <div className="flex gap-3 max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-bg-secondary border border-border-color rounded-card p-4">
          <MessagePrimitive.Content
            components={{
              Text: ({ text }) => <p className="text-text-primary whitespace-pre-wrap">{text}</p>,
              tools: {
                Fallback: ToolFallbackUI,
              },
            }}
          />
          {isComplete && traceId && (
            <div className="mt-3 pt-3 border-t border-border-color">
              <FeedbackButton traceId={traceId} />
            </div>
          )}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

function ToolFallbackUI({
  toolName,
  args,
  result,
}: {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
}) {
  // Hide tool indicator once it has completed (result exists)
  if (result !== undefined) {
    return null;
  }

  const location = typeof args?.location === 'string' ? args.location : null;
  return (
    <div className="flex items-center gap-2 text-text-secondary text-sm py-2">
      <Loader2 className="w-4 h-4 animate-spin text-accent-primary" />
      <span>
        Using <span className="font-mono text-accent-secondary">{toolName}</span>
        {location && <span className="text-text-muted"> for {location}</span>}
      </span>
    </div>
  );
}
