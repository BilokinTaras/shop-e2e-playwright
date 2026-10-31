# Release smoke checklist

These 14 checks take about 10 minutes in one desktop browser and run against the build being
released. They confirm that the money path and the main controls work. They are not a regression
run: the automated suite does that job (`npm test`; the `@smoke` subset runs with `npm run test:smoke`).

**Before you start:** the stand is up (`make -C ../shop-sut up`), `../shop-sut/.generated/sut.env` exists,
and you have the admin credentials from that file (test-only values). Use a fresh private window. If a
check fails, record what you saw. Stop the release if checks 1, 6, 7 or 9 fail.

| # | Check | Expected result | Covered by automated test | Result |
|---|---|---|---|---|
| 1 | Open http://localhost:9000/health | `200 OK` | `tests/api/catalog.spec.ts` › health endpoint answers 200 | |
| 2 | `curl -i http://localhost:9000/store/products` (no key) | `400`, type `not_allowed`, message names `x-publishable-api-key` | `tests/api/auth-and-access.spec.ts` › Store API without a publishable key is refused | |
| 3 | Open http://localhost:8000/dk | Product cards are shown (QA Tee, QA Mug, QA Sold Out); tab title contains "Medusa" | `tests/e2e/cart.spec.ts` › home page shows products | |
| 4 | Open `/dk/products/qa-tee` and pick size M | Add to cart becomes enabled; price €25.00 | `tests/e2e/cart.spec.ts` › a product with variants needs a size before it can be added (picks L) | |
| 5 | Open `/dk/products/qa-sold-out` | Button is disabled and reads "Out of stock" | `tests/e2e/cart.spec.ts` › a sold-out product cannot be added to the cart | |
| 6 | Add QA Mug, open the cart, set quantity 3, reload, then remove the item | €37.50 after the change and after reload; empty-cart message after removal | `tests/e2e/cart.spec.ts` › cart: change quantity, survive a reload, remove the item, see the empty state | |
| 7 | Guest checkout: QA Tee M → address in Copenhagen → Standard Shipping → Manual Payment → Place order | Confirmation page with your email; total €35.00 (25.00 + 10.00 shipping) | `tests/e2e/checkout.spec.ts` › guest buys a T-shirt and the order matches the Admin API | |
| 8 | Sign in at http://localhost:9000/app | You land on Orders | `tests/setup/auth.setup.ts` › sign in the admin through the dashboard | |
| 9 | In the admin, open the order from check 7 | Same email; QA Tee / M × 1; Standard Shipping; total €35.00 | Manual only. The same order total is compared through the Admin API in `tests/e2e/checkout.spec.ts` › guest buys a T-shirt and the order matches the Admin API | |
| 10 | In the admin, create a "Percentage off order" promotion: 20 %, code `SMOKE20-<date>` | Saved with status Active | `tests/e2e/admin.spec.ts` › a promotion created in the admin is stored with the entered code and value (12 %) | |
| 11 | Put QA Tee S in the cart, go to checkout, apply the code from check 10, then remove it | Discount €5.00 and the total drops by 5.00; removing the code restores the total | `tests/e2e/promotions.spec.ts` › a 20% code takes 5.00 off a 25.00 item and removing it restores the total | |
| 12 | In the same checkout, apply `NOT-A-REAL-CODE` | Readable "code is invalid" message; total unchanged | `tests/e2e/promotions.spec.ts` › an unknown code shows a readable error and changes nothing [BUG-E2E-005]. **Known failure:** a "Minified React error #441" is shown. Releasing needs an owner decision | |
| 13 | Register a new customer at `/dk/account`, buy QA Mug, open Account → Orders, sign out and sign back in | The new order is listed; the login form appears after sign-out; sign-in works | `tests/e2e/account.spec.ts` › register, sign out, sign back in; `tests/e2e/checkout.spec.ts` › order placed by a signed-in customer appears in their order history | |
| 14 | DevTools device mode 375 × 812: home → QA Mug → cart → checkout | Menu opens; Add to cart and the checkout buttons can be reached; no horizontal scrolling | Manual only (journeys also run on Pixel 7 / iPhone 15 emulation in the `mobile-chrome` and `mobile-safari` projects) | |

After the run, delete the promotion from check 10 in the admin. Orders and customers created here are
throwaway data on the local stand. `make reset` removes them.
