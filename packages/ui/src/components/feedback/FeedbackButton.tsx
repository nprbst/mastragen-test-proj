import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Loader2, Check } from 'lucide-react';

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
  spanId: string;
  onFeedbackSubmitted?: () => void;
}

interface FeedbackPayload {
  spanId: string;
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

export function FeedbackButton({ spanId, onFeedbackSubmitted }: FeedbackButtonProps) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFeedback = async (isPositive: boolean) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        spanId,
        label: isPositive ? 'thumbs_up' : 'thumbs_down',
        score: isPositive ? 1 : 0,
        explanation: comment || undefined,
      });
      setSubmitted(isPositive ? 'up' : 'down');
      setShowComment(false);
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
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback(true)}
          disabled={isSubmitting}
          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          title="Helpful"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          ) : (
            <ThumbsUp className="w-4 h-4 text-text-muted hover:text-accent-success" />
          )}
        </button>
        <button
          onClick={() => handleFeedback(false)}
          disabled={isSubmitting}
          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          title="Not helpful"
        >
          <ThumbsDown className="w-4 h-4 text-text-muted hover:text-accent-error" />
        </button>
        <button
          onClick={() => setShowComment(!showComment)}
          disabled={isSubmitting}
          className="p-1.5 rounded hover:bg-bg-tertiary transition-colors disabled:opacity-50"
          title="Add comment"
        >
          <MessageSquare className="w-4 h-4 text-text-muted hover:text-accent-primary" />
        </button>
      </div>

      {showComment && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add feedback comment..."
            className="flex-1 px-3 py-1.5 text-sm bg-bg-tertiary rounded border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      )}

      {error && <p className="text-xs text-accent-error">{error}</p>}
    </div>
  );
}
