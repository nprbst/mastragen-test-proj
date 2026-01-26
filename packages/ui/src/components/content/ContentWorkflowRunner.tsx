import React, { useState } from 'react';
import { PenLine, Play, Loader2 } from 'lucide-react';
import { ContentDashboard } from './ContentDashboard';
import { runContentWorkflow, type ContentWorkflowResult } from '../../lib/mastra-workflow-client';

export default function ContentWorkflowRunner() {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ContentWorkflowResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const workflowResult = await runContentWorkflow(topic.trim());
      setResult(workflowResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <PenLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a blog topic..."
              className="w-full pl-10 pr-4 py-3 bg-bg-tertiary border border-border-color rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:border-accent-primary transition-colors"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-brand text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-accent-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Create Content
              </>
            )}
          </button>
        </div>
      </form>

      <ContentDashboard result={result} isLoading={isLoading} error={error} />
    </div>
  );
}
