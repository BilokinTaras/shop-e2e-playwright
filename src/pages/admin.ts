import type { Locator, Page } from '@playwright/test';

/** Medusa Admin dashboard (served by the backend under /app). Locators follow its accessible names. */
abstract class AdminPage {
  constructor(
    protected readonly page: Page,
    protected readonly adminUrl: string,
  ) {}

  protected async open(p: string): Promise<void> {
    await this.page.goto(`${this.adminUrl}${p}`);
  }
}

export class AdminLoginPage extends AdminPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(page: Page, adminUrl: string) {
    super(page, adminUrl);
    this.email = page.getByPlaceholder('Email');
    this.password = page.getByPlaceholder('Password');
    this.submit = page.getByRole('button', { name: 'Continue with Email' });
  }

  async goto(): Promise<void> {
    await this.open('/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }
}

/** Create-product wizard: Details → Organize → Variants, then Publish. */
export class AdminProductCreatePage extends AdminPage {
  readonly form: Locator;
  readonly title: Locator;
  readonly handle: Locator;
  readonly continueButton: Locator;
  readonly publishButton: Locator;

  constructor(page: Page, adminUrl: string) {
    super(page, adminUrl);
    // A11Y-001: Medusa 2.22.2 mounts this wizard twice and each copy marks the other aria-hidden,
    // so nothing inside is reachable by role. Locators therefore use field names and button text,
    // and target the last copy, which is the one on top.
    this.form = page
      .locator('form')
      .filter({ has: page.locator('input[name="title"]') })
      .last();
    this.title = this.form.locator('input[name="title"]');
    this.handle = this.form.locator('input[name="handle"]');
    this.continueButton = page.locator('button', { hasText: /^Continue$/ }).last();
    this.publishButton = page.locator('button', { hasText: /^Publish$/ }).last();
  }

  async goto(): Promise<void> {
    await this.open('/products/create');
  }

  /** Creates a product with a default variant and returns the ID from the product page URL. */
  async createSimpleProduct(title: string, handle: string): Promise<string> {
    await this.title.fill(title);
    await this.handle.fill(handle);
    await this.continueButton.click(); // → Organize
    await this.continueButton.click(); // → Variants
    await this.publishButton.click();
    await this.page.waitForURL(/\/app\/products\/prod_[A-Z0-9]+/);
    return /\/products\/(prod_[A-Z0-9]+)/.exec(this.page.url())?.[1] ?? '';
  }
}

/** Create-promotion wizard: Type → Details → Campaign. */
export class AdminPromotionCreatePage extends AdminPage {
  readonly continueButton: Locator;

  constructor(page: Page, adminUrl: string) {
    super(page, adminUrl);
    this.continueButton = page.getByRole('button', { name: 'Continue' });
  }

  async goto(): Promise<void> {
    await this.open('/promotions/create');
  }

  /** Creates an active "Percentage off order" code and returns the promotion ID from the URL. */
  async createPercentageOffOrder(code: string, percent: number): Promise<string> {
    await this.page.getByRole('radio', { name: /Percentage off order/ }).click();
    await this.continueButton.click();
    await this.page.getByRole('radio', { name: /^Active/ }).click();
    await this.page.getByRole('textbox', { name: 'Code' }).fill(code);
    await this.page.getByRole('spinbutton', { name: 'Promotion Value' }).fill(String(percent));
    await this.continueButton.click(); // → Campaign
    await this.page.getByRole('button', { name: /^(Save|Create|Publish)/ }).click();
    await this.page.waitForURL(/\/app\/promotions\/promo_[A-Z0-9]+/);
    return /\/promotions\/(promo_[A-Z0-9]+)/.exec(this.page.url())?.[1] ?? '';
  }
}
