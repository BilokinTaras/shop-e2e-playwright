import { createHash, randomUUID } from 'node:crypto';

import { Faker, en } from '@faker-js/faker';

import type { Address } from '../api/store-client';

/**
 * Faker seeded from the test title: the same test produces the same names and addresses on every
 * run, which makes failures reproducible. Uniqueness (emails, codes, handles) comes from a random
 * suffix, so parallel workers and repeated runs never collide.
 */
export function seededFaker(testTitle: string): Faker {
  const faker = new Faker({ locale: [en] });
  faker.seed(createHash('sha256').update(testTitle).digest().readUInt32BE(0));
  return faker;
}

export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

export function uniqueEmail(prefix = 'qa'): string {
  return `${prefix}-${uniqueSuffix()}@example.com`;
}

export function uniqueCode(prefix = 'QA'): string {
  return `${prefix}-${uniqueSuffix().toUpperCase()}`;
}

/** A password that satisfies typical rules; test-only. */
export const TEST_PASSWORD = 'Qa-test-password-1';

export function address(faker: Faker, countryCode: string): Address {
  return {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    address_1: faker.location.streetAddress(),
    city: faker.location.city(),
    postal_code: faker.location.zipCode('####'),
    country_code: countryCode,
    phone: faker.string.numeric(8),
  };
}
