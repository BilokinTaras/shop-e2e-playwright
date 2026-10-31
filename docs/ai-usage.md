# How AI was used

## Who decided what

- **The repository owner (Taras Bilokin)** defined the goals and scope of the portfolio, chose Medusa as
  the system under test, approved the test strategy and the tool stack (Playwright, TypeScript, zod,
  axe-core), and decides what goes into the repository.
- **An AI coding assistant (Claude Code)** wrote most of the code and documentation inside that plan:
  API clients and schemas, fixtures, page objects, tests, scripts, ADRs and reports.
- **Everything was run.** Every number in the README and in `docs/test-strategy.md` comes from real
  runs against the local stand; every finding has a reproduction and evidence.

## What the AI assistant did, and how it was checked

| Work | How it was kept honest |
|---|---|
| Response schemas (zod) | Written from real responses of the pinned Medusa version captured from the stand, not from memory; several assumptions were wrong and corrected (e.g. admin orders omit `email` and `currency_code` unless asked) |
| Page objects | Locators taken from the running UI (`data-testid`, accessibility tree snapshots); where the product prevents role-based locators the reason is a documented finding (A11Y-001, BUG-E2E-006) |
| Flaky tests | Root causes investigated (hydration on WebKit, re-render race after option select) and fixed with explicit state waits; repeat runs recorded |
| Findings | Each one reproduced with curl or a browser script before being written down; root cause checked in the starter source where possible; tests encode the correct behaviour and are marked as expected failures |
| Exploratory sessions | Run as short, throw-away Playwright scripts during each charter — see `docs/manual/exploratory/README.md` for the limits of that approach |

## Playwright Test Agents (planner, generator, healer)

Initialised with `npx playwright init-agents --loop=claude --project=chromium`
(Playwright 1.64.1). This created:

- `.claude/agents/playwright-test-planner.md`, `-generator.md`, `-healer.md` — agent definitions;
- `.mcp.json` — the Playwright test MCP server the agents use to drive a browser;
- `tests/e2e/seed.spec.ts` — the seed the agents start from (it opens a ready storefront with the
  project's own fixtures and also runs as a normal test);
- `specs/` — where the planner saves test plans.

**Status:** the agents are set up but have **not** been used to produce any test in this repository yet.
All tests here were written as described above. The exercise below is how they are meant to be used.

### Exercise: plan and generate a test for "checkout with a promo code in USD"

1. Start the stand: `make -C ../shop-sut up`.
2. Open Claude Code in this folder; check that the `playwright-test` MCP server is connected (`/mcp`).
   On Windows, if `npx` is not found by the MCP launcher, change the command in `.mcp.json` to
   `"command": "cmd", "args": ["/c", "npx", "playwright", "run-test-mcp-server"]`.
3. Ask the **planner**: "Plan tests for applying a fixed-amount promo code at checkout in the US region."
   It explores the storefront from the seed and writes `specs/<name>.md`.
4. Review the plan: remove steps that duplicate API tests, add the expected totals from the seed data.
5. Ask the **generator** to implement one scenario from the plan.
6. Review the generated test against this project's rules: page objects instead of raw locators,
   data created through the `promotions` fixture, no fixed waits, assertions only in the test.
   Expect to rewrite the data setup — the generator works from the UI and does not know the fixtures.
7. Break a locator on purpose and ask the **healer** to fix the failing test; review its change.
8. Record here what was kept and what was rewritten.
