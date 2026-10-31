import type { Locator, Page } from '@playwright/test';

/**
 * Totals block shared by the cart and checkout pages. Each amount carries its raw value in a
 * `data-value` attribute, so tests compare numbers with the API instead of parsing formatted text.
 */
export class CartSummary {
  readonly subtotal: Locator;
  readonly shipping: Locator;
  readonly discount: Locator;
  readonly taxes: Locator;
  readonly total: Locator;

  constructor(scope: Page | Locator) {
    this.subtotal = scope.getByTestId('cart-subtotal').first();
    this.shipping = scope.getByTestId('cart-shipping').first();
    this.discount = scope.getByTestId('cart-discount').first();
    this.taxes = scope.getByTestId('cart-taxes').first();
    this.total = scope.getByTestId('cart-total').first();
  }

  static async valueOf(amount: Locator): Promise<number> {
    return Number(await amount.getAttribute('data-value'));
  }
}
