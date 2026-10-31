import { AccountPage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';
import { TEST_PASSWORD, uniqueEmail } from '../../src/data/factories';

test.describe('Customer account', { tag: '@e2e' }, () => {
  test('register, sign out, sign back in', { tag: '@mobile' }, async ({ page, env, faker, store }) => {
    const account = new AccountPage(page, env.SUT_STOREFRONT_COUNTRY);
    const person = {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      email: uniqueEmail('qa-ui'),
      password: TEST_PASSWORD,
    };

    await test.step('register through the UI', async () => {
      await account.goto();
      await account.openRegister();
      await account.register(person);
      await expect(account.overview).toBeVisible();
      await expect(account.customerEmail).toHaveText(person.email);
    });

    await test.step('the new customer exists in the Store API', async ({}) => {
      const token = await new (await import('../../src/api/auth-client')).AuthClient(
        page.request,
        env.SUT_BACKEND_URL,
      ).login('customer', person.email, person.password);
      expect((await store.asCustomer(token).me()).first_name).toBe(person.firstName);
    });

    await test.step('sign out returns to the login form', async () => {
      await account.logout();
      await expect(account.loginPage).toBeVisible();
    });

    await test.step('sign back in', async () => {
      await account.login(person.email, person.password);
      await expect(account.overview).toBeVisible();
    });
  });

  test('wrong password shows an error and keeps the customer signed out', async ({ page, env, customer }) => {
    const account = new AccountPage(page, env.SUT_STOREFRONT_COUNTRY);
    await account.goto();
    await account.login(customer.email, 'definitely-wrong');
    await expect(account.loginError).toBeVisible();
    await expect(account.overview).toBeHidden();
  });
});
