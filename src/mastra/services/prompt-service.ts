import { PROMPTS, type PromptName } from '../prompts';

export interface PromptResult {
  template: string;
  version: string;
  source: 'cache' | 'phoenix' | 'embedded';
}

interface CacheEntry {
  result: PromptResult;
  expiresAt: number;
}

interface PhoenixPromptTemplate {
  type: 'chat' | 'string';
  template?: string;
  messages?: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string }>;
  }>;
}

interface PhoenixPrompt {
  id: string;
  template: PhoenixPromptTemplate;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const promptCache = new Map<string, CacheEntry>();

function isPhoenixEnabled(): boolean {
  return process.env.PHOENIX_PROMPTS_ENABLED === 'true';
}

function getPhoenixTag(): string {
  return process.env.PHOENIX_PROMPTS_TAG || 'production';
}

/**
 * Get the embedded prompt by name.
 * Prompts are bundled as TypeScript constants.
 */
function getEmbeddedPrompt(name: PromptName): string {
  const prompt = PROMPTS[name];
  if (!prompt) {
    throw new Error(`Unknown prompt: ${name}`);
  }
  return prompt;
}

/**
 * Extract template text from a Phoenix prompt.
 * Handles both chat (messages array) and string template formats.
 */
function extractTemplateFromPrompt(prompt: PhoenixPrompt | null): string | null {
  if (!prompt?.template) {
    return null;
  }

  const template = prompt.template;

  // Handle string template format
  if (template.type === 'string' && template.template) {
    return template.template;
  }

  // Handle chat template format (messages array)
  if (template.type === 'chat' && template.messages) {
    const systemMessage = template.messages.find((m) => m.role === 'system');

    if (systemMessage?.content) {
      // Handle both string content and structured content
      if (typeof systemMessage.content === 'string') {
        return systemMessage.content;
      }
      if (Array.isArray(systemMessage.content)) {
        // Extract text from content blocks
        return systemMessage.content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text' && !!c.text)
          .map((c) => c.text)
          .join('\n');
      }
    }

    // Fallback: use the first message's content
    const firstMessage = template.messages[0];
    if (firstMessage?.content) {
      if (typeof firstMessage.content === 'string') {
        return firstMessage.content;
      }
      return JSON.stringify(firstMessage.content);
    }
  }

  return null;
}

/**
 * Dynamically import the Phoenix client prompts module.
 * Uses dynamic import to work around bundler path resolution issues.
 */
async function getPhoenixPromptsModule(): Promise<{
  getPrompt: (params: { prompt: { name: string; tag?: string } }) => Promise<PhoenixPrompt | null>;
} | null> {
  try {
    // Dynamic import bypasses bundler's static analysis
    const module = await import('@arizeai/phoenix-client/prompts');
    return module;
  } catch {
    return null;
  }
}

/**
 * Fetch a prompt from Phoenix by name and tag.
 * Returns null if Phoenix is unavailable or the prompt doesn't exist.
 */
async function fetchPhoenixPrompt(name: string, tag: string): Promise<PromptResult | null> {
  try {
    const phoenixModule = await getPhoenixPromptsModule();
    if (!phoenixModule) {
      return null;
    }

    const prompt = await phoenixModule.getPrompt({ prompt: { name, tag } });

    if (!prompt) {
      return null;
    }

    const template = extractTemplateFromPrompt(prompt);
    if (!template) {
      return null;
    }

    return {
      template: template.trim(),
      version: prompt.id || 'unknown',
      source: 'phoenix',
    };
  } catch (error) {
    // Phoenix unavailable or error - return null to trigger fallback
    console.warn(`Failed to fetch prompt "${name}" from Phoenix:`, error);
    return null;
  }
}

/**
 * Get a prompt by name using the fallback chain:
 * 1. Memory cache (if not expired)
 * 2. Phoenix (if enabled and available)
 * 3. Embedded prompts (bundled into application)
 */
export async function getPromptByName(name: PromptName): Promise<PromptResult> {
  const cacheKey = name;

  // Check cache first
  const cached = promptCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.result, source: 'cache' };
  }

  // Try Phoenix if enabled
  if (isPhoenixEnabled()) {
    const tag = getPhoenixTag();
    const phoenixResult = await fetchPhoenixPrompt(name, tag);
    if (phoenixResult) {
      // Cache the result
      promptCache.set(cacheKey, {
        result: phoenixResult,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return phoenixResult;
    }
  }

  // Fallback to embedded prompts
  const embeddedTemplate = getEmbeddedPrompt(name);
  const embeddedResult: PromptResult = {
    template: embeddedTemplate,
    version: 'local',
    source: 'embedded',
  };

  // Cache the embedded result too
  promptCache.set(cacheKey, {
    result: embeddedResult,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return embeddedResult;
}

/**
 * Clear the prompt cache. Useful for testing or forcing a refresh.
 */
export function clearPromptCache(): void {
  promptCache.clear();
}
