import { createAnswerRelevancyScorer } from '@mastra/evals/scorers/prebuilt';
import { anthropic } from '@ai-sdk/anthropic';
import { weatherAccuracyScorer } from './weather-accuracy-scorer';

// Built-in LLM-based scorer using Anthropic
export const answerRelevancyScorer = createAnswerRelevancyScorer({
  model: anthropic('claude-sonnet-4-20250514'),
});

export { weatherAccuracyScorer };
