import { Agent } from '@mastra/core/agent';
import { answerRelevancyScorer, weatherAccuracyScorer } from '../scorers';
import { weatherTool } from '../tools/weather-tool';

export const weatherAgent = new Agent({
  id: 'weather-agent',
  name: 'Weather Agent',
  instructions: `You are a helpful weather assistant that provides accurate weather information.
Your primary function is to help users get weather details for specific locations. When responding:
- Always ask for a location if none is provided
- If the location name isn't in English, please translate it
- If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
- Include relevant details like humidity, wind conditions, and precipitation
- Keep responses concise but informative
Use the weatherTool to fetch current weather data.`,
  model: {
    id: 'anthropic/claude-sonnet-4-20250514',
  },
  tools: { weatherTool },
  scorers: {
    weatherAccuracy: {
      scorer: weatherAccuracyScorer,
      sampling: { type: 'ratio', rate: 1 }, // Score 100% of responses
    },
    answerRelevancy: {
      scorer: answerRelevancyScorer,
      sampling: { type: 'ratio', rate: 0.5 }, // Score 50% (LLM cost control)
    },
  },
});
