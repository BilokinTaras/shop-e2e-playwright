# BUG-E2E-008: Cart quantity select ignores stock and shows a duplicate "1"

| Field | Value |
|---|---|
| Severity | **Minor** — shoppers can pick quantities that cannot be fulfilled; the duplicate option is cosmetic |
| Priority | **Low** |
| Component | Storefront, `modules/cart/components/item/index.tsx` |
| Environment | Medusa 2.22.2 starter, production build, Chromium 156 (see [findings](../findings.md#findings)) |
| Found in | Exploratory session [S2](../manual/exploratory/session-2-stock.md) |

## Steps to reproduce

1. Create a product whose only variant has inventory management on and **1** item in stock.
2. Add it to the cart and open `/dk/cart`.
3. Open the quantity drop-down.

## Expected

Options limited to what can be bought (here: 1), each value once.

## Actual

Options: `Select…, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1`. Choosing 2 fails with an unreadable error
(see BUG-E2E-005). The code confirms both parts: `maxQtyFromInventory` is hard-coded to 10 with a
`TODO: Update this to grab the actual max inventory`, and a literal `<option value={1}>` is appended after
the generated options (which also gives React two siblings with key `1`).

## Impact

Shoppers are offered quantities that the checkout will reject; the duplicate entry looks broken.
