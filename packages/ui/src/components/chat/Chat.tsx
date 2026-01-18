import React from 'react';
import { MastraRuntimeProvider } from './MastraRuntimeProvider';
import { Thread } from './Thread';
import { ToolUIRegistry } from './tools';

interface ChatProps {
  agentId: string;
  agentName?: string;
}

export default function Chat({ agentId, agentName = 'AI Assistant' }: ChatProps) {
  return (
    <div className="h-[700px] rounded-card border border-border-color overflow-hidden shadow-glow bg-bg-primary">
      <MastraRuntimeProvider agentId={agentId}>
        <ToolUIRegistry />
        <Thread agentName={agentName} />
      </MastraRuntimeProvider>
    </div>
  );
}
