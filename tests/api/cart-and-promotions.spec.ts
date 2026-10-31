import { expectMedusaError, expectOrder } from '../../src/fixtures/assertions';
import { expect, test } from '../../src/fixtures';

test.describe('Store API · cart, checkout and promotions', { tag: '@api' }, () => {
  test(
    'new cart is empty, in the region currency, with zero totals',
    { tag: '@smoke' },
    async ({ store, env }) => {
      const cart = await store.createCart(env.SUT_REGION_ID);
      expect(cart).toMatchObject({ region_id: env.SUT_REGION_ID, currency_code: 'eur', items: [], total: 0 });
    },
  );

  test('adding, updating and removing a line item recalculates totals', async ({ store, env }) => {
    const variantId = (await store.productByHandle('qa-tee', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID);

    const added = await store.addItem(cart.id, variantId, 2);
    expect(added.items).toHaveLength(1);
    expect(added.item_subtotal).toBe(50);

    const lineId = added.items[0]?.id ?? '';
    const updated = await store.updateItem(cart.id, lineId, 3);
    expect(updated.items[0]?.quantity).toBe(3);
    expect(updated.item_total).toBe(75);

    const removed = await store.raw('DELETE', `/store/carts/${cart.id}/line-items/${lineId}`);
    expect(removed.status).toBe(200);
    expect((await store.getCart(cart.id)).items).toHaveLength(0);
  });

  test('quantity 0 is rejected [BUG-E2E-004 for the message]', async ({ store, env }) => {
    test.fail(true, 'BUG-E2E-004: error says "expected at least: \'0\'" while 0 itself is rejected');
    const variantId = (await store.productByHandle('qa-mug', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID);
    const res = await store.raw('POST', `/store/carts/${cart.id}/line-items`, {
      data: { variant_id: variantId, quantity: 0 },
    });
    // The rejection itself is correct; the message must name the real minimum.
    expectMedusaError(res, 400, {
      type: 'invalid_data',
      message: /quantity.*(at least: '1'|greater than 0)/,
    });
  });

  test('negative quantity is rejected with a validation error', async ({ store, env }) => {
    const variantId = (await store.productByHandle('qa-mug', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID);
    const res = await store.raw('POST', `/store/carts/${cart.id}/line-items`, {
      data: { variant_id: variantId, quantity: -1 },
    });
    expectMedusaError(res, 400, { type: 'invalid_data', message: /quantity/ });
  });

  test('line item without variant_id is rejected', async ({ store, env }) => {
    const cart = await store.createCart(env.SUT_REGION_ID);
    const res = await store.raw('POST', `/store/carts/${cart.id}/line-items`, { data: { quantity: 1 } });
    expectMedusaError(res, 400, { type: 'invalid_data', message: /variant_id/ });
  });

  test('unknown variant cannot be added', async ({ store, env }) => {
    const cart = await store.createCart(env.SUT_REGION_ID);
    const res = await store.raw('POST', `/store/carts/${cart.id}/line-items`, {
      data: { variant_id: 'variant_nope', quantity: 1 },
    });
    expectMedusaError(res, 400, { type: 'invalid_data', message: /variant_nope/ });
  });

  test('sold-out variant cannot be added to a cart', async ({ store, env }) => {
    const variantId = (await store.productByHandle('qa-sold-out', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID);
    const res = await store.raw('POST', `/store/carts/${cart.id}/line-items`, {
      data: { variant_id: variantId, quantity: 1 },
    });
    expectMedusaError(res, 400, { type: 'not_allowed', message: /required inventory/ });
  });

  test('cart in an unknown region cannot be created', async ({ store }) => {
    expectMedusaError(await store.raw('POST', '/store/carts', { data: { region_id: 'reg_nope' } }), 404, {
      type: 'not_found',
    });
  });

  test('a valid percentage code discounts the cart and removing it restores totals', async ({
    store,
    env,
    promotions,
  }) => {
    const { code } = await promotions.create({ type: 'percentage', value: 10 });
    const variantId = (await store.productByHandle('qa-tee', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID);
    const before = await store.addItem(cart.id, variantId, 2);

    const discounted = await store.applyPromotions(cart.id, [code]);
    expect(discounted.promotions?.map((p) => p.code)).toEqual([code]);
    expect(discounted.discount_total).toBe(5);
    expect(discounted.total).toBe(before.total - 5);

    const restored = await store.removePromotions(cart.id, [code]);
    expect(restored.discount_total).toBe(0);
    expect(restored.total).toBe(before.total);
  });

  test('a fixed-amount code takes the exact amount off the order', async ({ store, env, promotions }) => {
    const { code } = await promotions.create({ type: 'fixed', value: 7, allocation: 'across' });
    const variantId = (await store.productByHandle('qa-mug', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID);
    await store.addItem(cart.id, variantId, 2); // 2 x 12.50
    const discounted = await store.applyPromotions(cart.id, [code]);
    expect(discounted.discount_total).toBe(7);
    expect(discounted.total).toBe(18);
  });

  test('an unknown code returns the documented validation error', async ({ store, env }) => {
    const cart = await store.createCart(env.SUT_REGION_ID);
    const res = await store.raw('POST', `/store/carts/${cart.id}/promotions`, {
      data: { promo_codes: ['NO-SUCH-CODE'] },
    });
    expectMedusaError(res, 400, {
      type: 'invalid_data',
      message: /The promotion code NO-SUCH-CODE is invalid/,
    });
  });

  test('guest checkout creates an order whose totals match the Admin API', async ({
    store,
    admin,
    env,
    faker,
  }) => {
    const variantId = (await store.productByHandle('qa-tee', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID);
    await store.addItem(cart.id, variantId, 1);
    await store.updateCart(cart.id, {
      email: `guest-${faker.string.alphanumeric(8).toLowerCase()}@example.com`,
      shipping_address: {
        first_name: 'Ada',
        last_name: 'Tester',
        address_1: 'Street 1',
        city: 'Copenhagen',
        postal_code: '1000',
        country_code: 'dk',
      },
    });
    const [option] = await store.shippingOptions(cart.id);
    await store.addShippingMethod(cart.id, option?.id ?? '');
    await store.initSystemPayment(cart.id);

    const order = expectOrder(await store.completeCart(cart.id));
    expect(order).toMatchObject({ item_total: 25, shipping_total: 10, total: 35, currency_code: 'eur' });

    const adminView = await admin.getOrder(order.id);
    expect(adminView.total).toBe(order.total);
    expect(adminView.items?.[0]?.variant_id).toBe(variantId);
  });

  test('completing the same cart twice returns the same order (idempotent)', async ({ store, env }) => {
    const variantId = (await store.productByHandle('qa-mug', env.SUT_REGION_ID)).variants?.[0]?.id ?? '';
    const cart = await store.createCart(env.SUT_REGION_ID, { email: 'idempotency@example.com' });
    await store.addItem(cart.id, variantId, 1);
    await store.updateCart(cart.id, {
      shipping_address: {
        first_name: 'Ida',
        last_name: 'Potent',
        address_1: 'Street 2',
        city: 'Aarhus',
        postal_code: '8000',
        country_code: 'dk',
      },
    });
    const [option] = await store.shippingOptions(cart.id);
    await store.addShippingMethod(cart.id, option?.id ?? '');
    await store.initSystemPayment(cart.id);

    const first = expectOrder(await store.completeCart(cart.id));
    const second = expectOrder(await store.completeCart(cart.id));
    expect(second.id).toBe(first.id);
  });
});
