import { expectMedusaError, expectSchema } from '../../src/fixtures/assertions';
import { expect, test } from '../../src/fixtures';
import { ProductListSchema, RegionListSchema, RegionSchema } from '../../src/schemas/store';

test.describe('Store API · catalog and regions', { tag: '@api' }, () => {
  test('health endpoint answers 200', { tag: '@smoke' }, async ({ store }) => {
    const res = await store.raw('GET', '/health');
    expect(res.status).toBe(200);
  });

  test(
    'product list matches the schema and contains the QA products',
    { tag: '@smoke' },
    async ({ store }) => {
      const { products, count } = await store.listProducts({
        limit: 50,
        fields: 'id,handle,title,thumbnail,description',
      });
      expect(count).toBeGreaterThanOrEqual(3);
      expect(products.map((p) => p.handle)).toEqual(
        expect.arrayContaining(['qa-tee', 'qa-mug', 'qa-sold-out']),
      );
    },
  );

  test('limit and offset page through the catalog without overlap', async ({ store }) => {
    const first = await store.listProducts({
      limit: 2,
      offset: 0,
      order: 'handle',
      fields: 'id,handle,title',
    });
    const second = await store.listProducts({
      limit: 2,
      offset: 2,
      order: 'handle',
      fields: 'id,handle,title',
    });
    expect(first.products).toHaveLength(2);
    expect(first.limit).toBe(2);
    expect(second.offset).toBe(2);
    const firstIds = first.products.map((p) => p.id);
    expect(second.products.every((p) => !firstIds.includes(p.id))).toBe(true);
    expect(second.count).toBe(first.count);
  });

  test('limit=0 returns no products but the full count', async ({ store }) => {
    const page = await store.listProducts({ limit: 0, fields: 'id,handle,title' });
    expect(page.products).toHaveLength(0);
    expect(page.count).toBeGreaterThan(0);
  });

  test('offset beyond the last product returns an empty page', async ({ store }) => {
    const { count } = await store.listProducts({ limit: 1, fields: 'id,handle,title' });
    const page = await store.listProducts({ offset: count, fields: 'id,handle,title' });
    expect(page.products).toHaveLength(0);
    expect(page.count).toBe(count);
  });

  test('non-numeric limit is rejected with a validation error', async ({ store }) => {
    const res = await store.raw('GET', '/store/products', { params: { limit: 'abc' } });
    expectMedusaError(res, 400, { type: 'invalid_data', message: /limit/ });
  });

  test('negative limit is rejected with 400, not a server error [BUG-E2E-001]', async ({ store }) => {
    test.fail(
      true,
      'BUG-E2E-001: negative limit/offset return 500 unknown_error instead of 400 invalid_data',
    );
    const res = await store.raw('GET', '/store/products', { params: { limit: -1 } });
    expectMedusaError(res, 400, { type: 'invalid_data' });
  });

  test('filter by handle returns exactly that product', async ({ store }) => {
    const { products } = await store.listProducts({ handle: 'qa-mug', fields: 'id,handle,title' });
    expect(products).toHaveLength(1);
    expect(products[0]?.title).toBe('QA Mug');
  });

  test('full-text search q finds a product by title', async ({ store }) => {
    const { products } = await store.listProducts({ q: 'QA Tee', fields: 'id,handle,title' });
    expect(products.map((p) => p.handle)).toContain('qa-tee');
  });

  test('sorting by title returns titles in ascending order', async ({ store }) => {
    const { products } = await store.listProducts({ order: 'title', limit: 50, fields: 'id,handle,title' });
    const titles = products.map((p) => p.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
  });

  test('unknown product id returns 404 not_found', async ({ store }) => {
    const res = await store.raw('GET', '/store/products/prod_does_not_exist');
    expectMedusaError(res, 404, { type: 'not_found', message: /prod_does_not_exist/ });
  });

  test('calculated price follows the region currency', async ({ store, env }) => {
    const eur = await store.productByHandle('qa-tee', env.SUT_REGION_ID);
    const usd = await store.productByHandle('qa-tee', env.SUT_REGION_USD_ID);
    expect(eur.variants?.[0]?.calculated_price).toMatchObject({
      calculated_amount: 25,
      currency_code: 'eur',
    });
    expect(usd.variants?.[0]?.calculated_price).toMatchObject({
      calculated_amount: 30,
      currency_code: 'usd',
    });
  });

  test('sold-out product reports zero inventory', async ({ store, env }) => {
    const product = await store.productByHandle('qa-sold-out', env.SUT_REGION_ID);
    expect(product.variants?.[0]).toMatchObject({
      inventory_quantity: 0,
      allow_backorder: false,
      manage_inventory: true,
    });
  });

  test(
    'regions list exposes both seeded regions with their currencies',
    { tag: '@smoke' },
    async ({ store }) => {
      const { regions } = await store.listRegions();
      const byName = Object.fromEntries(regions.map((r) => [r.name, r]));
      expect(byName.Europe?.currency_code).toBe('eur');
      expect(byName['QA North America']?.currency_code).toBe('usd');
      expect(byName['QA North America']?.countries?.map((c) => c.iso_2).sort()).toEqual(['ca', 'us']);
    },
  );

  test('region by id matches the contract and the schema', async ({ store, env }) => {
    const res = await store.raw('GET', `/store/regions/${env.SUT_REGION_ID}`);
    expect(res.status).toBe(200);
    const region = expectSchema(RegionSchema, (res.body as { region: unknown }).region);
    expect(region.currency_code).toBe(env.SUT_REGION_CURRENCY);
  });

  test('unknown region id returns 404', async ({ store }) => {
    expectMedusaError(await store.raw('GET', '/store/regions/reg_nope'), 404, { type: 'not_found' });
  });

  test('list schemas reject a malformed envelope (schema self-check)', () => {
    expect(ProductListSchema.safeParse({ products: [], count: -1, limit: 0, offset: 0 }).success).toBe(false);
    expect(RegionListSchema.safeParse({ regions: 'x', count: 0 }).success).toBe(false);
  });
});
