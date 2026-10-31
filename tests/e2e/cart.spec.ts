import { CartSummary } from '../../src/components/cart-summary';
import { CartPage, HomePage, ProductPage, StorePage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';

test.describe('Catalog and cart', { tag: '@e2e' }, () => {
  test('home page shows products', { tag: ['@smoke', '@mobile'] }, async ({ page, env }) => {
    const home = new HomePage(page, env.SUT_STOREFRONT_COUNTRY);
    await home.goto();
    await expect(home.productCards.first()).toBeVisible();
    await expect(page).toHaveTitle(/Medusa/);
  });

  test('store page lists the QA products with their prices', async ({ page, env }) => {
    const store = new StorePage(page, env.SUT_STOREFRONT_COUNTRY);
    await store.goto();
    await expect(store.title).toBeVisible();
    await expect(store.card('QA Mug').price).toContainText('12.50');
  });

  test(
    'cart: change quantity, survive a reload, remove the item, see the empty state',
    { tag: '@mobile' },
    async ({ page, env }) => {
      const country = env.SUT_STOREFRONT_COUNTRY;
      const product = new ProductPage(page, country);
      const cart = new CartPage(page, country);

      await product.goto('qa-mug');
      await product.addToCart();
      await cart.goto();
      await expect(cart.row('QA Mug')).toBeVisible();
      await expect(cart.summary.subtotal).toHaveAttribute('data-value', '12.5');

      await cart.setQuantity('QA Mug', 3);
      await expect(cart.summary.subtotal).toHaveAttribute('data-value', '37.5');

      await page.reload();
      await expect(cart.row('QA Mug').getByTestId('product-select-button')).toHaveValue('3');
      expect(await CartSummary.valueOf(cart.summary.total)).toBe(37.5);

      await cart.remove('QA Mug');
      await expect(cart.emptyMessage).toBeVisible();
      await expect(cart.rows).toHaveCount(0);
    },
  );

  test('a sold-out product cannot be added to the cart', async ({ page, env }) => {
    const product = new ProductPage(page, env.SUT_STOREFRONT_COUNTRY);
    await product.goto('qa-sold-out');
    await expect(product.title).toHaveText('QA Sold Out');
    await expect(product.addToCartButton).toBeDisabled();
    await expect(product.addToCartButton).toHaveText(/out of stock/i);
  });

  test('a product with variants needs a size before it can be added', async ({ page, env }) => {
    const product = new ProductPage(page, env.SUT_STOREFRONT_COUNTRY);
    await product.goto('qa-tee');
    await product.selectOption('L');
    await expect(product.addToCartButton).toBeEnabled();
    await expect(product.price).toContainText('25.00');
  });
});
