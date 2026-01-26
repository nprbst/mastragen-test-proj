# Test Plan: Phoenix Full Cycle (Prompt → Trace → Annotation)

## Overview

This test plan validates the complete Phoenix integration cycle:
1. **Managed Prompt** - Fetched from Phoenix (or fallback to local)
2. **Trace** - Execution traced with prompt metadata to Phoenix
3. **Annotation** - User feedback linked to the trace

## Prerequisites

### Environment Setup
```bash
# Start Phoenix
bun run phoenix:up

# Verify Phoenix is running
curl http://localhost:6006/health

# Seed prompts to Phoenix
bun run phoenix:seed
```

### Environment Variables (`.env`)
```
PHOENIX_ENABLED=true
PHOENIX_ENDPOINT=http://localhost:6006/v1/traces
PHOENIX_PROJECT_NAME=mastragen-test-proj
PHOENIX_PROMPTS_ENABLED=true
PHOENIX_PROMPTS_TAG=dev
```

---

## Test Scenarios

### Test 1: Content Workflow with Phoenix Prompts

**Goal:** Verify prompts are fetched from Phoenix and traced correctly.

**Steps:**
1. Start dev server:
   ```bash
   bun run dev     # Mastra server + Studio (port 4111)
   ```

2. Open the UIs:
   - **Mastra Studio**: http://localhost:4111 (workflows, agents, sandbox)
   - **Phoenix**: http://localhost:6006 (traces, prompts, annotations)

3. Navigate to **Prompts** in Phoenix sidebar
   - Verify `copywriter` and `editor` prompts exist
   - Note the current version ID for each

4. Trigger the content workflow via **Mastra Studio**:
   - Open Mastra Studio: http://localhost:4111
   - Navigate to **Workflows** → `content-workflow`
   - Click **Run** in the sandbox
   - Enter input: `{"topic": "The benefits of test-driven development"}`
   - Execute and wait for completion

5. Return to Phoenix UI → **Traces**

**Expected Results in Phoenix:**

| Check | Where to Look | Expected Value |
|-------|---------------|----------------|
| Trace exists | Traces list | New trace for `content-workflow` |
| Project correct | Trace header | `mastragen-test-proj` |
| Prompt metadata | Span attributes | `llm.prompt_template.version` = Phoenix version ID (not "local") |
| Prompt template | Span attributes | `llm.prompt_template.template` = Full prompt text |
| Variables | Span attributes | `llm.prompt_template.variables` = `{"topic": "..."}` |

---

### Test 2: Prompt Fallback (Phoenix Disabled)

**Goal:** Verify system works when Phoenix prompts are disabled.

**Steps:**
1. Set `PHOENIX_PROMPTS_ENABLED=false` in `.env`
2. Restart Mastra dev server
3. Trigger content workflow via Mastra Studio (same as Test 1)
4. Check Phoenix traces

**Expected Results:**

| Check | Expected Value |
|-------|----------------|
| Workflow completes | Success |
| `llm.prompt_template.version` | `"local"` |
| `llm.prompt_template.template` | Embedded prompt from TypeScript constants |

---

### Test 3: Human Feedback Annotation

**Goal:** Verify feedback is submitted and linked to trace in Phoenix.

**Steps:**
1. Open **Mastra Studio**: http://localhost:4111
2. Navigate to **Agents** → `weather-agent`
3. In the sandbox, send a message:
   ```
   What's the weather in New York?
   ```
4. Wait for the assistant response to complete
5. Click the **thumbs up** or **thumbs down** button on the response
6. Optionally add a comment
7. Submit feedback

8. Go to Phoenix UI → **Traces** → Click on the trace
9. Look for **Annotations** section on the trace detail

**Expected Results in Phoenix:**

| Check | Where to Look | Expected Value |
|-------|---------------|----------------|
| Annotation exists | Trace → Annotations tab | New annotation visible |
| Annotation name | Annotation detail | `user_feedback` |
| Annotator kind | Annotation detail | `HUMAN` |
| Label | Annotation detail | `thumbs_up` or `thumbs_down` |
| Score | Annotation detail | `1` (thumbs up) or `0` (thumbs down) |
| Explanation | Annotation detail | User's comment (if provided) |

---

### Test 4: Automated Scorer Annotations (Weather Agent)

**Goal:** Verify code-based and LLM-based scorers run and annotate traces.

**Steps:**
1. Open **Mastra Studio**: http://localhost:4111
2. Navigate to **Agents** → `weather-agent`
3. Send a weather query in the sandbox:
   ```
   What's the weather in San Francisco?
   ```
4. Check Phoenix traces

**Expected Results:**

| Scorer | Sampling | Expected Annotation |
|--------|----------|---------------------|
| `weatherAccuracyScorer` | 100% | Always present, score 0-1 based on response quality |
| `answerRelevancyScorer` | 50% | Present ~half the time, LLM-evaluated score |

**Verification in Phoenix:**
- Click trace → Annotations tab
- Look for annotations with `annotator_kind: CODE` (accuracy) or `LLM` (relevancy)

---

### Test 5: Prompt Version Linking

**Goal:** Verify you can trace from annotation back to exact prompt version.

**Steps:**
1. In Phoenix, go to **Prompts** → `copywriter`
2. Create a new version:
   - Edit the prompt text slightly
   - Save as new version
   - Tag with `dev`
3. Run content workflow again via Mastra Studio sandbox
4. Compare traces before and after prompt change

**Expected Results:**
- Old trace: `llm.prompt_template.version` = old version ID
- New trace: `llm.prompt_template.version` = new version ID
- Both versions visible in Phoenix Prompts history
- Clicking version ID in trace links to correct prompt version

---

## Phoenix UI Navigation Guide

### Finding Traces
1. **Traces** (left sidebar) → List view
2. Filter by:
   - Project: `mastragen-test-proj`
   - Time range: Last 1 hour
   - Status: All

### Viewing Trace Details
1. Click a trace row to expand
2. **Spans** tab: Hierarchical view of operations
3. **Attributes** tab: Key-value metadata including:
   - `llm.prompt_template.*` attributes
   - Input/output tokens
   - Model used
4. **Annotations** tab: Human feedback and scorer results

### Finding Prompts
1. **Prompts** (left sidebar)
2. Click prompt name to see:
   - All versions
   - Tags per version
   - Template content
   - Usage statistics (linked traces)

### Viewing Annotations
1. **Traces** → Select trace → **Annotations** tab
2. Or: **Annotations** (left sidebar) → Global view of all annotations

---

## Troubleshooting

### Traces Not Appearing
1. Verify `PHOENIX_ENABLED=true`
2. Check Phoenix is running: `curl http://localhost:6006/health`
3. Check Mastra server logs for export errors
4. Verify `PHOENIX_ENDPOINT` URL is correct (include `/v1/traces`)

### Prompts Showing "local" Version
1. Verify `PHOENIX_PROMPTS_ENABLED=true`
2. Run `bun run phoenix:seed` to ensure prompts exist
3. Check `PHOENIX_PROMPTS_TAG` matches seeded tag
4. Check Mastra server logs for Phoenix prompt fetch errors

### Feedback Not Submitting
1. Open browser DevTools → Network tab
2. Submit feedback, look for `/feedback` request
3. Check response status and body
4. Verify feedback route is registered in Mastra

### Scorers Not Running
1. Check scorer is attached to agent in `src/mastra/agents/`
2. Verify sampling rate (50% means some runs won't have it)
3. Check Mastra server logs for scorer errors

---

## Quick Verification Checklist

```
[ ] Phoenix running at localhost:6006
[ ] Prompts seeded (copywriter, editor visible)
[ ] PHOENIX_ENABLED=true
[ ] PHOENIX_PROMPTS_ENABLED=true
[ ] Content workflow produces trace with prompt metadata
[ ] llm.prompt_template.version shows Phoenix version ID (not "local")
[ ] Feedback button submits successfully
[ ] Annotation appears in Phoenix linked to trace
[ ] Scorer annotations appear for weather agent
```
