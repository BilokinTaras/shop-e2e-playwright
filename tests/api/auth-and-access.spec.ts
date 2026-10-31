import { expectMedusaError } from '../../src/fixtures/assertions';
import { expect, test } from '../../src/fixtures';
import { TEST_PASSWORD, uniqueEmail } from '../../src/data/factories';

test.describe('Auth, customer profile and access control', { tag: '@api' }, () => {
  test('registered customer can log in and read their profile', { tag: '@smoke' }, async ({ customer }) => {
    const me = await customer.store.me();
    expect(me).toMatchObject({ id: customer.id, email: customer.email, has_account: true });
  });

  test('profile update persists', async ({ customer }) => {
    await customer.store.updateMe({ first_name: 'Renamed' });
    expect((await customer.store.me()).first_name).toBe('Renamed');
  });

  test('new customer has no orders', async ({ customer }) => {
    const { orders, count } = await customer.store.listOrders();
    expect(orders).toHaveLength(0);
    expect(count).toBe(0);
  });

  test('wrong password is rejected with 401', async ({ auth, customer }) => {
    const res = await auth.raw('POST', '/auth/customer/emailpass', {
      data: { email: customer.email, password: 'wrong-password' },
    });
    expectMedusaError(res, 401, { type: 'unauthorized', message: /Invalid email or password/ });
  });

  test('registering an existing email with another password is refused', async ({ auth, customer }) => {
    const res = await auth.raw('POST', '/auth/customer/emailpass/register', {
      data: { email: customer.email, password: 'Other-pass-9' },
    });
    expectMedusaError(res, 401, { message: /already exists/ });
  });

  test('registration without a password is a validation error [BUG-E2E-003]', async ({ auth }) => {
    test.fail(
      true,
      'BUG-E2E-003: returns 401 unauthorized "Password should be a string" instead of 400 invalid_data',
    );
    const res = await auth.raw('POST', '/auth/customer/emailpass/register', {
      data: { email: uniqueEmail() },
    });
    expectMedusaError(res, 400, { type: 'invalid_data' });
  });

  test('registration rejects a string that is not an email [BUG-E2E-002]', async ({ auth }) => {
    test.fail(true, 'BUG-E2E-002: /auth/customer/emailpass/register issues a token for "not-an-email"');
    const res = await auth.raw('POST', '/auth/customer/emailpass/register', {
      data: { email: `not-an-email-${Date.now()}`, password: TEST_PASSWORD },
    });
    expectMedusaError(res, 400, { type: 'invalid_data' });
  });

  test('customer profile with an invalid email is rejected', async ({ auth, store }) => {
    const token = await auth.registerCustomer(uniqueEmail(), TEST_PASSWORD);
    const res = await store.asCustomer(token).raw('POST', '/store/customers', {
      data: { email: 'not-an-email', first_name: 'A', last_name: 'B' },
    });
    expectMedusaError(res, 400, { type: 'invalid_data', message: /email/i });
  });

  test('Store API without a publishable key is refused', { tag: '@smoke' }, async ({ request, env }) => {
    const res = await request.get(`${env.SUT_BACKEND_URL}/store/products`);
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({
      type: 'not_allowed',
      message: expect.stringContaining('x-publishable-api-key'),
    });
  });

  test('Store API with an unknown publishable key is refused', async ({ request, env }) => {
    const res = await request.get(`${env.SUT_BACKEND_URL}/store/products`, {
      headers: { 'x-publishable-api-key': 'pk_unknown' },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toMatchObject({ type: 'not_allowed' });
  });

  test('profile without a token is 401', async ({ store }) => {
    const res = await store.raw('GET', '/store/customers/me');
    expect(res.status).toBe(401);
  });

  test('a forged bearer token is 401', async ({ store }) => {
    const res = await store.asCustomer('abc.def.ghi').raw('GET', '/store/customers/me');
    expect(res.status).toBe(401);
  });

  test('a customer token cannot use admin routes', async ({ request, env, customer }) => {
    const res = await request.get(`${env.SUT_BACKEND_URL}/admin/products`, {
      headers: { authorization: `Bearer ${customer.token}` },
    });
    expect(res.status()).toBe(401);
  });

  test('admin routes without a token are 401', async ({ request, env }) => {
    const res = await request.get(`${env.SUT_BACKEND_URL}/admin/orders`);
    expect(res.status()).toBe(401);
  });

  test('admin can create a promotion and read it back', async ({ admin, promotions }) => {
    const { id, code } = await promotions.create({ type: 'percentage', value: 15 });
    const promo = await admin.getPromotion(id);
    expect(promo).toMatchObject({
      code,
      status: 'active',
      application_method: { type: 'percentage', value: 15 },
    });
  });
});
