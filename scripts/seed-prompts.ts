/**
 * Seed prompts to Phoenix from embedded prompt constants.
 *
 * This script reads prompts from src/mastra/prompts/index.ts and creates
 * or updates them in Phoenix. Each run creates a new version if the content
 * has changed.
 *
 * Usage:
 *   bun run scripts/seed-prompts.ts
 *
 * Environment variables:
 *   PHOENIX_HOST - Phoenix server URL (default: http://localhost:6006)
 *   PHOENIX_API_KEY - Optional API key for Phoenix authentication
 *   PHOENIX_PROMPTS_TAG - Tag to apply to new versions (default: production)
 */

import { createPrompt, getPrompt, promptVersion } from '@arizeai/phoenix-client/prompts';
import { PROMPTS, type PromptName } from '../src/mastra/prompts';

const TAG = process.env.PHOENIX_PROMPTS_TAG || 'production';

interface PromptEntry {
  name: string;
  content: string;
}

function loadPrompts(): PromptEntry[] {
  return Object.entries(PROMPTS).map(([name, content]) => ({
    name,
    content,
  }));
}

async function seedPrompt(prompt: PromptEntry): Promise<void> {
  console.log(`\nProcessing prompt: ${prompt.name}`);

  // Check if prompt already exists
  let existingPrompt: Awaited<ReturnType<typeof getPrompt>> | null;
  try {
    existingPrompt = await getPrompt({ prompt: { name: prompt.name } });
  } catch {
    // Prompt doesn't exist yet
    existingPrompt = null;
  }

  // Extract template text from existing prompt for comparison
  let existingTemplate = '';
  if (existingPrompt?.template) {
    const template = existingPrompt.template;

    // Handle string template format
    if (template.type === 'string') {
      existingTemplate = template.template;
    }
    // Handle chat template format (messages array)
    else if (template.type === 'chat' && template.messages) {
      const systemMsg = template.messages.find((m) => m.role === 'system');
      if (systemMsg?.content) {
        if (typeof systemMsg.content === 'string') {
          existingTemplate = systemMsg.content;
        } else if (Array.isArray(systemMsg.content)) {
          existingTemplate = systemMsg.content
            .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
            .map((c) => c.text)
            .join('\n');
        }
      }
    }
  }

  // Check if content has changed
  if (existingTemplate.trim() === prompt.content) {
    console.log('  ✓ No changes detected, skipping');
    return;
  }

  // Create new version
  const newVersion = await createPrompt({
    name: prompt.name,
    version: promptVersion({
      description: existingPrompt
        ? `Updated from local file (tag: ${TAG})`
        : `Initial version from local file (tag: ${TAG})`,
      modelProvider: 'ANTHROPIC',
      modelName: 'claude-sonnet-4-20250514',
      template: [
        {
          role: 'system',
          content: prompt.content,
        },
      ],
      templateFormat: 'MUSTACHE',
    }),
  });

  console.log(`  ✓ Created version: ${newVersion.id}`);

  // Note: Tagging would require additional API call if supported
  // For now, we include the tag in the description
}

async function main() {
  console.log('Phoenix Prompt Seeder');
  console.log('=====================');
  console.log(`Tag: ${TAG}`);

  const prompts = loadPrompts();
  console.log(`\nFound ${prompts.length} prompt(s)`);

  for (const prompt of prompts) {
    try {
      await seedPrompt(prompt);
    } catch (error) {
      console.error(`  ✗ Failed to seed "${prompt.name}":`, error);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
