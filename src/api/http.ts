/** Thin fetch wrapper: JSON in/out, typed errors, schema validation of responses. */
import type { z } from 'zod';

const BASE = import.meta.env.VITE_API_BASE ?? '/petclinic/api';

/** Any non-2xx response, or a response that violates the expected contract. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Raised by the client (not the server) when an edit would overwrite someone else's change.
 * The API has no ETag/version (README "API problems" #6), so this is a best-effort workaround.
 */
export class ConflictError extends ApiError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

/** The backend's error body shape is not consistent (README "API problems" #5), so we probe known keys. */
function messageFrom(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    for (const key of ['message', 'detail', 'title', 'exMessage']) {
      const v = (body as Record<string, unknown>)[key];
      if (typeof v === 'string' && v) return v;
    }
  }
  return fallback;
}

async function send(path: string, method: string, body?: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the clinic server. Check that the backend is running.');
  }
  // 204 No Content (PUT/DELETE) and empty bodies are valid.
  const text = await res.text();
  const parsed: unknown = text ? safeJson(text) : undefined;
  if (!res.ok) throw new ApiError(res.status, messageFrom(parsed, `Request failed (${res.status})`), parsed);
  return parsed;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Request whose response body is validated against `schema`. */
export async function requestJson<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  init: { method?: string; body?: unknown } = {},
): Promise<z.infer<S>> {
  const data = await send(path, init.method ?? 'GET', init.body);
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError(502, 'Unexpected response from the clinic server', result.error.issues);
  return result.data;
}

/** Request whose response body is ignored (e.g. 204 on PUT). */
export async function requestVoid(path: string, init: { method: string; body?: unknown }): Promise<void> {
  await send(path, init.method, init.body);
}
