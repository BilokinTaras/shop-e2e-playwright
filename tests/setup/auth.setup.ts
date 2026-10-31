import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { STORAGE_STATE } from '../../playwright.config';
import { AccountPage } from '../../src/pages/storefront';
import { AdminLoginPage } from '../../src/pages/admin';
import { expect, test } from '../../src/fixtures';

/**
 * Logs in once through the real UI and saves the browser state, so scenarios that need a signed-in
 * customer or admin start authenticated. The customer is created through the API first (fast and
 * reliable); only the login itself goes through the UI.
 */
test.describe('setup', () => {
  test('sign in a returning customer through the storefront', async ({ page, env, customer }) => {
    const account = new AccountPage(page, env.SUT_STOREFRONT_COUNTRY);
    await account.goto();
    await account.login(customer.email, customer.password);
    await expect(account.overview).toBeVisible();
    await mkdir(path.dirname(STORAGE_STATE.customer), { recursive: true });
    await page.context().storageState({ path: STORAGE_STATE.customer });
    await writeFile(
      STORAGE_STATE.customerInfo,
      JSON.stringify({ id: customer.id, email: customer.email, password: customer.password }),
    );
  });

  test('sign in the admin through the dashboard', async ({ page, env }) => {
    const login = new AdminLoginPage(page, env.SUT_ADMIN_URL);
    await login.goto();
    await login.login(env.SUT_ADMIN_EMAIL, env.SUT_ADMIN_PASSWORD);
    await expect(page).toHaveURL(/\/app\/orders/);
    await mkdir(path.dirname(STORAGE_STATE.admin), { recursive: true });
    await page.context().storageState({ path: STORAGE_STATE.admin });
  });
});
