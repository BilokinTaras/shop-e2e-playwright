import { STORAGE_STATE } from '../../playwright.config';
import { AdminProductCreatePage, AdminPromotionCreatePage } from '../../src/pages/admin';
import { expect, test } from '../../src/fixtures';
import { uniqueCode } from '../../src/data/factories';

test.describe('Admin dashboard', { tag: '@e2e' }, () => {
  test.use({ storageState: STORAGE_STATE.admin });

  test('a product created in the admin is published to the Store API', async ({
    page,
    env,
    store,
    admin,
  }) => {
    const handle = uniqueCode('qa-admin-ui').toLowerCase();
    const create = new AdminProductCreatePage(page, env.SUT_ADMIN_URL);

    await create.goto();
    const productId = await create.createSimpleProduct(`QA Admin UI ${handle}`, handle);

    try {
      await expect
        .poll(async () =>
          (await store.listProducts({ handle, fields: 'id,handle,title' })).products.map((p) => p.id),
        )
        .toEqual([productId]);
    } finally {
      await admin.raw('DELETE', `/admin/products/${productId}`);
    }
  });

  test('a promotion created in the admin is stored with the entered code and value', async ({
    page,
    env,
    admin,
  }) => {
    const code = uniqueCode('QA-UI');
    const create = new AdminPromotionCreatePage(page, env.SUT_ADMIN_URL);

    await create.goto();
    const promotionId = await create.createPercentageOffOrder(code, 12);

    try {
      const promotion = await admin.getPromotion(promotionId);
      expect(promotion).toMatchObject({
        code,
        status: 'active',
        is_automatic: false,
        application_method: { type: 'percentage', value: 12, target_type: 'order' },
      });
    } finally {
      await admin.raw('DELETE', `/admin/promotions/${promotionId}`);
    }
  });
});
