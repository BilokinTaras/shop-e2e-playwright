import type { APIRequestContext } from '@playwright/test';
import type { z } from 'zod';

type Query = Record<string, string | number | boolean | string[] | undefined>;

export interface RequestOptions {
  params?: Query;
  data?: unknown;
  headers?: Record<string, string>;
}

export interface RawResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/** Thrown when a call meant to succeed does not: carries the request and response for the report. */
export class ApiCallError extends Error {
  constructor(
    message: string,
    readonly detail: { method: string; path: string; status: number; body: unknown },
  ) {
    super(
      `${message}\n${detail.method} ${detail.path} -> ${detail.status}\n${JSON.stringify(detail.body, null, 2).slice(0, 2000)}`,
    );
  }
}

function toSearchParams(params: Query | undefined): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value))
      value.forEach((v) => {
        search.append(`${key}[]`, v);
      });
    else search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export abstract class BaseClient {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly baseUrl: string,
    protected readonly defaultHeaders: Record<string, string> = {},
  ) {}

  /** Any call, any status: for negative tests that assert on the status and error body themselves. */
  async raw(method: string, path: string, options: RequestOptions = {}): Promise<RawResponse> {
    const response = await this.request.fetch(`${this.baseUrl}${path}${toSearchParams(options.params)}`, {
      method,
      headers: { ...this.defaultHeaders, ...options.headers },
      data: options.data,
      failOnStatusCode: false,
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON body (HTML error page, empty 204): keep the text.
    }
    return { status: response.status(), body, headers: response.headers() };
  }

  /** A call expected to succeed: checks the status and parses the body with the given schema. */
  protected async call<S extends z.ZodType>(
    schema: S,
    method: string,
    path: string,
    options: RequestOptions = {},
    expectedStatus = 200,
  ): Promise<z.infer<S>> {
    const res = await this.raw(method, path, options);
    if (res.status !== expectedStatus) {
      throw new ApiCallError(`Expected HTTP ${expectedStatus}`, {
        method,
        path,
        status: res.status,
        body: res.body,
      });
    }
    const parsed = schema.safeParse(res.body);
    if (!parsed.success) {
      throw new ApiCallError(`Response does not match schema: ${parsed.error.message}`, {
        method,
        path,
        status: res.status,
        body: res.body,
      });
    }
    return parsed.data;
  }
}
