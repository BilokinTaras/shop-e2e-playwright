import { expect } from '@playwright/test';
import type { z } from 'zod';

import type { RawResponse } from '../api/base-client';
import { CompleteCartSchema, MedusaErrorSchema, type Order } from '../schemas/store';

/** Asserts that a body matches a zod schema and returns the typed value. */
export function expectSchema<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const parsed = schema.safeParse(body);
  expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true);
  return parsed.data as z.infer<S>;
}

/** Asserts a Medusa error response: status, error body shape, optional type and message pattern. */
export function expectMedusaError(
  res: RawResponse,
  status: number,
  expected: { type?: string; message?: RegExp } = {},
): void {
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  const error = expectSchema(MedusaErrorSchema, res.body);
  if (expected.type !== undefined) expect(error.type).toBe(expected.type);
  if (expected.message !== undefined) expect(error.message).toMatch(expected.message);
}

/** Asserts that completing a cart produced an order (not a cart with an error) and returns it. */
export function expectOrder(result: z.infer<typeof CompleteCartSchema>): Order {
  expect(result.type, JSON.stringify(result).slice(0, 500)).toBe('order');
  return (result as { type: 'order'; order: Order }).order;
}
