import { defineConfig, devices } from '@playwright/test';

import { loadEnv } from './src/config/env';

const env = loadEnv();
const isCI = Boolean(process.env.CI);
/** Visual tests run only inside the official Linux image (scripts/visual-docker.sh sets PW_VISUAL=1). */
const runVisual = process.env.PW_VISUAL === '1';

export const STORAGE_STATE = {
  customer: '.auth/customer.json',
  customerInfo: '.auth/customer-info.json',
  admin: '.auth/admin.json',
} as const;

/** Browser projects run the end-to-end suite; API, visual and a11y suites have their own projects. */
const e2e = { testDir: './tests/e2e', dependencies: ['setup'] };

const visualProject = {
  // Baselines come only from the official Playwright Linux image, see docs/adr/ADR-003-visual-baselines.md.
  name: 'visual',
  testDir: './tests/visual',
  use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
};

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries only in CI, and only to collect a trace: a test that passes on retry is reported as flaky.
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 7_500 },
  reporter: isCI
    ? [['blob'], ['github'], ['list']]
    : [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: env.SUT_STOREFRONT_URL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'setup',
      testDir: './tests/setup',
      testMatch: /.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: { baseURL: env.SUT_BACKEND_URL },
    },
    { name: 'chromium', ...e2e, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', ...e2e, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', ...e2e, use: { ...devices['Desktop Safari'] } },
    {
      name: 'mobile-chrome',
      ...e2e,
      grep: /@mobile/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      ...e2e,
      grep: /@mobile/,
      use: { ...devices['iPhone 15'] },
    },
    ...(runVisual ? [visualProject] : []),
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
