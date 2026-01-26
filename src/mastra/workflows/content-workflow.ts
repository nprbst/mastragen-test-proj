import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { copywriterAgent } from '../agents/copywriter-agent';
import { editorAgent } from '../agents/editor-agent';
import { getPromptByName } from '../services/prompt-service';
import { withPromptTrace } from '../services/prompt-tracing';

const copywriterStep = createStep({
  id: 'copywriter-step',
  description: 'Generate initial blog post content',
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    copy: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData?.topic) {
      throw new Error('Topic not found in input data');
    }

    const prompt = await getPromptByName('copywriter');

    const result = await withPromptTrace(prompt, { topic: inputData.topic }, async () => {
      return copywriterAgent.generate(`Create a blog post about ${inputData.topic}`, {
        instructions: prompt.template,
      });
    });

    return {
      copy: result.text,
    };
  },
});

const editorStep = createStep({
  id: 'editor-step',
  description: 'Edit and improve the blog post content',
  inputSchema: z.object({
    copy: z.string(),
  }),
  outputSchema: z.object({
    finalCopy: z.string(),
  }),
  execute: async ({ inputData }) => {
    const copy = inputData?.copy;
    if (!copy) {
      throw new Error('Copy not found in input data');
    }

    const prompt = await getPromptByName('editor');

    const result = await withPromptTrace(prompt, {}, async () => {
      return editorAgent.generate(
        `Edit the following blog post, returning only the edited copy:\n\n${copy}`,
        {
          instructions: prompt.template,
        }
      );
    });

    return {
      finalCopy: result.text,
    };
  },
});

export const contentWorkflow = createWorkflow({
  id: 'content-workflow',
  inputSchema: z.object({
    topic: z.string(),
  }),
  outputSchema: z.object({
    finalCopy: z.string(),
  }),
})
  .then(copywriterStep)
  .then(editorStep)
  .commit();
