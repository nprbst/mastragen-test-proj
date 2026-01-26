import { Agent } from '@mastra/core/agent';

export const editorAgent = new Agent({
  id: 'editor-agent',
  name: 'Editor',
  instructions: `You are a meticulous editor agent that improves blog post content.
When editing content:
- Fix grammar, spelling, and punctuation errors
- Improve clarity and flow
- Enhance word choice and sentence structure
- Maintain the original voice and intent
- Return only the edited content without commentary`,
  model: {
    id: 'anthropic/claude-sonnet-4-20250514',
  },
});
