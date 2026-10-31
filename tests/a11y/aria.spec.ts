import { HomePage, ProductPage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';

/**
 * ARIA snapshots pin the accessible structure (roles, names, nesting) of key components. They catch
 * changes a screenshot cannot: a renamed button, a lost label, a link turned into a div.
 * The nested button > link in the header is a known defect (A11Y-004) and is part of the snapshot on
 * purpose: when it is fixed, this test fails and the snapshot is updated deliberately.
 */
test.describe('ARIA structure', { tag: '@a11y' }, () => {
  test('header navigation', async ({ page, env }) => {
    const country = env.SUT_STOREFRONT_COUNTRY;
    await new HomePage(page, country).goto();
    await expect(page.getByRole('navigation').first()).toMatchAriaSnapshot(`
      - navigation:
        - button "Menu"
        - link "Medusa Store":
          - /url: /${country}
        - link "Search products":
          - /url: /${country}/search
        - link "Account":
          - /url: /${country}/account
        - button /Cart \\(\\d+\\)/:
          - link /Cart \\(\\d+\\)/:
            - /url: /${country}/cart
    `);
  });

  test('product card on the home page', async ({ page, env }) => {
    await new HomePage(page, env.SUT_STOREFRONT_COUNTRY).goto();
    await expect(page.getByTestId('product-wrapper').filter({ hasText: 'QA Mug' })).toMatchAriaSnapshot(`
      - img "QA Mug"
      - paragraph: QA Mug
      - paragraph: €12.50
    `);
  });

  test('variant picker exposes sizes as a labelled radio group', async ({ page, env }) => {
    await new ProductPage(page, env.SUT_STOREFRONT_COUNTRY).goto('qa-tee');
    await expect(page.getByRole('group', { name: 'Select Size' })).toMatchAriaSnapshot(`
      - group "Select Size":
        - radio "L"
        - radio "M"
        - radio "S"
    `);
  });
});
