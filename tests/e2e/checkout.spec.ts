import { readFileSync } from 'node:fs';

import { STORAGE_STATE } from '../../playwright.config';
import { CartSummary } from '../../src/components/cart-summary';
import {
  AccountPage,
  CartPage,
  CheckoutPage,
  OrderConfirmedPage,
  ProductPage,
} from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';
import { uniqueEmail } from '../../src/data/factories';

test.describe('Checkout', { tag: '@e2e' }, () => {
  test(
    'guest buys a T-shirt and the order matches the Admin API',
    { tag: ['@smoke', '@mobile'] },
    async ({ page, env, admin, faker }) => {
      const country = env.SUT_STOREFRONT_COUNTRY;
      const product = new ProductPage(page, country);
      const cart = new CartPage(page, country);
      const checkout = new CheckoutPage(page, country);
      const confirmed = new OrderConfirmedPage(page, country);
      const email = uniqueEmail('qa-guest');

      await test.step('add QA Tee size M to the cart', async () => {
        await product.goto('qa-tee');
        await product.selectOption('M');
        await product.addToCart();
        await expect(product.header.cartLink).toContainText('1');
      });

      await test.step('go through address, delivery and payment', async () => {
        await cart.goto();
        await expect(cart.row('QA Tee')).toBeVisible();
        await cart.checkout();
        await checkout.fillAddress({
          email,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          address: faker.location.streetAddress(),
          postalCode: '2100',
          city: 'Copenhagen',
          countryCode: country,
        });
        await checkout.continueToDelivery();
        await checkout.chooseDelivery('Standard Shipping');
        await checkout.continueToPayment();
        await checkout.chooseManualPayment();
        await checkout.continueToReview();
      });

      const uiTotal = await test.step('place the order', async () => {
        const total = await CartSummary.valueOf(checkout.summary.total);
        await checkout.placeOrder();
        await expect(confirmed.container).toBeVisible();
        await expect(confirmed.email).toContainText(email);
        return total;
      });

      await test.step('the Admin API has the same order and total', async () => {
        const order = await admin.getOrder(confirmed.idFromUrl());
        expect(order.email).toBe(email);
        expect(order.total).toBe(uiTotal);
        expect(order.total).toBe(35); // 25.00 item + 10.00 standard shipping, no tax in the seeded region
      });
    },
  );

  test.describe('signed-in customer', () => {
    test.use({ storageState: STORAGE_STATE.customer });

    test('order placed by a signed-in customer appears in their order history', async ({ page, env }) => {
      const info = JSON.parse(readFileSync(STORAGE_STATE.customerInfo, 'utf8')) as { email: string };
      const country = env.SUT_STOREFRONT_COUNTRY;
      const product = new ProductPage(page, country);
      const cart = new CartPage(page, country);
      const checkout = new CheckoutPage(page, country);
      const confirmed = new OrderConfirmedPage(page, country);
      const account = new AccountPage(page, country);

      await product.goto('qa-mug');
      await product.addToCart();
      await cart.goto();
      await cart.checkout();
      await checkout.fillAddress({
        email: info.email,
        firstName: 'Return',
        lastName: 'Customer',
        address: 'Nørrebrogade 1',
        postalCode: '2200',
        city: 'Copenhagen',
        countryCode: country,
      });
      await checkout.continueToDelivery();
      await checkout.chooseDelivery('Standard Shipping');
      await checkout.continueToPayment();
      await checkout.chooseManualPayment();
      await checkout.continueToReview();
      await checkout.placeOrder();
      const orderId = confirmed.idFromUrl();

      await account.goto('/orders');
      await expect(account.orderCards.filter({ has: page.locator(`[href*="${orderId}"]`) })).toHaveCount(1);
    });
  });
});
