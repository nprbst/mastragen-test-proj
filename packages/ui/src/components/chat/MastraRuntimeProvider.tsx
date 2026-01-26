import React, { useMemo, useCallback, type ReactNode } from 'react';
import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react';
import { createMastraAdapter } from '../../lib/mastra-runtime-adapter';
import { TraceProvider, useTraceContext } from '../../lib/trace-context';

interface MastraRuntimeProviderProps {
  agentId: string;
  children: ReactNode;
}

export function MastraRuntimeProvider({ agentId, children }: MastraRuntimeProviderProps) {
  return (
    <TraceProvider>
      <MastraRuntimeProviderInner agentId={agentId}>{children}</MastraRuntimeProviderInner>
    </TraceProvider>
  );
}

function MastraRuntimeProviderInner({ agentId, children }: MastraRuntimeProviderProps) {
  const { setLatestTraceId } = useTraceContext();

  const onTraceId = useCallback(
    (traceId: string) => {
      setLatestTraceId(traceId);
    },
    [setLatestTraceId]
  );

  const adapter = useMemo(
    () => createMastraAdapter({ agentId, onTraceId }),
    [agentId, onTraceId]
  );

  const runtime = useLocalRuntime(adapter);

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}
