import { HomePage } from '../../src/pages/storefront';
import { expect, test } from '../../src/fixtures';

/**
 * Seed for Playwright Test Agents (planner, generator, healer): the agents start every exploration
 * from this test, so it uses the project's own fixtures and lands on a ready storefront.
 * It also runs as a regular test, which keeps the seed itself from rotting.
 */
test.describe('Agent seed', { tag: '@e2e' }, () => {
  test('storefront home is ready for exploration', async ({ page, env }) => {
    await new HomePage(page, env.SUT_STOREFRONT_COUNTRY).goto();
    await expect(page.getByTestId('product-wrapper').first()).toBeVisible();
  });
});
