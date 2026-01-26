# Plan: Phoenix Prompt Management Integration for Content Workflow

## Goal
Integrate Phoenix Prompt Management into the content workflow so that:
1. **Prompts are file-based** as the source of truth (works without Phoenix)
2. **Phoenix syncs from files** when enabled (for versioning/tagging/experimentation)
3. **Evaluations and annotations** are linked back to the specific prompt version used

## Architecture

### Fallback Chain (per Phoenix best practices)
```
Memory Cache (5min TTL)
    ↓ cache miss
Phoenix API (if enabled)
    ↓ unavailable or disabled
Local Files (always available)
```

### File Structure
```
src/mastra/prompts/
├── copywriter.md     # Copywriter agent system prompt
└── editor.md         # Editor agent system prompt
```

### Key Integration Points
- `@arizeai/phoenix-client/prompts` - `getPrompt()`, `createPrompt()`, `promptVersion()`
- `@arizeai/openinference-core` - `setPromptTemplate()` for span attribute injection
- Mastra's `tracingContext` in workflow steps - provides access to current span

## Implementation

### Phase 1: Dependencies

**Install packages:**
```bash
bun add @arizeai/phoenix-client @arizeai/openinference-core
```

**Add to `.env.example`:**
```
# Phoenix Prompt Management (optional - falls back to local files)
PHOENIX_PROMPTS_ENABLED=false
PHOENIX_PROMPTS_TAG=production
```

### Phase 2: Local Prompt Files

**Create `src/mastra/prompts/copywriter.md`:**
```markdown
You are a skilled copywriter agent that writes engaging blog post content.
When given a topic:
- Write clear, compelling, and well-structured content
- Use an engaging tone that captures reader attention
- Include relevant examples and insights
- Structure with clear headings and paragraphs
- Aim for approximately 300-500 words
```

**Create `src/mastra/prompts/editor.md`:**
```markdown
You are an expert editor that reviews and improves blog post content.
When editing content:
- Fix grammar, spelling, and punctuation errors
- Improve clarity and flow
- Ensure consistent tone and style
- Tighten prose by removing unnecessary words
- Preserve the author's voice while enhancing readability
```

### Phase 3: Prompt Service

**Create `src/mastra/services/prompt-service.ts`:**

```typescript
interface PromptResult {
  template: string;
  version: string;        // "local" or Phoenix version ID
  source: 'cache' | 'phoenix' | 'file';
}

// Core functions:
// - getPrompt(name: string): Promise<PromptResult>
// - loadLocalPrompt(name: string): string
// - fetchPhoenixPrompt(name: string, tag: string): Promise<PromptResult | null>
// - Memory cache with 5-minute TTL
```

Key behaviors:
- Reads from `src/mastra/prompts/{name}.md` as fallback
- When `PHOENIX_PROMPTS_ENABLED=true`, tries Phoenix first
- Caches results for 5 minutes to reduce latency
- Returns `version: "local"` when using file fallback

### Phase 4: Prompt Tracing Helper

**Create `src/mastra/services/prompt-tracing.ts`:**

```typescript
// Wraps execution to inject prompt metadata into OTEL spans
async function withPromptTrace<T>(
  tracingContext: TracingContext,
  prompt: PromptResult,
  variables: Record<string, string>,
  fn: () => Promise<T>
): Promise<T>
```

Uses `setPromptTemplate()` from `@arizeai/openinference-core` to add:
- `llm.prompt_template.template` - The prompt text
- `llm.prompt_template.version` - Version ID (links to Phoenix)
- `llm.prompt_template.variables` - Template variables used

### Phase 5: Update Content Workflow

**Modify `src/mastra/workflows/content-workflow.ts`:**

```typescript
const copywriterStep = createStep({
  // ...
  execute: async ({ inputData, tracingContext }) => {
    const prompt = await getPrompt('copywriter');

    return withPromptTrace(tracingContext, prompt, { topic: inputData.topic }, async () => {
      const result = await copywriterAgent.generate(
        `Create a blog post about ${inputData.topic}`,
        { instructions: prompt.template }
      );
      return { copy: result.text };
    });
  },
});
```

### Phase 6: Prompt Seeding Script

**Create `scripts/seed-prompts.ts`:**

- Reads local prompt files
- Creates/updates prompts in Phoenix using `createPrompt()`
- Tags with "production" (configurable)

**Add script to `package.json`:**
```json
"prompts:seed": "bun run scripts/seed-prompts.ts"
```

## Files to Create/Modify

**New Files:**
- `src/mastra/prompts/copywriter.md` - Copywriter system prompt
- `src/mastra/prompts/editor.md` - Editor system prompt
- `src/mastra/services/prompt-service.ts` - Prompt fetching with fallbacks
- `src/mastra/services/prompt-tracing.ts` - OTEL context integration
- `scripts/seed-prompts.ts` - Sync local prompts to Phoenix

**Modified Files:**
- `src/mastra/workflows/content-workflow.ts` - Use prompt service + tracing
- `package.json` - Add dependencies and seed script
- `.env.example` - Add prompt config vars

## Verification

### Without Phoenix (file-based only)
1. Ensure `PHOENIX_PROMPTS_ENABLED=false` (or unset)
2. Run workflow via UI
3. Verify workflow executes using local prompt files
4. Check traces show `llm.prompt_template.version: "local"`

### With Phoenix
1. Start Phoenix: `docker run -p 6006:6006 arizephoenix/phoenix`
2. Seed prompts: `bun run prompts:seed`
3. Enable: Set `PHOENIX_PROMPTS_ENABLED=true` in `.env`
4. Run workflow via UI
5. Check Phoenix UI:
   - Traces show `llm.prompt_template.version` with Phoenix version ID
   - Clicking trace links to the prompt version used
   - Feedback/annotations are associated with prompt version

## Notes

- **Source of truth**: Local markdown files are always the source of truth
- **Phoenix is optional**: System works fully without Phoenix configured
- **Caching**: 5-minute TTL reduces Phoenix API calls
- **Tag-based deployment**: Change `PHOENIX_PROMPTS_TAG` to test different versions
- **Seeding is idempotent**: Running seed script creates new versions, doesn't duplicate
