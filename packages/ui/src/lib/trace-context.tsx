import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface TraceContextValue {
  latestTraceId: string | undefined;
  setLatestTraceId: (traceId: string) => void;
}

const TraceContext = createContext<TraceContextValue | null>(null);

export function TraceProvider({ children }: { children: ReactNode }) {
  const [latestTraceId, setLatestTraceIdState] = useState<string | undefined>(undefined);

  const setLatestTraceId = useCallback((traceId: string) => {
    setLatestTraceIdState(traceId);
  }, []);

  return (
    <TraceContext.Provider value={{ latestTraceId, setLatestTraceId }}>
      {children}
    </TraceContext.Provider>
  );
}

export function useTraceContext() {
  const context = useContext(TraceContext);
  if (!context) {
    throw new Error('useTraceContext must be used within a TraceProvider');
  }
  return context;
}

export function useLatestTraceId() {
  const context = useContext(TraceContext);
  return context?.latestTraceId;
}
