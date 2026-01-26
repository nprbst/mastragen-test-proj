# Mastragen Test Project

A lightweight test project for exploring Mastra AI agent features with Phoenix observability.

## Setup

```bash
bun install
```

Copy `.env.example` to `.env` and configure your API keys:

```bash
cp .env.example .env
```

## Development

Start the Mastra dev server:

```bash
bun run dev
```

Start the UI (in a separate terminal):

```bash
bun run dev:ui
```

- Mastra Studio: http://localhost:4111
- UI: http://localhost:4321

## Phoenix Observability

Start Phoenix for tracing and evaluation:

```bash
bun run phoenix:up
```

Access Phoenix at http://localhost:6006

Seed prompts to Phoenix:

```bash
bun run phoenix:seed
```

Stop Phoenix:

```bash
bun run phoenix:down
```

## Quality Checks

```bash
bun run check      # Biome + TypeScript
bun run test       # Run tests
bun run preflight  # Full check + test
```

## Project Structure

```
src/mastra/
  agents/      # AI agents (weather, copywriter, editor)
  tools/       # Agent tools
  workflows/   # Multi-step workflows
  scorers/     # Evaluation scorers
packages/ui/   # Astro frontend
tests/         # Bun tests
```
