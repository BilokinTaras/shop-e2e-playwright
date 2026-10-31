import { compareWithBaseline, scanWcag } from '../../src/fixtures/a11y';
import { CartPage, CheckoutPage, HomePage, ProductPage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';

/**
 * WCAG 2.1 A/AA scan with axe-core. Violations that already exist in the Medusa starter are listed
 * in tests/a11y/baseline.json with a reason; a test fails only when a new page/rule pair appears.
 */
test.describe('Accessibility (WCAG 2.1 A/AA)', { tag: '@a11y' }, () => {
  test('home page has no new violations', async ({ page, env }, testInfo) => {
    await new HomePage(page, env.SUT_STOREFRONT_COUNTRY).goto();
    const violations = await scanWcag(page);
    await testInfo.attach('axe-home.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
    expect(compareWithBaseline('home', violations).newOnes).toEqual([]);
  });

  test('product page has no new violations', async ({ page, env }, testInfo) => {
    await new ProductPage(page, env.SUT_STOREFRONT_COUNTRY).goto('qa-tee');
    const violations = await scanWcag(page);
    await testInfo.attach('axe-product.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
    expect(compareWithBaseline('product', violations).newOnes).toEqual([]);
  });

  test('cart page has no new violations', async ({ page, env }, testInfo) => {
    const country = env.SUT_STOREFRONT_COUNTRY;
    const product = new ProductPage(page, country);
    await product.goto('qa-mug');
    await product.addToCart();
    await new CartPage(page, country).goto();
    const violations = await scanWcag(page);
    await testInfo.attach('axe-cart.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
    expect(compareWithBaseline('cart', violations).newOnes).toEqual([]);
  });

  test('checkout address step has no new violations', async ({ page, env }, testInfo) => {
    const country = env.SUT_STOREFRONT_COUNTRY;
    const product = new ProductPage(page, country);
    await product.goto('qa-mug');
    await product.addToCart();
    await new CheckoutPage(page, country).goto('address');
    await expect(page.getByTestId('shipping-first-name-input')).toBeVisible();
    const violations = await scanWcag(page);
    await testInfo.attach('axe-checkout.json', {
      body: JSON.stringify(violations, null, 2),
      contentType: 'application/json',
    });
    expect(compareWithBaseline('checkout', violations).newOnes).toEqual([]);
  });
});
