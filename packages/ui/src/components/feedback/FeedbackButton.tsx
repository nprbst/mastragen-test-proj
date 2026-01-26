import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, Check } from 'lucide-react';

function getMastraApiUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_MASTRA_API_URL) {
    return import.meta.env.PUBLIC_MASTRA_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4111`;
  }
  return 'http://localhost:4111';
}

interface FeedbackButtonProps {
  traceId: string;
  onFeedbackSubmitted?: () => void;
}

interface FeedbackPayload {
  traceId: string;
  label: 'thumbs_up' | 'thumbs_down';
  score: number;
  explanation?: string;
}

async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  const apiUrl = getMastraApiUrl();
  const response = await fetch(`${apiUrl}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to submit feedback');
  }
}

export function FeedbackButton({ traceId, onFeedbackSubmitted }: FeedbackButtonProps) {
  const [selectedRating, setSelectedRating] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedRating) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        traceId,
        label: selectedRating === 'up' ? 'thumbs_up' : 'thumbs_down',
        score: selectedRating === 'up' ? 1 : 0,
        explanation: comment || undefined,
      });
      setSubmitted(true);
      onFeedbackSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        <Check className="w-4 h-4 text-accent-success" />
        <span>Feedback recorded</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Rate this response:</span>
        <button
          onClick={() => setSelectedRating('up')}
          disabled={isSubmitting}
          className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
            selectedRating === 'up'
              ? 'bg-accent-success/20 text-accent-success'
              : 'hover:bg-bg-tertiary text-text-muted hover:text-accent-success'
          }`}
          title="Helpful"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => setSelectedRating('down')}
          disabled={isSubmitting}
          className={`p-1.5 rounded transition-colors disabled:opacity-50 ${
            selectedRating === 'down'
              ? 'bg-accent-error/20 text-accent-error'
              : 'hover:bg-bg-tertiary text-text-muted hover:text-accent-error'
          }`}
          title="Not helpful"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>

      {selectedRating && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Add comment (optional)..."
            className="flex-1 px-3 py-1.5 text-sm bg-bg-tertiary rounded border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-3 py-1.5 text-sm bg-accent-primary text-white rounded hover:bg-accent-primary/80 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-accent-error">{error}</p>}
    </div>
  );
}
