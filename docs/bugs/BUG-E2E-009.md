# BUG-E2E-009: Home product rail and footer categories have no stable order

| Field | Value |
|---|---|
| Severity | **Trivial** — the same products and links are shown, only their order changes |
| Priority | **Low** |
| Component | Storefront: `modules/home/components/featured-products/product-rail`, `modules/layout/templates/footer`, `lib/data/{products,categories}.ts` |
| Environment | Medusa 2.22.2 starter, production build; `shop-sut` v1.0.0 images; Playwright 1.64.1 Linux image (`mcr.microsoft.com/playwright:v1.64.1-noble`) |
| Found in | The first weekly visual run on GitHub Actions, 2026-11-02; the rail on the baseline update run the same day |

## Steps to reproduce

1. Start two stands from the same `shop-sut` release with the same seed (here: one on Docker Desktop, two on
   GitHub Actions runners).
2. Open the home page on each and compare the **QA Picks** rail and the **Categories** column in the footer.

## Expected

The same order on every installation — for the rail, the collection's order; for the categories, their
`rank`, which the seed sets.

## Actual

| Stand | QA Picks rail | Footer categories |
|---|---|---|
| Local (the original visual baseline) | QA Mug, QA Tee, QA Sold Out | Shirts, Pants, Sweatshirts, Merch |
| CI, weekly run | QA Mug, QA Tee, QA Sold Out | Shirts, Sweatshirts, Merch, Pants |
| CI, baseline update run | QA Sold Out, QA Mug, QA Tee | (masked by then) |

![QA Picks rail on two stands](evidence/BUG-E2E-009-home-rail-order.png)

![Footer categories on two stands](evidence/BUG-E2E-009-footer-order.png)

The storefront requests `/store/products?collection_id=…` and `/store/product-categories` without an `order`
parameter. Medusa 2.22.2 sets no default either: `get-query-config.js` in `@medusajs/framework` builds an
order only from the request, and the routes' list configurations define none. The order is therefore whatever
the database returns. The QA products and the starter's categories are each created by one workflow call.

In the weekly run all three visual screens with a footer failed on exactly these 406 pixels; the checkout
page, which has no footer, passed.

## Impact

Shoppers see the featured products and the navigation reshuffle between environments; any visual or content
check that relies on position is unstable. The fix is one query parameter per list (for example
`order: "rank"` for categories, an explicit order for the rail).

## How it is pinned

The visual tests mask `footer-categories`; the home page is compared with the product cards masked, and each
card is compared on its own, found by its title. A comment in `tests/visual/pages.spec.ts` names this finding.
Nothing fails automatically when it is fixed: an expected-failure test cannot be used, because on some
installations the order happens to be right and the test would pass by chance.
