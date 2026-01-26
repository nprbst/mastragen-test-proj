import React from 'react';
import { AlertCircle, PenLine, CheckCircle } from 'lucide-react';
import type { ContentWorkflowResult } from '../../lib/mastra-workflow-client';
import { FeedbackButton } from '../feedback';

interface ContentDashboardProps {
  result: ContentWorkflowResult | null;
  isLoading: boolean;
  error: string | null;
}

export function ContentDashboard({ result, isLoading, error }: ContentDashboardProps) {
  if (error) {
    return (
      <div className="card border-accent-error/30 bg-accent-error/5">
        <div className="flex items-center gap-3 text-accent-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card animate-pulse space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-bg-tertiary" />
          <div className="h-6 w-32 bg-bg-tertiary rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-bg-tertiary rounded w-full" />
          <div className="h-4 bg-bg-tertiary rounded w-5/6" />
          <div className="h-4 bg-bg-tertiary rounded w-4/6" />
          <div className="h-4 bg-bg-tertiary rounded w-full" />
          <div className="h-4 bg-bg-tertiary rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="card text-center py-12">
        <PenLine className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <p className="text-text-secondary">
          Enter a topic and click "Create Content" to generate a blog post
        </p>
        <p className="text-text-muted text-sm mt-2">
          The workflow uses two agents: Copywriter → Editor
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-accent-success/20 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-accent-success" />
        </div>
        <div>
          <h3 className="font-semibold text-text-primary">Content Generated</h3>
          <p className="text-text-secondary text-sm">Edited by AI editor</p>
        </div>
      </div>

      <div className="prose prose-invert max-w-none">
        <div className="bg-bg-tertiary rounded-lg p-6 text-text-primary whitespace-pre-wrap leading-relaxed">
          {result.finalCopy}
        </div>
      </div>

      {result.traceId && (
        <div className="mt-4 pt-4 border-t border-border-color">
          <p className="text-text-muted text-xs mb-2">Was this content helpful?</p>
          <FeedbackButton traceId={result.traceId} />
        </div>
      )}
    </div>
  );
}
