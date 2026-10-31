# Accessibility findings

Scanner: axe-core via `@axe-core/playwright` 4.14.0, rule tags `wcag2a, wcag2aa, wcag21a, wcag21aa`,
Chromium 156, desktop 1280×720; storefront production build of the Medusa 2.22.2 starter. Found 2026-10-31.

The suite (`tests/a11y/wcag.spec.ts`) scans home, product, cart and the first checkout step. Violations
that already exist are listed per page and rule in [`tests/a11y/baseline.json`](../tests/a11y/baseline.json),
each with the finding ID below; a test fails only when a new page/rule pair appears. Automated scans
catch roughly the structural part of WCAG — keyboard flow, focus order and screen-reader wording still
need manual checks (see the exploratory sessions).

| ID                           | Finding                                                                                                         | WCAG 2.1 SC         | axe rule · impact                       | Pages                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------- | -------------------- |
| [A11Y-001](bugs/A11Y-001.md) | Admin "Create product" wizard is mounted twice and hidden from assistive technology                             | 4.1.2, 1.3.1        | found while writing tests               | admin                |
| A11Y-002                     | Checkout address inputs have only visual floating labels; the country `<select>` has no name                    | 1.3.1, 3.3.2, 4.1.2 | `label`, `select-name` · critical       | checkout             |
| A11Y-003                     | Cart row controls have no accessible names: quantity `<select>` and the icon-only delete button                 | 4.1.2               | `select-name`, `button-name` · critical | cart                 |
| A11Y-004                     | Header cart link is nested inside a `<button>`                                                                  | 4.1.2               | `nested-interactive` · serious          | every page           |
| A11Y-005                     | Product page accordion toggles ("Product Information", "Shipping & Returns") have no accessible name            | 4.1.2               | `button-name` · critical                | product              |
| A11Y-006                     | Image-only links without text: footer logos (medusajs.com, nextjs.org), product thumbnails in cart and checkout | 2.4.4, 4.1.2        | `link-name` · serious                   | all scanned          |
| A11Y-007                     | Interactive text colour ("View all", "Add Promotion Code(s)") is below 4.5:1 contrast                           | 1.4.3               | `color-contrast` · serious              | home, cart, checkout |

## Details

### A11Y-002 — checkout form fields are not labelled

Eight inputs (`given-name`, `family-name`, `address-line1`, …) use `placeholder=" "` and a visual label
drawn over the field, without `<label for>` or `aria-label`. A screen reader announces "edit text,
required" for each field. The country `<select name="shipping_address.country_code">` has no label
either. **Impact:** a blind shopper cannot complete checkout. **Fix:** link the visual label with
`htmlFor`/`id`, or add `aria-labelledby`.

### A11Y-003 — cart controls

`<select data-testid="product-select-button">` (quantity) has no name; the delete button contains only
an icon (see also [BUG-E2E-006](bugs/BUG-E2E-006.md)). **Fix:** `aria-label="Quantity of QA Mug"`,
`aria-label="Remove QA Mug"`.

### A11Y-004 — nested interactive controls in the header

The cart popover trigger is a `<button>` that contains the `<a href="/dk/cart">Cart (n)</a>` link.
Assistive technologies announce one control and hide the other; keyboard users get two tab stops for
one action. **Fix:** make the popover trigger the link itself, or separate the two.

### A11Y-005 — unnamed accordion toggles

The accordion headers render the visible text in a `<p>` next to an empty `<button>`; the button has no
name. **Fix:** put the text inside the button.

### A11Y-006 — links without text

Footer logo links contain only SVGs; cart/checkout thumbnails link to the product without text or
`alt`. **Fix:** `aria-label` on logo links; `alt` text on thumbnails.

### A11Y-007 — contrast

`text-ui-fg-interactive` on white is reported below the 4.5:1 minimum for normal text.
