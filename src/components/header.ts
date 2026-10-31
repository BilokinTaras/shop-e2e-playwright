import type { Locator, Page } from '@playwright/test';

/** Top navigation of the storefront. */
export class Header {
  readonly cartLink: Locator;
  readonly accountLink: Locator;
  readonly storeLink: Locator;
  readonly menuButton: Locator;
  readonly searchButton: Locator;

  constructor(private readonly page: Page) {
    this.cartLink = page.getByTestId('nav-cart-link');
    this.accountLink = page.getByTestId('nav-account-link');
    this.storeLink = page.getByTestId('nav-store-link');
    this.menuButton = page.getByTestId('nav-menu-button');
    this.searchButton = page.getByTestId('nav-search-button');
  }

  async openCart(): Promise<void> {
    await this.cartLink.click();
    await this.page.waitForURL(/\/cart$/);
  }

  async openAccount(): Promise<void> {
    await this.accountLink.click();
  }
}
