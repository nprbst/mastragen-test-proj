# Mastragen Test Project

A lightweight test project for Mastra features with Phoenix observability.

## Quality Scripts

Run these scripts to ensure code quality before pushing:

```bash
bun run check      # Biome check + TypeScript type checking
bun run lint       # Biome linting only
bun run test       # Run bun tests
bun run preflight  # Full check + test (run before merging)
```

The `preflight:quick` script runs automatically on `git push` via the pre-push hook.

## Development

```bash
bun run dev        # Start Mastra dev server
bun run dev:ui     # Start UI dev server (Astro)
```

## Project Structure

- `src/mastra/` - Mastra agents, tools, workflows, and scorers
- `packages/ui/` - Astro frontend with React components
- `tests/` - Bun test files
- `scripts/` - Utility scripts (prompts seeding, git hooks)

## Testing

Tests use Bun's built-in test runner. Place test files in `tests/` with `.test.ts` suffix:

```bash
bun run test           # Run all tests
bun run test:watch     # Watch mode
```

## Phoenix Observability

```bash
bun run phoenix:up     # Start Phoenix container
bun run phoenix:seed   # Seed prompts to Phoenix
bun run phoenix:down   # Stop Phoenix container
```

Access Phoenix UI at http://localhost:6006
