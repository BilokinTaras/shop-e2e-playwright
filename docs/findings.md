# Findings

Defects found while automating Medusa with this suite. **How a finding is pinned depends on what the
defect allows**, and the `Test` column says which of the three it is:

| How it is pinned | Findings | What happens when the product is fixed |
|---|---|---|
| **Expected failure** (`test.fail`): a test asserts the correct behaviour and is expected to fail | BUG-E2E-001, 002, 003, 004, 005, 007 | Playwright reports "expected to fail but passed" and the run fails, so the mark must be removed |
| **Workaround in a page object**: the defect makes an element unusable, so the locator avoids it and a comment names the finding | BUG-E2E-006, A11Y-001 | Nothing fails automatically; the comment is the reminder. Removing the workaround is what proves the fix |
| **Accessibility baseline**: the violation is recorded in `tests/a11y/baseline.json` and the test fails on anything new | A11Y-002…007 | The entry becomes stale. The known limitation is in [accessibility.md](accessibility.md) |
| **Exploratory evidence only** | BUG-E2E-008 | No automated check; see the session notes |

So **6 of the 15 findings have an expected-failure test**; the rest are pinned by a workaround, a
baseline entry or session evidence. The honest summary: the suite never silently stays red, and it
catches a fix for those six — the other nine need a human to notice.

Environment for all findings: `shop-sut` commit `62d1e81`, Medusa `@medusajs/*` 2.22.2 (dtc-starter
`d4e4dae`), Next.js 16.3.8 storefront in production mode, PostgreSQL 17.11, Redis 7.4.12; Playwright
1.64.1 (Chromium 156.0.8078.4, Firefox 157.0, WebKit 27.2); Windows 11 x86_64 + Docker Desktop.
Found 2026-10-31.

| ID                                 | Title                                                                                        | Area       | Severity    | Priority | Test                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------- | ---------- | ----------- | -------- | --------------------------------------- |
| [BUG-E2E-001](bugs/BUG-E2E-001.md) | Negative `limit`/`offset` on `GET /store/products` returns 500 instead of 400                | Store API  | Minor       | Medium   | `tests/api/catalog.spec.ts`             |
| [BUG-E2E-002](bugs/BUG-E2E-002.md) | Customer registration issues a token for a string that is not an email                       | Auth API   | Minor       | Low      | `tests/api/auth-and-access.spec.ts`     |
| [BUG-E2E-003](bugs/BUG-E2E-003.md) | Registration without a password returns 401 "unauthorized" instead of a 400 validation error | Auth API   | Trivial     | Low      | `tests/api/auth-and-access.spec.ts`     |
| [BUG-E2E-004](bugs/BUG-E2E-004.md) | `quantity: 0` error message says the minimum is 0                                            | Store API  | Trivial     | Low      | `tests/api/cart-and-promotions.spec.ts` |
| [BUG-E2E-005](bugs/BUG-E2E-005.md) | Rejected cart/checkout actions (promo code, quantity above stock, sold-out item at order) show "Minified React error #441" in production builds        | Storefront | Major       | High     | `tests/e2e/promotions.spec.ts`          |
| [BUG-E2E-006](bugs/BUG-E2E-006.md) | Cart delete button loses its `data-testid` and has no accessible name                        | Storefront | Minor       | Low      | `src/pages/storefront.ts` (workaround)  |
| [BUG-E2E-007](bugs/BUG-E2E-007.md) | Losing the connection at checkout gives no retryable error (Chromium also loses the address) | Storefront | Minor       | Medium   | `tests/e2e/network.spec.ts`             |
| [BUG-E2E-008](bugs/BUG-E2E-008.md) | Cart quantity select ignores stock and shows a duplicate "1" | Storefront | Minor | Low | exploratory session S2 |
| A11Y-002…007                       | Storefront WCAG 2.1 violations found by axe-core — see [accessibility.md](accessibility.md)  | Storefront | Major–Minor | Medium   | `tests/a11y/wcag.spec.ts` (baseline)    |
| [A11Y-001](bugs/A11Y-001.md)       | Admin "Create product" wizard is mounted twice and hidden from assistive technology          | Admin      | Major       | Medium   | `src/pages/admin.ts` (workaround)       |

Severity scale: Critical (data loss, money, security) · Major (a core flow is broken or misleading) ·
Minor (wrong behaviour with a workaround) · Trivial (cosmetic, wording).
Priority reflects how soon a real team should fix it given user impact and effort.

## Observed, not a defect

| Observation                                                                                  | Why it is not filed                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registering an existing email **with the same password** returns a token instead of an error | Medusa lets one email hold several actor types (admin and customer); with a different password the call is refused with 401 "Identity with email already exists". Covered by a positive test. |
| `POST /store/carts/{id}/complete` twice returns the same order                               | Correct idempotent behaviour; covered by a test.                                                                                                                                              |
| Production storefront cookies are `Secure`, so WebKit drops them on plain-HTTP `localhost`   | Correct for production behind HTTPS; the local stand opts out (shop-sut ADR-002).                                                                                                             |
