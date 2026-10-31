import { existsSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

/**
 * Test configuration comes from the contract file written by shop-sut
 * (`../shop-sut/.generated/sut.env`). Variables already present in the
 * environment win, so CI can inject them directly.
 */
const DEFAULT_ENV_FILE = path.resolve(import.meta.dirname, '../../../shop-sut/.generated/sut.env');

const EnvSchema = z.object({
  SUT_MEDUSA_VERSION: z.string().min(1),
  SUT_BACKEND_URL: z.url(),
  SUT_ADMIN_URL: z.url(),
  SUT_STOREFRONT_URL: z.url(),
  SUT_STOREFRONT_COUNTRY: z.string().length(2),
  SUT_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  SUT_ADMIN_EMAIL: z.email(),
  SUT_ADMIN_PASSWORD: z.string().min(1),
  SUT_REGION_ID: z.string().startsWith('reg_'),
  SUT_REGION_CURRENCY: z.string().length(3),
  SUT_REGION_USD_ID: z.string().startsWith('reg_'),
  SUT_SALES_CHANNEL_ID: z.string().startsWith('sc_'),
  SUT_DOCKER_NETWORK: z.string().min(1),
});

export type SutEnv = z.infer<typeof EnvSchema>;

let cached: SutEnv | undefined;

export function loadEnv(): SutEnv {
  if (cached) return cached;
  const file = process.env.SUT_ENV_FILE ?? DEFAULT_ENV_FILE;
  if (!process.env.SUT_BACKEND_URL) {
    if (!existsSync(file)) {
      throw new Error(
        [
          `shop-sut contract file not found: ${file}`,
          'The shop is not running or was never bootstrapped. Start it with:',
          '  npm run sut:up      (same as: make -C ../shop-sut up)',
          'or point SUT_ENV_FILE to another sut.env.',
        ].join('\n'),
      );
    }
    // process.env keeps variables that are already set.
    process.loadEnvFile(file);
  }
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid shop-sut contract (${file}):\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
