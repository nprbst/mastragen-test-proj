import React, { useMemo, type ReactNode } from 'react';
import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react';
import { createMastraAdapter } from '../../lib/mastra-runtime-adapter';

interface MastraRuntimeProviderProps {
  agentId: string;
  children: ReactNode;
}

export function MastraRuntimeProvider({ agentId, children }: MastraRuntimeProviderProps) {
  const adapter = useMemo(() => createMastraAdapter({ agentId }), [agentId]);
  const runtime = useLocalRuntime(adapter);

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
