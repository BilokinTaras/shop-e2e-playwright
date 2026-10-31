import type { Locator, Page } from '@playwright/test';

/** A product tile on listing pages (home, store, related products). */
export class ProductCard {
  readonly root: Locator;
  readonly title: Locator;
  readonly price: Locator;

  constructor(root: Locator) {
    this.root = root;
    this.title = root.getByTestId('product-title');
    this.price = root.getByTestId('price').first();
  }

  static all(page: Page): Locator {
    return page.getByTestId('product-wrapper');
  }

  static byTitle(page: Page, title: string): ProductCard {
    return new ProductCard(
      ProductCard.all(page).filter({
        has: page.getByTestId('product-title').getByText(title, { exact: true }),
      }),
    );
  }
}
