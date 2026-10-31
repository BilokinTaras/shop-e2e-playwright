# BUG-E2E-006: Cart delete button loses its `data-testid` and has no accessible name

| Field        | Value                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Severity     | **Minor** — the button works for mouse users; screen-reader users hear an unnamed button; test ID is lost |
| Priority     | **Low**                                                                                                   |
| Component    | Storefront, `modules/cart/components/item` → `modules/common/components/delete-button`                    |
| Environment  | Medusa 2.22.2 starter, see [findings](../findings.md#findings)                                            |
| Related code | `src/pages/storefront.ts` › `CartPage.remove()` (workaround)                                              |

## Steps to reproduce

1. Add any product to the cart and open `/dk/cart`.
2. Inspect the trash-can button in a product row.

## Expected

- `data-testid="product-delete-button"` is rendered: the cart item passes it explicitly
  (`<DeleteButton id={item.id} data-testid="product-delete-button" />`).
- The button has an accessible name such as "Remove QA Mug" (WCAG 2.1 SC 4.1.2 Name, Role, Value).

## Actual

- `DeleteButton` does not accept or forward `data-testid`, so the attribute never reaches the DOM.
- The button contains only an SVG icon and an empty `<span>`: its accessible name is empty.

## Impact

Assistive-technology users cannot identify the control; automated tests must fall back to structural
locators (`row.getByRole('button')`). The same component is used in other places that pass a test ID.
