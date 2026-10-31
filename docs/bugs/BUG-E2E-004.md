# BUG-E2E-004: `quantity: 0` error message says the minimum is 0

| Field        | Value                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Severity     | **Trivial** — the rejection is correct, the message contradicts it                               |
| Priority     | **Low**                                                                                          |
| Component    | Store API, `POST /store/carts/{id}/line-items` validation message                                |
| Environment  | Medusa 2.22.2, see [findings](../findings.md#findings)                                           |
| Related test | `tests/api/cart-and-promotions.spec.ts` › "quantity 0 is rejected [BUG-E2E-004 for the message]" |

## Steps to reproduce

1. Create a cart: `POST /store/carts` with the region from the contract.
2. `POST /store/carts/{id}/line-items` with `{"variant_id":"<QA Mug variant>","quantity":0}`.

## Expected

`400 invalid_data` with a message naming the real minimum, e.g. "expected at least: '1'" or
"must be greater than 0".

## Actual

`400 {"type":"invalid_data","message":"Invalid request: Value for field 'quantity' too small, expected at least: '0'"}`
— the value 0 is rejected while the message says 0 is allowed. The same message is returned for `-1`.

## Impact

Misleading for API consumers and for anyone reading logs; boundary value analysis (0 / 1) catches it.
