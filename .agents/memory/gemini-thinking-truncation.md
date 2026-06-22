---
name: Gemini 2.5 Flash thinking-budget truncation
description: Why AI analysis answers got cut off mid-sentence and how to keep them complete
---

# Gemini 2.5 Flash truncated answers

gemini-2.5-flash is a "thinking" model: its internal reasoning tokens are deducted
from the same `maxOutputTokens` budget. When reasoning is heavy, the visible answer
runs out of budget and is cut off mid-sentence (finishReason MAX_TOKENS). This is the
root cause of "AI analysis doesn't show the complete answer".

**Rule:** for answer-completeness-critical calls, set
`config: { thinkingConfig: { thinkingBudget: 0 } }` (disable thinking) and raise
`maxOutputTokens`. Also concatenate ALL text parts of the response
(`candidate.content.parts`), not just the first — there can be several.

**Why:** thinking tokens silently eat the output budget; reading only the first part
can also drop content.

**How to apply:** any `genAI.models.generateContent` for long-form output (tables,
lists, reports), e.g. the `/api/admin/analyze` endpoint.

## Testing notes (Replit AI Integrations)
- The Gemini key (`AI_INTEGRATIONS_GEMINI_API_KEY`) is injected only into the running
  server process and routes through Replit's proxy. A standalone node script using the
  public Gemini endpoint will get `API_KEY_INVALID` — test via the live server instead.
- Rapid repeated test calls return HTTP 429 `RATELIMIT_EXCEEDED`; it resets within ~a
  minute and is not a code bug.
