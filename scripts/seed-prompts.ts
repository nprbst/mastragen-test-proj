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

import { createPrompt, promptVersion } from '@arizeai/phoenix-client/prompts';
import { PROMPTS } from '../src/mastra/prompts';

const TAG = process.env.PHOENIX_PROMPTS_TAG || 'dev';
const PHOENIX_HOST = process.env.PHOENIX_HOST || 'http://localhost:6006';

interface PromptEntry {
  name: string;
  content: string;
}

interface PhoenixPrompt {
  template?: {
    type: string;
    template?: string;
    messages?: Array<{
      role: string;
      content: string | Array<{ type: string; text?: string }>;
    }>;
  };
}

function loadPrompts(): PromptEntry[] {
  return Object.entries(PROMPTS).map(([name, content]) => ({
    name,
    content,
  }));
}

function extractErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    // Extract status code and URL from Phoenix client errors
    const match = message.match(/(\S+): (\d+) (.+)/);
    if (match) {
      const [, url, status, statusText] = match;
      return `${status} ${statusText} (${url})`;
    }
    return message;
  }
  return String(error);
}

async function checkPromptExists(name: string): Promise<PhoenixPrompt | null> {
  try {
    const response = await fetch(`${PHOENIX_HOST}/v1/prompts/${name}/latest`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${response.status} ${response.statusText}: ${body}`);
    }
    const data = (await response.json()) as { data: PhoenixPrompt };
    return data.data;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Cannot connect to Phoenix at ${PHOENIX_HOST}`);
    }
    throw error;
  }
}

function extractTemplateText(prompt: PhoenixPrompt | null): string {
  if (!prompt?.template) return '';

  const template = prompt.template;

  // Handle string template format
  if (template.type === 'string' && template.template) {
    return template.template;
  }

  // Handle chat template format (messages array)
  if (template.type === 'chat' && template.messages) {
    const systemMsg = template.messages.find((m) => m.role === 'system');
    if (systemMsg?.content) {
      if (typeof systemMsg.content === 'string') {
        return systemMsg.content;
      }
      if (Array.isArray(systemMsg.content)) {
        return systemMsg.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text' && 'text' in c)
          .map((c) => c.text)
          .join('\n');
      }
    }
  }

  return '';
}

async function seedPrompt(prompt: PromptEntry): Promise<void> {
  console.log(`\nProcessing prompt: ${prompt.name}`);

  // Check if prompt already exists using direct fetch (avoids noisy error logging)
  const existingPrompt = await checkPromptExists(prompt.name);

  // Extract template text from existing prompt for comparison
  const existingTemplate = extractTemplateText(existingPrompt);

  // Check if content has changed
  if (existingTemplate.trim() === prompt.content) {
    console.log('  ✓ No changes detected, skipping');
    return;
  }

  // Create new version
  try {
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
            content: [{ type: 'text', text: prompt.content }],
          },
        ],
        templateFormat: 'MUSTACHE',
        invocationParameters: { max_tokens: 4096 },
      }),
    });

    console.log(`  ✓ Created version: ${newVersion.id}`);
  } catch (error) {
    const details = extractErrorDetails(error);
    throw new Error(`Failed to create prompt: ${details}`);
  }
}

async function main() {
  console.log('Phoenix Prompt Seeder');
  console.log('=====================');
  console.log(`Host: ${PHOENIX_HOST}`);
  console.log(`Tag: ${TAG}`);

  const prompts = loadPrompts();
  console.log(`\nFound ${prompts.length} prompt(s)`);

  let failed = 0;
  for (const prompt of prompts) {
    try {
      await seedPrompt(prompt);
    } catch (error) {
      failed++;
      const details = extractErrorDetails(error);
      console.error(`  ✗ ${details}`);
    }
  }

  console.log(`\nDone! ${prompts.length - failed}/${prompts.length} succeeded`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', extractErrorDetails(error));
  process.exit(1);
});
