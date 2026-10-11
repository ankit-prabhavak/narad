import type { ApiError } from '@narad/contracts';

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError | null,
  ) {
    super(body?.message ?? 'Something went wrong. Please try again.');
  }
}

let csrfToken: string | null = null;
export const clearCsrf = () => {
  csrfToken = null;
};

async function send(method: string, path: string, body?: unknown, token?: string | null) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers['x-csrf-token'] = token;

  const res = await fetch(`/api/v1${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
  const data: unknown = isJson ? await res.json() : undefined;
  if (!res.ok) throw new ApiRequestError(res.status, (data as ApiError | undefined) ?? null);
  return data;
}

async function getCsrf(): Promise<string | null> {
  if (!csrfToken) {
    const r = (await send('GET', '/auth/csrf')) as { csrfToken: string | null };
    csrfToken = r.csrfToken;
  }
  return csrfToken;
}

/** Calls the API. Unsafe methods get a CSRF token unless `csrf: false` (register, login). */
export async function api<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options: { csrf?: boolean } = {},
): Promise<T> {
  if (method === 'GET' || options.csrf === false) {
    return (await send(method, path, body)) as T;
  }
  try {
    return (await send(method, path, body, await getCsrf())) as T;
  } catch (err) {
    if (err instanceof ApiRequestError && err.body?.code === 'CSRF_FAILED') {
      clearCsrf();
      return (await send(method, path, body, await getCsrf())) as T;
    }
    throw err;
  }
}
