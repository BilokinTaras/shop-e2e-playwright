import { test as base, request as playwrightRequest } from '@playwright/test';
import type { Faker } from '@faker-js/faker';

import { AdminClient, type NewPromotion } from '../api/admin-client';
import { AuthClient } from '../api/auth-client';
import { StoreClient } from '../api/store-client';
import { loadEnv, type SutEnv } from '../config/env';
import { TEST_PASSWORD, seededFaker, uniqueCode, uniqueEmail } from '../data/factories';

export interface TestCustomer {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  token: string;
  store: StoreClient;
}

interface WorkerFixtures {
  env: SutEnv;
  adminToken: string;
}

interface TestFixtures {
  faker: Faker;
  auth: AuthClient;
  store: StoreClient;
  admin: AdminClient;
  /** A fresh, registered customer that belongs to this test only. */
  customer: TestCustomer;
  /** Creates promotions through the Admin API and deletes them after the test. */
  promotions: {
    create: (
      p: Partial<NewPromotion> & Pick<NewPromotion, 'type' | 'value'>,
    ) => Promise<{ id: string; code: string }>;
  };
  /** Creates single-variant products through the Admin API and deletes them after the test. */
  products: {
    create: (prices: { eur: number; usd: number }) => Promise<{ id: string; handle: string; title: string }>;
  };
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  env: [
    async ({}, use) => {
      await use(loadEnv());
    },
    { scope: 'worker' },
  ],

  // One admin login per worker: cheap, and tokens are not shared across processes.
  adminToken: [
    async ({ env }, use) => {
      const ctx = await playwrightRequest.newContext();
      const token = await new AuthClient(ctx, env.SUT_BACKEND_URL).login(
        'user',
        env.SUT_ADMIN_EMAIL,
        env.SUT_ADMIN_PASSWORD,
      );
      await use(token);
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],

  faker: async ({}, use, testInfo) => {
    await use(seededFaker(testInfo.titlePath.join(' > ')));
  },

  auth: async ({ request, env }, use) => {
    await use(new AuthClient(request, env.SUT_BACKEND_URL));
  },

  store: async ({ request, env }, use) => {
    await use(new StoreClient(request, env.SUT_BACKEND_URL, env.SUT_PUBLISHABLE_KEY));
  },

  admin: async ({ request, env, adminToken }, use) => {
    await use(new AdminClient(request, env.SUT_BACKEND_URL, adminToken));
  },

  customer: async ({ auth, store, faker }, use) => {
    const email = uniqueEmail('qa-customer');
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const registrationToken = await auth.registerCustomer(email, TEST_PASSWORD);
    const profile = await store.asCustomer(registrationToken).createCustomerProfile({
      email,
      first_name: firstName,
      last_name: lastName,
    });
    // The registration token cannot read the profile; a normal login token can.
    const token = await auth.login('customer', email, TEST_PASSWORD);
    await use({
      id: profile.id,
      email,
      password: TEST_PASSWORD,
      firstName,
      lastName,
      token,
      store: store.asCustomer(token),
    });
  },

  promotions: async ({ admin, env }, use) => {
    const created: string[] = [];
    await use({
      create: async (p) => {
        const promo = await admin.createPromotion({
          code: p.code ?? uniqueCode('QA'),
          currencyCode: p.currencyCode ?? env.SUT_REGION_CURRENCY,
          ...p,
        });
        created.push(promo.id);
        return { id: promo.id, code: promo.code };
      },
    });
    for (const id of created) await admin.raw('DELETE', `/admin/promotions/${id}`);
  },

  products: async ({ admin, env }, use) => {
    const created: string[] = [];
    await use({
      create: async ({ eur, usd }) => {
        const suffix = uniqueCode('qa-e2e').toLowerCase();
        const product = await admin.createProduct({
          title: `QA E2E ${suffix}`,
          handle: suffix,
          salesChannelId: env.SUT_SALES_CHANNEL_ID,
          prices: [
            { currency_code: 'eur', amount: eur },
            { currency_code: 'usd', amount: usd },
          ],
        });
        created.push(product.id);
        return { id: product.id, handle: product.handle, title: product.title };
      },
    });
    for (const id of created) await admin.raw('DELETE', `/admin/products/${id}`);
  },
});

export { expect } from '@playwright/test';
