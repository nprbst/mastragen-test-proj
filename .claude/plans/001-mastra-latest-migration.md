# Plan: Mastra Beta → Mastra Latest Migration

## Goal
Replace the existing Mastra beta setup with a fresh `bun create mastra@latest` installation while:
- Preserving `packages/ui` (Astro + React frontend)
- Enabling Phoenix observability via environment variables
- **Creating a kitchen-sink example repo for DX workflow tooling**

## Current State (After Initial Migration)
- ✅ Mastra 1.0 installed (`@mastra/core@1.0.4`, `mastra@1.0.1`)
- ✅ Phoenix observability configured via `PHOENIX_ENABLED` env var
- ✅ Monorepo workspaces restored (`packages/ui` accessible)
- ✅ `phoenix:up` / `phoenix:down` scripts added
- ❌ **Missing**: Example agents, tools, workflows (not included in v1 scaffold)

## Remaining Work: Add Kitchen-Sink Examples

### Phase 6: Copy Examples from Mastra Repo

Copy examples from `mastra-ai/mastra` GitHub repo to create a comprehensive DX tooling showcase.

**Source: `examples/basics/agents/using-a-tool/`**
→ Weather agent with tool integration
```
src/mastra/
├── tools/weather-tool.ts
└── agents/weather-agent.ts
```

**Source: `examples/basics/agents/multi-agent-workflow/`**
→ Copywriter + Editor agents in sequence
```
src/mastra/
├── agents/copywriter-agent.ts
├── agents/editor-agent.ts
└── workflows/content-workflow.ts
```

**Source: `examples/basics/agents/workflow-as-tools/`**
→ Workflows exposed as tools pattern
```
src/mastra/
└── workflows/weather-workflow.ts (with suspend/resume)
```

### Files to Create

```
src/mastra/
├── index.ts              # (exists) Add agent/workflow registrations
├── tools/
│   ├── index.ts          # Export all tools
│   └── weather-tool.ts   # Open-Meteo weather API
├── agents/
│   ├── index.ts          # Export all agents
│   ├── weather-agent.ts  # Weather assistant
│   ├── copywriter-agent.ts # Content generation
│   └── editor-agent.ts   # Content editing
└── workflows/
    ├── index.ts          # Export all workflows
    ├── weather-workflow.ts # Weather with suspend/resume
    └── content-workflow.ts # Multi-agent content pipeline
```

### Key Patterns to Showcase

1. **Tool Creation** (`createTool`)
   - Input/output schemas with Zod
   - External API integration
   - Error handling

2. **Agent Configuration** (`new Agent`)
   - Tool binding
   - System instructions
   - Model configuration (Anthropic)

3. **Workflow Composition** (`createWorkflow`, `createStep`)
   - Step chaining with `.then()`
   - Suspend/resume patterns
   - Agent-to-agent handoff

4. **Tool UI Integration** (packages/ui)
   - Weather tool result display
   - Workflow status visualization

### Phase 7: Update Astro UI to Exercise All Examples

Reference: `mastra-ai/ui-dojo` for correctly configured assistant-ui patterns.

**Add dependencies to `packages/ui/package.json`:**
```json
{
  "@mastra/react": "^0.1.0",
  "@mastra/client-js": "^1.0.0",
  "makeAssistantToolUI": "from @assistant-ui/react"
}
```

**New/Updated Pages:**

| Page | Purpose | Agent/Workflow |
|------|---------|----------------|
| `/` | Dashboard | Links to all demos |
| `/chat` | Weather chat | `weather-agent` |
| `/content` | Content workflow | `copywriter-agent` → `editor-agent` |
| `/workflow` | Workflow runner | `weather-workflow` with suspend/resume |

**New Components (following ui-dojo patterns):**

```
packages/ui/src/
├── components/
│   ├── assistant-ui/
│   │   ├── thread.tsx           # Full Thread with welcome, suggestions, composer
│   │   ├── tool-fallback.tsx    # Collapsible tool call display
│   │   └── tools/
│   │       ├── weather-tool-ui.tsx      # Weather result card
│   │       └── content-tool-ui.tsx      # Content generation display
│   ├── content/
│   │   ├── ContentWorkflowRunner.tsx    # Form + orchestrator
│   │   └── ContentDashboard.tsx         # Copywriter/Editor results
│   └── workflow/
│       └── WorkflowSuspendResume.tsx    # Human-in-the-loop UI
├── hooks/
│   ├── use-agent.ts             # Fetch agent info
│   └── use-chat.ts              # Wrapper for @mastra/react useChat
├── lib/
│   └── runtime-provider.tsx     # useExternalStoreRuntime bridge
└── pages/
    ├── index.astro              # Update dashboard
    ├── chat.astro               # Weather agent (exists)
    ├── content.astro            # NEW: Content workflow
    └── workflow.astro           # UPDATE: Add suspend/resume UI
```

**Key Integration Pattern (from ui-dojo):**
```typescript
import { useChat, toAssistantUIMessage } from "@mastra/react";
import { useExternalStoreRuntime, AssistantRuntimeProvider } from "@assistant-ui/react";

const runtime = useExternalStoreRuntime({
  isRunning,
  messages: messages.map(toAssistantUIMessage),
  convertMessage: (x) => x,
  onNew,
  onCancel,
});

<AssistantRuntimeProvider runtime={runtime}>
  <Thread />
</AssistantRuntimeProvider>
```

**Tool UI Pattern (for custom tool rendering):**
```typescript
import { makeAssistantToolUI } from "@assistant-ui/react";

export const WeatherToolUI = makeAssistantToolUI<WeatherArgs, WeatherResult>({
  toolName: "get-weather",
  render: ({ args, status, result }) => <WeatherCard ... />
});
```

---

## Previously Completed Phases

### Phase 1: Clean Up Beta Installation

**Remove these files/directories:**
- `/src/mastra/` - entire directory
- `/.mastra/` - build output directory
- `/.mastragen/` - old mastragen config
- `/index.ts` - just logs "Hello via Bun!"

**Remove from `package.json`:**
- All `@mastra/*` packages
- All `@opentelemetry/*` packages
- `mastra` CLI from devDependencies
- `zod` (will be re-added by create-mastra)

### Phase 2: Run Fresh Create

```bash
cd /Users/nathan/git/github.com/nprbst/mastragen-test-proj
bun create mastra@latest . --dir src --llm anthropic --example
```

This will:
- Scaffold fresh `/src/mastra/` structure with example weather agent, tool, workflow, and scorers
- Install latest Mastra packages
- Configure for Anthropic as default LLM

**Note:** May need to handle conflicts with existing `package.json`. If create-mastra doesn't support existing directories, we'll:
1. Create in a temp directory: `bun create mastra@latest mastra-fresh --llm anthropic --example`
2. Copy generated files to root
3. Merge package.json dependencies
4. Remove temp directory

### Phase 3: Restore Monorepo Configuration

**Update `package.json`:**
```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "mastra dev",
    "dev:ui": "npm run dev -w @mastragen-test-proj/ui",
    "build": "mastra build",
    "build:ui": "npm run build -w @mastragen-test-proj/ui",
    "start": "mastra start"
  }
}
```

### Phase 4: Add Phoenix Observability (Alongside Mastra Studio)

**Install package:**
```bash
bun add @mastra/arize@latest
```

**Update `/src/mastra/index.ts`:**
```typescript
import { Mastra } from "@mastra/core";
import { Observability, DefaultExporter } from "@mastra/observability";
import { ArizeExporter } from "@mastra/arize";

// Build exporters list - always include DefaultExporter for Mastra Studio
const exporters = [new DefaultExporter()];

// Add Phoenix/Arize exporter when enabled via environment variable
if (process.env.PHOENIX_ENABLED === 'true') {
  exporters.push(new ArizeExporter());
}

export const mastra = new Mastra({
  // ... agents, tools, workflows
  observability: new Observability({
    configs: {
      default: {
        serviceName: process.env.PHOENIX_PROJECT_NAME || 'mastragen-test-proj',
        exporters,
      },
    },
  }),
});
```

This configuration:
- **Always** enables Mastra Studio tracing via `DefaultExporter`
- **Optionally** adds Phoenix tracing via `ArizeExporter` when `PHOENIX_ENABLED=true`
- Both exporters receive the same traces when Phoenix is enabled

**Update `.env.example`:**
```env
# Model Provider
ANTHROPIC_API_KEY=your-api-key

# Phoenix Observability (optional)
PHOENIX_ENABLED=false
PHOENIX_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_API_KEY=
PHOENIX_PROJECT_NAME=mastragen-test-proj
```

### Phase 5: Verify Integration

1. Run `bun install`
2. Start Mastra: `bun run dev` → should run on port 4111
3. Start UI: `bun run dev:ui` → should run on port 4321
4. Test UI can connect to Mastra API

**Optional Phoenix testing:**
```bash
docker run --pull=always -d --name arize-phoenix -p 6006:6006 \
  -e PHOENIX_SQL_DATABASE_URL="sqlite:///:memory:" \
  arizephoenix/phoenix:latest
```
Set `PHOENIX_ENABLED=true` in `.env` and verify traces appear at `http://localhost:6006`

---

## Files to Modify/Create
- [package.json](package.json) - Remove old deps, merge new deps, restore workspaces
- [src/mastra/index.ts](src/mastra/index.ts) - Fresh scaffolded + Phoenix config
- [.env.example](.env.example) - Add Phoenix env vars
- [.env](.env) - Add Phoenix env vars (disabled by default)

## Files to Remove
- `src/mastra/` (entire directory)
- `.mastra/` (build output)
- `.mastragen/` (old config)
- `index.ts` (root file)

## Files to Preserve
- `packages/ui/` (entire directory - no changes needed)

---

## Verification Checklist

**Backend (Mastra):**
- [x] Fresh Mastra install completes without errors
- [x] Monorepo workspaces restored (`packages/ui` accessible)
- [x] `bun run dev` starts Mastra on port 4111
- [x] TypeScript compiles without errors
- [x] Phoenix observability configurable via `PHOENIX_ENABLED` env var
- [ ] Weather agent/tool copied from Mastra repo
- [ ] Multi-agent workflow copied from Mastra repo
- [ ] Workflow-as-tools pattern included
- [ ] All agents/tools/workflows registered in index.ts
- [ ] Mastra Studio shows agents in UI
- [ ] Phoenix shows traces when enabled

**Frontend (Astro UI):**
- [ ] `@mastra/react` and `@mastra/client-js` added to packages/ui
- [ ] Thread component updated with ui-dojo patterns
- [ ] useExternalStoreRuntime bridge implemented
- [ ] WeatherToolUI renders weather results
- [ ] ContentWorkflowRunner page added
- [ ] Workflow suspend/resume UI works
- [ ] `bun run dev:ui` starts Astro UI on port 4321
- [ ] All agents accessible via chat interfaces
- [ ] Tool results render with custom UIs
