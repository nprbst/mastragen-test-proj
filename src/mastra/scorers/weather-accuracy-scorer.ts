import type { MastraDBMessage } from '@mastra/core/agent';
import { createScorer } from '@mastra/core/evals';

/**
 * Extract text content from a MastraDBMessage.
 * Matches the logic used in MessageList.mastraDBMessageToAIV4UIMessage
 */
function getTextContent(message: MastraDBMessage): string {
  if (typeof message.content.content === 'string' && message.content.content !== '') {
    return message.content.content;
  }
  if (message.content.parts && Array.isArray(message.content.parts)) {
    const textParts = message.content.parts.filter((p) => p.type === 'text');
    return textParts.length > 0
      ? (textParts[textParts.length - 1] as { text: string }).text || ''
      : '';
  }
  return '';
}

export const weatherAccuracyScorer = createScorer({
  id: 'weather-accuracy',
  description: 'Evaluates if weather response includes required data points',
  type: 'agent',
})
  .analyze(({ run }) => {
    // run.output is MastraDBMessage[] for agent scorers
    const messages = run.output as MastraDBMessage[];
    const assistantMessages = messages?.filter((m) => m.role === 'assistant') || [];
    const output = assistantMessages.map(getTextContent).join(' ').toLowerCase();
    const hasTemperature = /\d+\s*°|temperature|degrees|\d+\s*celsius|\d+\s*fahrenheit/.test(
      output
    );
    const hasConditions = /sunny|cloudy|rain|snow|clear|overcast|humid|wind|fog|storm/.test(output);
    const hasLocation = output.length > 0; // Simplified - assume location mentioned if there's output

    return {
      hasTemperature,
      hasConditions,
      hasLocation,
      dataPointsFound: [hasTemperature, hasConditions, hasLocation].filter(Boolean).length,
    };
  })
  .generateScore(({ results }) => {
    return results.analyzeStepResult.dataPointsFound / 3;
  })
  .generateReason(({ results, score }) => {
    const { hasTemperature, hasConditions, hasLocation } = results.analyzeStepResult;
    const missing: string[] = [];
    if (!hasTemperature) missing.push('temperature');
    if (!hasConditions) missing.push('weather conditions');
    if (!hasLocation) missing.push('location');

    if (missing.length === 0) {
      return 'Response includes all required weather data points.';
    }
    return `Response missing: ${missing.join(', ')}. Score: ${score.toFixed(2)}`;
  });
