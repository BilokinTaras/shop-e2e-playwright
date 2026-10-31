import { CartSummary } from '../../src/components/cart-summary';
import { CartPage, CheckoutPage, ProductPage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';

test.describe('Promo code at checkout', { tag: '@e2e' }, () => {
  test.beforeEach(async ({ page, env }) => {
    const country = env.SUT_STOREFRONT_COUNTRY;
    const product = new ProductPage(page, country);
    await product.goto('qa-tee');
    await product.selectOption('S');
    await product.addToCart();
    const cart = new CartPage(page, country);
    await cart.goto();
    await cart.checkout();
  });

  test('a 20% code takes 5.00 off a 25.00 item and removing it restores the total', async ({
    page,
    env,
    promotions,
  }) => {
    const { code } = await promotions.create({ type: 'percentage', value: 20 });
    const checkout = new CheckoutPage(page, env.SUT_STOREFRONT_COUNTRY);
    const totalBefore = await CartSummary.valueOf(checkout.summary.total);

    await checkout.applyDiscount(code);
    await expect(checkout.discountRow).toContainText(code);
    await expect(checkout.summary.discount).toHaveAttribute('data-value', '5');
    await expect(checkout.summary.total).toHaveAttribute('data-value', String(totalBefore - 5));

    await checkout.removeDiscountButton.click();
    await expect(checkout.discountRow).toHaveCount(0);
    await expect(checkout.summary.total).toHaveAttribute('data-value', String(totalBefore));
  });

  test('an unknown code shows a readable error and changes nothing [BUG-E2E-005]', async ({ page, env }) => {
    test.fail(
      true,
      'BUG-E2E-005: production build shows "Minified React error #441" instead of the API message',
    );
    const checkout = new CheckoutPage(page, env.SUT_STOREFRONT_COUNTRY);
    const totalBefore = await CartSummary.valueOf(checkout.summary.total);

    await checkout.applyDiscount('NOT-A-REAL-CODE');
    await expect(checkout.summary.total).toHaveAttribute('data-value', String(totalBefore));
    await expect(checkout.discountError).toContainText(/NOT-A-REAL-CODE.*invalid/i);
  });
});
