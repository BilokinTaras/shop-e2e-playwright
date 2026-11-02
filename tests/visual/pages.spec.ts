import type { Page } from '@playwright/test';

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

/**
 * Footer parts that differ for reasons other than a regression: the current year (1 January) and the
 * category list, whose order changes between installations — BUG-E2E-009.
 */
const footerNoise = (page: Page) => [page.getByText(/© \d{4}/), page.getByTestId('footer-categories')];

test.describe('Visual', { tag: '@visual' }, () => {
  test('home page', async ({ page, env }) => {
    await new HomePage(page, env.SUT_STOREFRONT_COUNTRY).goto();
    await expect(page.getByTestId('product-wrapper')).toHaveCount(3);
    await imagesLoaded(page);
    await expect(page).toHaveScreenshot('home.png', { ...SHOT, mask: footerNoise(page) });
  });

  test('product page', async ({ page, env }) => {
    await new ProductPage(page, env.SUT_STOREFRONT_COUNTRY).goto('qa-tee');
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
