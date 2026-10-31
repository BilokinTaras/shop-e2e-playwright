# BUG-E2E-007: Losing the connection at checkout gives no retryable error (Chromium also loses the address)

| Field         | Value                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Severity      | **Minor** — happens only on a network failure, but the shopper gets no guidance and on Chromium loses typed data                                                                       |
| Priority      | **Medium** — mobile shoppers drop connection often; checkout is the money path                                                                                                         |
| Component     | Storefront checkout, address step (server action `setAddresses`)                                                                                                                       |
| Environment   | Medusa 2.22.2 starter, production build; Chromium 156, Firefox 157, WebKit 27.2 (see [findings](../findings.md#findings))                                                              |
| Related tests | `tests/e2e/network.spec.ts` › "keeps the entered address and shows a retryable error [BUG-E2E-007]" (expected failure) and "after the connection returns, the cart is intact" (passes) |

## Steps to reproduce

1. Add QA Mug to the cart, open checkout, fill in the shipping address.
2. Lose the connection (DevTools → Network → Offline; in the test `context.setOffline(true)`).
3. Click **Continue to delivery**.

## Expected

The form stays as it is, an inline message such as "Could not save your address — check your
connection and try again" appears, and clicking the button again after reconnecting continues the
checkout. This follows the starter's own pattern for API errors on this step
(`data-testid="address-error-message"`) and the usability heuristic "help users recognise, diagnose and
recover from errors".

## Actual

| Browser         | Behaviour                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------- |
| Chromium        | The whole page is replaced by the generic "This page couldn’t load — Reload / Back"; the typed address is lost |
| Firefox, WebKit | The form stays, but nothing happens and no message is shown                                                    |

After reconnecting, the cart itself is intact (verified by a passing test).

## Impact

Shoppers on unstable connections either re-type the address (Chromium) or click a button that silently
does nothing (Firefox/WebKit), which looks like a broken checkout.
