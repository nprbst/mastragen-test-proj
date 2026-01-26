import { Agent } from '@mastra/core/agent';

export const copywriterAgent = new Agent({
  id: 'copywriter-agent',
  name: 'Copywriter',
  instructions: `You are a skilled copywriter agent that writes engaging blog post content.
When given a topic:
- Write clear, compelling, and well-structured content
- Use an engaging tone that captures reader attention
- Include relevant examples and insights
- Structure with clear headings and paragraphs
- Aim for approximately 300-500 words`,
  model: {
    id: 'anthropic/claude-sonnet-4-20250514',
  },
});
