import path from 'node:path';

import type { Page } from '@playwright/test';

import { ProductCard } from '../../src/components/product-card';
import { CartPage, CheckoutPage, HomePage, ProductPage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';

/**
 * Visual regression on four stable screens. Baselines are produced only in the official Playwright
 * Linux image (scripts/visual-docker.sh) — screenshots from macOS or Windows render fonts differently
 * and are never committed. See docs/adr/ADR-003-visual-baselines.md.
 */
async function imagesLoaded(page: Page): Promise<void> {
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
}

const SHOT = { fullPage: true, animations: 'disabled', caret: 'hide' } as const;

/** Card screenshots must not depend on which rail column the card lands in — see the stylesheet. */
const RAIL_WHOLE_PIXEL_COLUMNS = path.join(import.meta.dirname, 'rail-whole-pixel-columns.css');

/**
 * Footer parts that differ for reasons other than a regression: the current year (1 January) and the
 * category list, whose order changes between installations — BUG-E2E-009.
 */
const footerNoise = (page: Page) => [page.getByText(/© \d{4}/), page.getByTestId('footer-categories')];

test.describe('Visual', { tag: '@visual' }, () => {
  test('home page', async ({ page, env }) => {
    const home = new HomePage(page, env.SUT_STOREFRONT_COUNTRY);
    await home.goto();
    await expect(home.productCards).toHaveCount(3);
    await imagesLoaded(page);
    // The rail's order also changes between installations (BUG-E2E-009): the page is compared with the
    // cards masked, and each card on its own, found by its title rather than its position.
    await expect(page).toHaveScreenshot('home.png', {
      ...SHOT,
      mask: [home.productCards, ...footerNoise(page)],
    });
    for (const title of ['QA Mug', 'QA Tee', 'QA Sold Out']) {
      const card = ProductCard.byTitle(page, title).root;
      await expect(card).toHaveScreenshot(`home-card-${title.toLowerCase().replaceAll(' ', '-')}.png`, {
        animations: 'disabled',
        caret: 'hide',
        stylePath: RAIL_WHOLE_PIXEL_COLUMNS,
      });
    }
  });

  test('product page', async ({ page, env }) => {
    const product = new ProductPage(page, env.SUT_STOREFRONT_COUNTRY);
    await product.goto('qa-tee');
    // The storefront preselects the first variant the API returns, and that order is not stable
    // (BUG-E2E-009): a size is chosen explicitly, as a shopper would.
    await product.selectOption('M');
    // Related products show starter items with images from Medusa's public S3 bucket: masked.
    const related = page.getByTestId('related-products-container');
    await expect(related).toBeVisible();
    await expect(page).toHaveScreenshot('product.png', { ...SHOT, mask: [related, ...footerNoise(page)] });
  });

  test('cart with one item', async ({ page, env }) => {
    const country = env.SUT_STOREFRONT_COUNTRY;
    const product = new ProductPage(page, country);
    await product.goto('qa-mug');
    await product.addToCart();
    const cart = new CartPage(page, country);
    await cart.goto();
    await expect(cart.row('QA Mug')).toBeVisible();
    await imagesLoaded(page);
    await expect(page).toHaveScreenshot('cart.png', { ...SHOT, mask: footerNoise(page) });
  });

  test('checkout, address step', async ({ page, env }) => {
    const country = env.SUT_STOREFRONT_COUNTRY;
    const product = new ProductPage(page, country);
    await product.goto('qa-mug');
    await product.addToCart();
    await new CheckoutPage(page, country).goto('address');
    await expect(page.getByTestId('shipping-first-name-input')).toBeVisible();
    await imagesLoaded(page);
    await expect(page).toHaveScreenshot('checkout-address.png', { ...SHOT, mask: footerNoise(page) });
  });
});
