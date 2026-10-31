# Test plan: Medusa 2.22.2 shop

| | |
|---|---|
| Identifier | TP-SHOP-E2E-01, version 1.0 (condensed IEEE 829 / ISO/IEC/IEEE 29119-3 test plan) |
| Owner | Taras Bilokin |
| Status | Draft. Schedule and approval: TBD by owner |
| Related | [Test strategy](../test-strategy.md) · [Test cases](test-cases.csv) · [Smoke checklist](smoke-checklist.md) · [Exploratory sessions](exploratory/README.md) · [Findings](../findings.md) |

## 1. Scope

**In scope:** Medusa 2.22.2 running on the local `shop-sut` stand. That covers the storefront
(http://localhost:8000/dk), the admin dashboard (http://localhost:9000/app) and the Store and Admin
REST APIs (http://localhost:9000).

**Out of scope:** payments with real providers, emails and notifications, performance and load
(`shop-performance-k6`), and security testing (`devsecops-quality-gates`). Deep API contract, pricing
and database checks are out of scope too (`shop-api-pytest`).

## 2. Test items

| Item | Version | Notes |
|---|---|---|
| Medusa backend + admin dashboard | `@medusajs/*` 2.22.2 | Production mode |
| Storefront | dtc-starter `d4e4dae`, Next.js 16.3.8 | Production build (`next build` + `next start`) |
| Stand | `shop-sut` `62d1e81`, PostgreSQL 17.11, Redis 7.4.12 | Compose project `qa-shop-sut` |
| Test data | `shop-sut/docs/test-data-contract.md`, `.generated/sut.env` | IDs are never hard-coded |

## 3. Features to be tested

| Area | Risk | Levels | Cases |
|---|---|---|---|
| Catalog, search, region prices | Medium | API, E2E, manual | TC-001…014 |
| Product page: variants, stock 0 | High | API, E2E, visual | TC-015…019 |
| Cart: add, update, remove, quantity and stock limits | High | API, E2E, manual | TC-020…031 |
| Promotions: percentage, fixed, invalid, stacking | High | API, E2E, manual | TC-032…041 |
| Checkout: step transitions, back-edits, totals vs Admin API, region switch | High | API, E2E, manual | TC-042…055 |
| Customer account and order history | Medium | API, E2E | TC-056…061 |
| Admin: sign-in, product and promotion creation, order view | Medium | E2E, manual | TC-062…068 |
| API authentication and access control | High | API | TC-069…078 |
| API input validation | Medium | API | TC-079…091 |
| Accessibility (WCAG 2.1 A/AA) | Medium | axe-core, ARIA snapshots, manual | TC-092…101 |
| Network resilience | Medium | E2E with request interception | TC-102…106 |

## 4. Features not to be tested

Real payment providers, refunds and captures (only the system *Manual Payment* provider is configured).
Emails. Performance. Security beyond basic access-control checks. Admin features other than sign-in,
product and promotion creation and the order view (returns, claims, exchanges, settings, users, tax).
Gift cards. Translations. Real mobile devices (emulation only).

## 5. Approach

- **Risk-based.** Risk = likelihood × impact (risk table in the [test strategy](../test-strategy.md#1-scope-and-risks)).
  High means money, orders or access are at stake. Medium means wrong behaviour that has a workaround.
  Low means cosmetic. High cases run first in every cycle.
- **Levels.** The API level (Store/Admin API from Playwright) covers business rules, validation and
  access control. E2E UI covers user journeys on three engines, plus mobile emulation for the
  `@mobile` journeys. Specialised suites cover accessibility (axe-core with a reviewed baseline, ARIA
  snapshots), visual comparison (official Linux image) and network control.
- **Manual and automated work.** 76 of the 106 cases are automated. Of those, 70 pass and 6 fail
  on known defects. The other 30 cases stay manual because automating them costs too much or
  because they need human judgement: keyboard and screen-reader use, layout, back-edits during
  checkout and region switching. Exploratory testing runs as time-boxed SBTM sessions
  ([exploratory/](exploratory/README.md)). A manual case that proves stable and valuable becomes an
  automation candidate. Every confirmed defect gets a strict expected-failure test.
- **Techniques.** Equivalence partitioning, boundary value analysis, a decision table (promo code),
  state transitions (checkout), use cases, error guessing and checklists. Each case names its
  technique.
- **Defects.** Defects are filed as `BUG-E2E-NNN` / `A11Y-NNN` in [docs/bugs](../bugs/), using the
  severity and priority scales in [findings.md](../findings.md).

## 6. Pass/fail, entry, exit, suspension

| Criterion | Definition |
|---|---|
| Case pass/fail | Actual matches the expected result. For automated cases, a strict expected failure counts as *Fail (BUG-ID)* against the product, not against the suite |
| Entry | `make -C ../shop-sut up` and `make -C ../shop-sut smoke` are green. `sut.env` is present. Seed data matches the contract (TC-003, TC-006). `npm run lint` and `npm run typecheck` are green. The build under test is identified (stand commit, Medusa version) |
| Exit (release) | Smoke checklist done. All High cases executed and recorded. The automated suite is green apart from documented expected failures. No open Critical defect. Every open Major (now BUG-E2E-005, A11Y-001 and the Major items in A11Y-002…007) has a recorded owner decision. No new axe page/rule pair. No unreviewed visual diff |
| Suspend / resume | Suspend if `/health` is not 200, seed data is missing or checkout is blocked. Resume after `make reset` and a green smoke run |

## 7. Environments

| Component | Value |
|---|---|
| Automated browsers | Chromium 156, Firefox 157, WebKit 27.2 via Playwright 1.64.1 |
| Mobile emulation | Pixel 7 (Chromium) and iPhone 15 (WebKit) for `@mobile` journeys |
| Manual runs | Current desktop Chrome, Firefox or Safari; NVDA + Firefox or VoiceOver + Safari for screen-reader cases. Record the exact versions in the run |
| Host | Windows 11 x86_64 + Docker Desktop. The stand also runs on macOS arm64 and Linux |
| Visual baselines | Official Playwright Linux image only |

## 8. Test data (from the contract)

| Data | Values |
|---|---|
| Regions | Europe: EUR; gb, de, dk, se, fr, es, it. QA North America: USD; us, ca |
| Storefront country | `dk`, plus `us` for USD checks |
| Products | QA Tee S/M/L 25.00 EUR / 30.00 USD · QA Mug 12.50 EUR / 14.00 USD · QA Sold Out 40.00 EUR / 45.00 USD, stock 0 · other QA stock 1,000,000 |
| Shipping | Standard and Express Shipping 10 EUR (Europe); QA Standard Shipping (US/CA) 8 USD |
| Admin | `SUT_ADMIN_EMAIL` / `SUT_ADMIN_PASSWORD` from `sut.env` (test-only values) |

Shared data is read-only. Customers, promotions and products are created per test through the API,
with a unique suffix, and deleted afterwards. `make reset` restores a clean stand.

## 9. Deliverables

This plan · [test-cases.csv](test-cases.csv) (106 cases) · [smoke checklist](smoke-checklist.md) ·
exploratory session notes · bug reports and [findings](../findings.md) ·
[accessibility findings](../accessibility.md) · Playwright HTML report with traces ·
[coverage matrix](../coverage-matrix.md) · test summary report at the end of each cycle.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Parallel tests collide on shared data | Shared data is read-only; per-test data has unique names and teardown |
| Production and dev builds behave differently (BUG-E2E-005 is invisible in `next dev`) | Always test the production build |
| Starter products load images from the internet | QA products use local images; external content is masked in screenshots |
| Font rendering differs by OS | Visual baselines come only from the Linux image ([ADR-003](../adr/ADR-003-visual-baselines.md)) |
| Server-side rendering hides backend calls from the browser | Browser traffic is faulted in tests; backend faults need a proxy ([ADR-002](../adr/ADR-002-network-control.md)) |
| Automated a11y scans find only structural issues | Manual keyboard, screen-reader and reflow cases (TC-099…101) |
| Upstream upgrade changes behaviour | Medusa pinned to 2.22.2; an upgrade starts a new test cycle |
| One person does all testing | Risk-based order; High cases first; smoke checklist as the minimum gate |

## 11. Schedule and approvals

| Activity | Start | End |
|---|---|---|
| Planning and case design | TBD by owner | TBD by owner |
| Automated regression | TBD by owner | TBD by owner |
| Manual cases and exploratory sessions | TBD by owner | TBD by owner |
| Release smoke and summary report | TBD by owner | TBD by owner |

Responsible for planning, design, execution and the release recommendation: Taras Bilokin.
Approval: TBD by owner.
