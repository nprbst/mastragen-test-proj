import { setPromptTemplate } from '@arizeai/openinference-core';
import { context } from '@opentelemetry/api';
import type { PromptResult } from './prompt-service';

/**
 * Execute a function within an OTEL context that includes prompt template metadata.
 * This allows Phoenix to correlate traces with specific prompt versions.
 *
 * The following span attributes will be added:
 * - llm.prompt_template.template - The prompt template text
 * - llm.prompt_template.version - The version ID (Phoenix version or "local")
 * - llm.prompt_template.variables - JSON-stringified variables object
 *
 * @param prompt - The prompt result from getPromptByName()
 * @param variables - Variables used in the prompt template (for tracking)
 * @param fn - The async function to execute within the prompt context
 * @returns The result of the async function
 */
export async function withPromptTrace<T>(
  prompt: PromptResult,
  variables: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const promptContext = setPromptTemplate(context.active(), {
    template: prompt.template,
    version: prompt.version,
    variables,
  });

  return context.with(promptContext, fn);
}
