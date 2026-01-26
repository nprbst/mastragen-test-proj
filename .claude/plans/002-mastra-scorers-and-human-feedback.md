# Plan: Mastra Scorers + Phoenix Human Feedback

## Goal
Add comprehensive evaluation examples demonstrating:
- **Mastra Scorers** - both built-in and custom scorers with live evaluation
- **Phoenix Evals** - scores visible in Phoenix UI via trace export
- **Human Feedback** - thumbs up/down with comments recorded as Phoenix Annotations

## Current State
- ✅ Mastra 1.0 installed (`@mastra/core@1.0.4`, `mastra@1.0.1`)
- ✅ Phoenix observability configured via `PHOENIX_ENABLED` env var
- ✅ Weather agent, content workflow, weather workflow all working
- ✅ Astro UI with chat interface functional
- ❌ **Missing**: Scorers, evals, human feedback

## Work to Complete

### Phase 1: Add Mastra Scorers

#### 1.1 Install @mastra/evals package (for prebuilt scorers)

```bash
bun add @mastra/evals@latest
```

Note: `createScorer` is already available from `@mastra/core/evals` (included in `@mastra/core`).
The `@mastra/evals` package provides prebuilt scorers like `createAnswerRelevancyScorer`.

#### 1.2 Create custom weather scorer

**File: `src/mastra/scorers/weather-accuracy-scorer.ts`**

```typescript
import { createScorer } from '@mastra/core/evals';

export const weatherAccuracyScorer = createScorer({
  id: 'weather-accuracy',
  description: 'Evaluates if weather response includes required data points',
  type: 'agent',
})
  .analyze(({ run }) => {
    const output = run.output?.text?.toLowerCase() || '';
    const hasTemperature = /\d+\s*°|temperature|degrees/.test(output);
    const hasLocation = run.input?.some(m => m.content?.includes(output.match(/\b[A-Z][a-z]+\b/)?.[0] || ''));
    const hasConditions = /sunny|cloudy|rain|snow|clear|overcast|humid/.test(output);

    return {
      hasTemperature,
      hasLocation: true, // Simplified for demo
      hasConditions,
      dataPointsFound: [hasTemperature, true, hasConditions].filter(Boolean).length,
    };
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult.dataPointsFound / 3;
  })
  .generateReason(({ results, score }) => {
    const { hasTemperature, hasConditions } = results.analyzeStepResult;
    const missing = [];
    if (!hasTemperature) missing.push('temperature');
    if (!hasConditions) missing.push('weather conditions');

    if (missing.length === 0) return 'Response includes all required weather data points.';
    return `Response missing: ${missing.join(', ')}. Score: ${score}`;
  });
```

#### 1.3 Add built-in answer relevancy scorer

**File: `src/mastra/scorers/index.ts`**

```typescript
import { createAnswerRelevancyScorer } from '@mastra/evals/scorers/prebuilt';
import { anthropic } from '@ai-sdk/anthropic';
import { weatherAccuracyScorer } from './weather-accuracy-scorer';

// Built-in LLM-based scorer using Anthropic
export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: anthropic('claude-sonnet-4-20250514'),
});

export { weatherAccuracyScorer };
```

#### 1.4 Attach scorers to weather agent (live scoring)

**Update: `src/mastra/agents/weather-agent.ts`**

```typescript
import { Agent } from '@mastra/core/agent';
import { weatherTool } from '../tools/weather-tool';
import { weatherAccuracyScorer, answerRelevancyScorer } from '../scorers';

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: `...existing instructions...`,
  model: { id: 'anthropic/claude-sonnet-4-20250514' },
  tools: { weatherTool },
  scorers: {
    weatherAccuracy: {
      scorer: weatherAccuracyScorer,
      sampling: { type: 'ratio', rate: 1 }, // Score 100% of responses
    },
    answerRelevancy: {
      scorer: answerRelevancyScorer,
      sampling: { type: 'ratio', rate: 0.5 }, // Score 50% (LLM cost)
    },
  },
});
```

#### 1.5 Register scorers globally in Mastra (for trace scoring in Studio)

**Update: `src/mastra/index.ts`**

```typescript
import { weatherAccuracyScorer, answerRelevancyScorer } from './scorers';

export const mastra = new Mastra({
  agents: { weatherAgent, copywriterAgent, editorAgent },
  workflows: { contentWorkflow, weatherWorkflow },
  scorers: { weatherAccuracyScorer, answerRelevancyScorer }, // Global registration
  // ... rest of config
});
```

---

### Phase 2: Add Human Feedback UI with Phoenix Annotations

#### 2.1 Install Phoenix client

```bash
cd packages/ui && bun add @arizeai/phoenix-client
```

#### 2.2 Create Phoenix annotation client

**File: `packages/ui/src/lib/phoenix-client.ts`**

```typescript
function getPhoenixEndpoint(): string {
  if (import.meta.env.PUBLIC_PHOENIX_ENDPOINT) {
    return import.meta.env.PUBLIC_PHOENIX_ENDPOINT;
  }
  return 'http://localhost:6006';
}

export interface FeedbackAnnotation {
  spanId: string;
  label: 'thumbs_up' | 'thumbs_down';
  score: number; // 1 for thumbs_up, 0 for thumbs_down
  explanation?: string;
}

export async function postFeedbackAnnotation(feedback: FeedbackAnnotation): Promise<void> {
  const endpoint = getPhoenixEndpoint();
  const apiKey = import.meta.env.PUBLIC_PHOENIX_API_KEY || '';

  const response = await fetch(`${endpoint}/v1/span_annotations?sync=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey && { 'api_key': apiKey }),
    },
    body: JSON.stringify({
      data: [{
        span_id: feedback.spanId,
        name: 'user_feedback',
        annotator_kind: 'HUMAN',
        result: {
          label: feedback.label,
          score: feedback.score,
          explanation: feedback.explanation || null,
        },
        metadata: {
          timestamp: new Date().toISOString(),
        },
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to post feedback: ${response.statusText}`);
  }
}
```

#### 2.3 Create FeedbackButton component

**File: `packages/ui/src/components/feedback/FeedbackButton.tsx`**

```tsx
import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { postFeedbackAnnotation } from '../../lib/phoenix-client';

interface FeedbackButtonProps {
  spanId: string;
  onFeedbackSubmitted?: () => void;
}

export function FeedbackButton({ spanId, onFeedbackSubmitted }: FeedbackButtonProps) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (isPositive: boolean) => {
    setIsSubmitting(true);
    try {
      await postFeedbackAnnotation({
        spanId,
        label: isPositive ? 'thumbs_up' : 'thumbs_down',
        score: isPositive ? 1 : 0,
        explanation: comment || undefined,
      });
      setSubmitted(isPositive ? 'up' : 'down');
      setShowComment(false);
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-text-muted">
        {submitted === 'up' ? <ThumbsUp className="w-4 h-4 text-green-500" /> : <ThumbsDown className="w-4 h-4 text-red-500" />}
        <span>Feedback recorded</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleFeedback(true)}
          disabled={isSubmitting}
          className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
          title="Helpful"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFeedback(false)}
          disabled={isSubmitting}
          className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
          title="Not helpful"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowComment(!showComment)}
          className="p-1.5 rounded hover:bg-surface-secondary transition-colors"
          title="Add comment"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      {showComment && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add feedback comment..."
            className="flex-1 px-3 py-1.5 text-sm bg-surface-secondary rounded border border-border-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      )}
    </div>
  );
}
```

#### 2.4 Integrate feedback into chat messages

The chat component needs to capture `spanId` from agent responses and pass it to FeedbackButton.

**Update: `packages/ui/src/components/chat/Chat.tsx`**

Add FeedbackButton to assistant messages, using the spanId from the response metadata.

Note: The Mastra agent response includes `traceId` in the result. We need to extract the root span ID, which is typically the same as the trace ID's span portion, or access it via the response metadata.

#### 2.5 Add environment variables

**Update: `.env.example`**

```env
# Phoenix Human Feedback (for UI)
PUBLIC_PHOENIX_ENDPOINT=http://localhost:6006
PUBLIC_PHOENIX_API_KEY=
```

---

### Files to Create

```
src/mastra/
├── scorers/
│   ├── index.ts                    # Export all scorers
│   └── weather-accuracy-scorer.ts  # Custom code-based scorer

packages/ui/src/
├── lib/
│   └── phoenix-client.ts           # Phoenix annotation API client
└── components/
    └── feedback/
        ├── index.ts
        └── FeedbackButton.tsx      # Thumbs up/down + comment UI
```

### Files to Modify

```
src/mastra/
├── index.ts                        # Add scorers registration
└── agents/weather-agent.ts         # Attach live scorers

packages/ui/
├── package.json                    # Add @arizeai/phoenix-client
└── src/components/chat/Chat.tsx    # Add FeedbackButton to messages

.env.example                        # Add PUBLIC_PHOENIX_* vars
```

---

### Verification Checklist

**Scorers:**
- [ ] `@mastra/evals` installed
- [ ] Custom `weatherAccuracyScorer` works (code-based)
- [ ] Built-in `answerRelevancyScorer` works (LLM-based)
- [ ] Live scoring on weather agent (check logs/storage)
- [ ] Scorers visible in Mastra Studio
- [ ] Scores appear in Phoenix traces (via ArizeExporter)

**Human Feedback:**
- [ ] FeedbackButton renders on assistant messages
- [ ] Thumbs up/down submits to Phoenix `/v1/span_annotations`
- [ ] Comments included in annotation
- [ ] Annotations visible in Phoenix UI
- [ ] Error handling for offline/failed requests

