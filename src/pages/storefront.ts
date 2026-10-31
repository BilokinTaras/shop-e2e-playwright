import type { Locator, Page } from '@playwright/test';

import { CartSummary } from '../components/cart-summary';
import { Header } from '../components/header';
import { ProductCard } from '../components/product-card';

/** Base for storefront pages: every URL is prefixed with the country code from the contract. */
abstract class StorefrontPage {
  readonly header: Header;

  constructor(
    protected readonly page: Page,
    protected readonly country: string,
  ) {
    this.header = new Header(page);
  }

  protected path(p: string): string {
    return `/${this.country}${p}`;
  }

  /**
   * Waits until React has hydrated the element: React attaches `__reactProps$…` to DOM nodes it
   * manages. Clicking server-rendered markup before that does nothing in some browsers (seen on WebKit).
   */
  protected async waitForHydration(testId: string): Promise<void> {
    await this.page.waitForFunction((id) => {
      const el = document.querySelector(`[data-testid="${id}"]`);
      return el !== null && Object.keys(el).some((k) => k.startsWith('__reactProps$'));
    }, testId);
  }

  /** Number of items shown in the header cart link, e.g. "Cart (2)". */
  async cartCount(): Promise<number> {
    const text = (await this.header.cartLink.textContent()) ?? '';
    return Number(/\((\d+)\)/.exec(text)?.[1] ?? 0);
  }
}

export class HomePage extends StorefrontPage {
  readonly productCards: Locator;

  constructor(page: Page, country: string) {
    super(page, country);
    this.productCards = ProductCard.all(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path(''));
  }
}

export class StorePage extends StorefrontPage {
  readonly title: Locator;
  readonly productCards: Locator;

  constructor(page: Page, country: string) {
    super(page, country);
    this.title = page.getByTestId('store-page-title');
    this.productCards = ProductCard.all(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path('/store'));
  }

  card(title: string): ProductCard {
    return ProductCard.byTitle(this.page, title);
  }
}

export class ProductPage extends StorefrontPage {
  readonly title: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;
  readonly availability: Locator;

  constructor(page: Page, country: string) {
    super(page, country);
    this.title = page.getByTestId('product-container').getByTestId('product-title');
    this.price = page.getByTestId('product-price').first();
    this.addToCartButton = page.getByTestId('add-product-button');
    this.availability = page.getByTestId('product-availability');
  }

  async goto(handle: string): Promise<void> {
    await this.page.goto(this.path(`/products/${handle}`));
    await this.waitForHydration('add-product-button');
  }

  optionButton(value: string): Locator {
    return this.page.getByTestId('option-button').filter({ hasText: new RegExp(`^${value}$`) });
  }

  /**
   * Selecting an option re-renders the product actions and rewrites `?v_id=` in the URL. Clicking
   * "Add to cart" during that re-render was lost on mobile WebKit, so wait until both have settled.
   */
  async selectOption(value: string): Promise<void> {
    const option = this.optionButton(value);
    await option.click();
    await option.and(this.page.locator('.border-ui-border-interactive')).waitFor();
    await this.page.waitForURL(/[?&]v_id=variant_/);
  }

  /** Clicks "Add to cart" and waits until the header shows one more item (the client refresh is done). */
  async addToCart(): Promise<void> {
    const before = await this.cartCount();
    await this.addToCartButton.click();
    await this.header.cartLink.filter({ hasText: `(${before + 1})` }).waitFor();
  }
}

export class CartPage extends StorefrontPage {
  readonly rows: Locator;
  readonly emptyMessage: Locator;
  readonly checkoutButton: Locator;
  readonly summary: CartSummary;

  constructor(page: Page, country: string) {
    super(page, country);
    this.rows = page.getByTestId('product-row');
    this.emptyMessage = page.getByTestId('empty-cart-message');
    this.checkoutButton = page.getByTestId('checkout-button');
    this.summary = new CartSummary(page);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path('/cart'));
  }

  row(productTitle: string): Locator {
    return this.rows.filter({ hasText: productTitle });
  }

  async setQuantity(productTitle: string, quantity: number): Promise<void> {
    await this.row(productTitle).getByTestId('product-select-button').selectOption(String(quantity));
  }

  async remove(productTitle: string): Promise<void> {
    // BUG-E2E-006: the starter passes data-testid="product-delete-button" to a component that drops it,
    // and the icon-only button has no accessible name. The row has exactly one button: the delete button.
    await this.row(productTitle).getByRole('button').click();
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
    await this.page.waitForURL(/\/checkout/);
  }
}

export interface CheckoutAddress {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  postalCode: string;
  city: string;
  countryCode: string;
}

export class CheckoutPage extends StorefrontPage {
  readonly summary: CartSummary;
  readonly addDiscountButton: Locator;
  readonly discountInput: Locator;
  readonly discountApplyButton: Locator;
  readonly discountError: Locator;
  readonly discountRow: Locator;
  readonly removeDiscountButton: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page, country: string) {
    super(page, country);
    this.summary = new CartSummary(page);
    this.addDiscountButton = page.getByTestId('add-discount-button');
    this.discountInput = page.getByTestId('discount-input');
    this.discountApplyButton = page.getByTestId('discount-apply-button');
    this.discountError = page.getByTestId('discount-error-message');
    this.discountRow = page.getByTestId('discount-row');
    this.removeDiscountButton = page.getByTestId('remove-discount-button');
    this.placeOrderButton = page.getByTestId('submit-order-button');
  }

  async goto(step: 'address' | 'delivery' | 'payment' | 'review' = 'address'): Promise<void> {
    await this.page.goto(this.path(`/checkout?step=${step}`));
  }

  async fillAddress(a: CheckoutAddress): Promise<void> {
    await this.page.getByTestId('shipping-first-name-input').fill(a.firstName);
    await this.page.getByTestId('shipping-last-name-input').fill(a.lastName);
    await this.page.getByTestId('shipping-address-input').fill(a.address);
    await this.page.getByTestId('shipping-postal-code-input').fill(a.postalCode);
    await this.page.getByTestId('shipping-city-input').fill(a.city);
    await this.page.getByTestId('shipping-country-select').selectOption(a.countryCode);
    const email = this.page.getByTestId('shipping-email-input');
    if (await email.isEditable()) await email.fill(a.email);
  }

  async continueToDelivery(): Promise<void> {
    await this.page.getByTestId('submit-address-button').click();
    await this.page.waitForURL(/step=delivery/);
  }

  async chooseDelivery(name: string | RegExp): Promise<void> {
    await this.page.getByTestId('delivery-option-radio').filter({ hasText: name }).first().click();
  }

  async continueToPayment(): Promise<void> {
    await this.page.getByTestId('submit-delivery-option-button').click();
    await this.page.waitForURL(/step=payment/);
  }

  async chooseManualPayment(): Promise<void> {
    await this.page.getByRole('radio', { name: /manual payment/i }).click();
  }

  async continueToReview(): Promise<void> {
    await this.page.getByTestId('submit-payment-button').click();
    await this.page.waitForURL(/step=review/);
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderButton.click();
    await this.page.waitForURL(/\/order\/[^/]+\/confirmed/);
  }

  async applyDiscount(code: string): Promise<void> {
    if (await this.addDiscountButton.isVisible()) await this.addDiscountButton.click();
    await this.discountInput.fill(code);
    await this.discountApplyButton.click();
  }
}

export class OrderConfirmedPage extends StorefrontPage {
  readonly container: Locator;
  readonly orderId: Locator;
  readonly email: Locator;
  readonly summary: CartSummary;

  constructor(page: Page, country: string) {
    super(page, country);
    this.container = page.getByTestId('order-complete-container');
    this.orderId = page.getByTestId('order-id');
    this.email = page.getByTestId('order-email');
    this.summary = new CartSummary(page);
  }

  /** The order ID from the confirmation URL, e.g. /dk/order/order_01.../confirmed. */
  idFromUrl(): string {
    return /\/order\/([^/]+)\/confirmed/.exec(this.page.url())?.[1] ?? '';
  }
}

export class AccountPage extends StorefrontPage {
  readonly loginPage: Locator;
  readonly registerPage: Locator;
  /** Visible on desktop and mobile layouts once a customer is signed in. */
  readonly signedIn: Locator;
  readonly loginError: Locator;
  readonly overview: Locator;
  readonly customerEmail: Locator;
  readonly logoutButton: Locator;
  readonly ordersLink: Locator;
  readonly orderCards: Locator;
  readonly noOrders: Locator;

  constructor(page: Page, country: string) {
    super(page, country);
    this.loginPage = page.getByTestId('login-page');
    this.signedIn = page.getByTestId('logout-button').filter({ visible: true });
    this.registerPage = page.getByTestId('register-page');
    this.loginError = page.getByTestId('login-error-message');
    this.overview = page.getByTestId('overview-page-wrapper');
    this.customerEmail = page.getByTestId('customer-email');
    // Desktop and mobile navigation both render this button; only one is visible.
    this.logoutButton = page.getByTestId('logout-button').filter({ visible: true });
    this.ordersLink = page.getByTestId('orders-link').filter({ visible: true });
    this.orderCards = page.getByTestId('order-card');
    this.noOrders = page.getByTestId('no-orders-container');
  }

  async goto(subpath = ''): Promise<void> {
    await this.page.goto(this.path(`/account${subpath}`));
  }

  async login(email: string, password: string): Promise<void> {
    await this.loginPage.getByTestId('email-input').fill(email);
    await this.loginPage.getByTestId('password-input').fill(password);
    await this.loginPage.getByTestId('sign-in-button').click();
  }

  async openRegister(): Promise<void> {
    await this.loginPage.getByTestId('register-button').click();
  }

  async register(c: { firstName: string; lastName: string; email: string; password: string }): Promise<void> {
    await this.registerPage.getByTestId('first-name-input').fill(c.firstName);
    await this.registerPage.getByTestId('last-name-input').fill(c.lastName);
    await this.registerPage.getByTestId('email-input').fill(c.email);
    await this.registerPage.getByTestId('password-input').fill(c.password);
    await this.registerPage.getByTestId('register-button').click();
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
