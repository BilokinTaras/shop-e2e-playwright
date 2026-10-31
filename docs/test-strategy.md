# Test strategy — shop-e2e-playwright

System under test: Medusa 2.22.2 (dtc-starter), run locally by `shop-sut` in production mode.
This repository owns **UI, UI+API and API-in-scenario** testing. Deep API testing (pricing oracle,
contract fuzzing, access matrix, database and concurrency checks) lives in `shop-api-pytest`;
security in `devsecops-quality-gates`; performance in `shop-performance-k6`.

## 1. Scope and risks

Risk = likelihood × impact. Impact is highest where money and orders are involved.

| Risk | Likelihood | Impact | Covered by |
|---|---|---|---|
| Checkout cannot be completed (address, delivery, payment, place order) | M | **High** | E2E guest and signed-in checkout on 3 browsers + mobile; API checkout |
| Wrong totals: UI shows a different amount from the order | M | **High** | UI total vs Admin API order total in the checkout test; promo totals by `data-value` |
| Promotions apply wrongly or cannot be removed | M | High | API percentage/fixed/remove tests; E2E promo test |
| Customer data exposed to other customers or anonymous users | L | High | API: no token / forged token / customer token on admin routes (BOLA matrix in pytest suite) |
| Out-of-stock items sold | L | High | API sold-out add; E2E sold-out button; exploratory race S2 (inventory reservation works) |
| Cross-browser rendering or behaviour differences | M | M | Chromium, Firefox, WebKit + Pixel 7 / iPhone 15 emulation |
| Accessibility regressions | M | M | axe-core WCAG 2.1 A/AA with a reviewed baseline; ARIA snapshots |
| Visual regressions on key screens | M | L | 4 screenshots in the Linux image |
| Error states (network, rejected actions) unhelpful | H | M | Network control suite; findings BUG-E2E-005, BUG-E2E-007 |

Out of scope here: real payment providers, emails, admin features beyond product and promotion
creation, load, security scanning.

## 2. Test pyramid for this repository

```
            ▲  E2E UI (19 cases × 3 browsers, 4 mobile)         slow, few, user journeys
           ▲▲  Visual 4 · Accessibility 7                       specialised, chromium only
         ▲▲▲▲  API in Playwright (45 cases)                     fast, many, contract + rules
```

Rule: anything that can be verified through the API is tested there; UI tests cover what only the
UI can break (rendering, interaction, state in the browser) and check results through the API.

## 3. Techniques

| Technique | Where |
|---|---|
| Equivalence partitioning | valid / unknown / malformed promo codes; valid / invalid emails; with / without key or token |
| Boundary value analysis | `limit` −1 / 0 / 1 / 2, `offset` = count; quantity −1 / 0 / 1 / 3; stock 0 / 1 |
| Decision table | promo code valid × already applied × second code (exploratory S1, test cases) |
| State transition | cart → address → delivery → payment → review → order; region switch → checkout countries |
| Error guessing | duplicate complete (idempotency), offline at checkout, sold-out race |
| Exploratory (SBTM) | three chartered sessions in `docs/manual/exploratory/` |

## 4. Test data

- Shared, read-only: seeded regions, products `qa-tee`, `qa-mug`, `qa-sold-out` (shop-sut contract).
- Per test: customers, promotions and products are created through the API by fixtures and deleted
  afterwards; e-mails and codes get a random suffix; names come from faker seeded by the test title.
- Nothing is hard-coded except the documented seed data; IDs come from the contract file or the API.

## 5. Entry and exit criteria

**Entry:** `make -C ../shop-sut up && make -C ../shop-sut smoke` green; lint and typecheck green.

**Exit (per change):** all projects green (expected failures stay expected); no new a11y page/rule
pair; no visual diff unless intended and reviewed; every new test passed 5 times in a row on Chromium
and 3 times on WebKit before merge.

## 6. Flaky-test policy

- No fixed waits; web-first assertions; ESLint forbids `waitForTimeout`, `force: true`, `networkidle`.
- Retries only in CI (2), with a trace on the first retry. A test that passes on retry is reported as
  flaky and fixed at the root cause. Examples fixed during development: clicks before React hydration
  on WebKit (wait for `__reactProps$` on the target), add-to-cart racing the `?v_id=` re-render
  (wait for the selected state and URL).

## 7. Metrics (from local runs, 2026-10-31)

| Metric | Value |
|---|---|
| Test cases / project runs | 75 / 121 (+ 2 setup); generated in `docs/coverage-matrix.md` |
| Full local run (all projects except visual) | 119 passed in 66 s, 6 workers (Playwright default: half of 12 logical CPUs) |
| Visual run in the Linux image | 4 passed, 12 s including `npm ci` in the container |
| Repeat runs for new tests | Chromium ×5: 67/67; WebKit ×3: 41/41; network ×3 on 3 browsers: 17/17 |
| Open defects found | 8 functional (BUG-E2E-001…008), 7 accessibility (A11Y-001…007) |

## 8. Reporting

HTML report with traces (`npm run report`); expected-failure tests carry the finding ID in the title;
`docs/coverage-matrix.md` is generated from the test list. CI publishing comes with the GitHub phase.
