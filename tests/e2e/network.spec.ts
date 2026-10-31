import { CartPage, CheckoutPage, ProductPage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';

/**
 * The storefront renders on the server, so the browser sees only part of the traffic: images,
 * client-side Store API calls (search and the product listing go to POST /store/search) and server
 * action POSTs to the storefront itself. These tests control exactly that part; failures of
 * server-to-backend calls need a fault-injection proxy (see docs/adr/ADR-002-network-control.md).
 */
test.describe('Network control', { tag: '@e2e' }, () => {
  test('the product page stays usable when every image fails to load', async ({ page, env }) => {
    await page.route(/\.(png|jpe?g|webp|svg)(\?.*)?$/, (route) => route.abort());
    const product = new ProductPage(page, env.SUT_STOREFRONT_COUNTRY);
    await product.goto('qa-mug');
    await expect(product.title).toHaveText('QA Mug');
    await product.addToCart();
    await expect(product.header.cartLink).toContainText('(1)');
  });

  test('a failing search API shows an error message instead of results', async ({ page, env }) => {
    await page.route('**/store/search', (route) =>
      route.fulfill({ status: 500, json: { type: 'unknown_error', message: 'An unknown error occurred.' } }),
    );
    await page.goto(`/${env.SUT_STOREFRONT_COUNTRY}`);
    await page.getByTestId('nav-search-button').click();
    await page.getByTestId('search-input').fill('QA');
    await expect(page.getByTestId('search-error')).toBeVisible();
    await expect(page.getByTestId('search-results')).toBeHidden();
  });

  test('a slow search shows a loading state, then the results', async ({ page, env }) => {
    // Hold the request until the test has seen the loading state: deterministic, no timing guesswork.
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/store/search', async (route) => {
      await released;
      await route.continue();
    });
    await page.goto(`/${env.SUT_STOREFRONT_COUNTRY}`);
    await page.getByTestId('nav-search-button').click();
    await page.getByTestId('search-input').fill('QA Tee');

    await expect(page.getByTestId('search-loading').first()).toBeVisible();
    release();
    await expect(page.getByTestId('search-hit-link').filter({ hasText: 'QA Tee' })).toBeVisible();
  });

  test.describe('connection lost during checkout', () => {
    test.beforeEach(async ({ page, env }) => {
      const country = env.SUT_STOREFRONT_COUNTRY;
      const product = new ProductPage(page, country);
      await product.goto('qa-mug');
      await product.addToCart();
      const checkout = new CheckoutPage(page, country);
      await checkout.goto('address');
      await checkout.fillAddress({
        email: 'offline@example.com',
        firstName: 'Off',
        lastName: 'Line',
        address: 'Vesterbrogade 1',
        postalCode: '1620',
        city: 'Copenhagen',
        countryCode: country,
      });
    });

    test('keeps the entered address and shows a retryable error [BUG-E2E-007]', async ({ page, context }) => {
      test.fail(
        true,
        'BUG-E2E-007: no inline error; Chromium replaces the page (address lost), WebKit/Firefox do nothing',
      );
      await context.setOffline(true);
      await page.getByTestId('submit-address-button').click();
      await expect(page.getByTestId('shipping-first-name-input')).toHaveValue('Off');
      await expect(page.getByTestId('address-error-message')).toBeVisible();
    });

    test('after the connection returns, the cart is intact', async ({ page, context, env }) => {
      await context.setOffline(true);
      await page.getByTestId('submit-address-button').click();
      await context.setOffline(false);
      const cart = new CartPage(page, env.SUT_STOREFRONT_COUNTRY);
      await cart.goto();
      await expect(cart.row('QA Mug')).toBeVisible();
    });
  });
});
