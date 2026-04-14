import { CryptflareApiError } from './errors.js';

export type ClientOptions = {
  baseUrl: string;
  token: string;
  userAgent?: string;
};

type RequestOptions = {
  signal?: AbortSignal;
};

const DEFAULT_USER_AGENT = 'cryptflare-actions';

/**
 * Thin wrapper around native fetch (Node 20+ ships undici) for CryptFlare
 * bearer-token authenticated requests.
 *
 * Deliberately minimal: no retries, no proxy handling. If we ever need
 * HTTPS_PROXY / NO_PROXY support for GHES self-hosted runners, switch this
 * implementation to @actions/http-client (native fetch ignores proxy env
 * vars). Public surface stays the same so callers do not need to change.
 */
export class CryptflareClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(opts: ClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.headers = {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': opts.userAgent ?? DEFAULT_USER_AGENT,
    };
  }

  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  async request<T>(
    method: string,
    path: string,
    body: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    // Build RequestInit without undefined keys - exactOptionalPropertyTypes
    // rejects `body: undefined` / `signal: undefined` against fetch's types.
    const init: RequestInit = { method, headers: this.headers };
    if (body !== undefined) init.body = JSON.stringify(body);
    if (options?.signal) init.signal = options.signal;

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      // Network failure, DNS, TLS, timeout - surface the underlying cause.
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(`request to ${url} failed: ${cause}`);
    }

    const requestId = response.headers.get('x-request-id') ?? undefined;

    if (!response.ok) {
      throw await buildApiError(response, requestId);
    }

    // 204 No Content - return empty object typed as T.
    if (response.status === 204) return {} as T;

    const text = await response.text();
    if (!text) return {} as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`invalid JSON response from ${url}: ${text.slice(0, 200)}`);
    }
  }
}

async function buildApiError(
  response: Response,
  requestId: string | undefined,
): Promise<CryptflareApiError> {
  const status = response.status;
  const fallback = `HTTP ${status} ${response.statusText}`.trim();

  const text = await response.text().catch(() => '');
  if (!text) {
    return new CryptflareApiError({ status, message: fallback, requestId });
  }

  try {
    const parsed = JSON.parse(text) as { title?: unknown; detail?: unknown; code?: unknown };
    const detail = typeof parsed.detail === 'string' ? parsed.detail : undefined;
    const title = typeof parsed.title === 'string' ? parsed.title : undefined;
    const code = typeof parsed.code === 'string' ? parsed.code : undefined;
    return new CryptflareApiError({
      status,
      code,
      message: detail ?? title ?? fallback,
      requestId,
    });
  } catch {
    return new CryptflareApiError({
      status,
      message: `${fallback}: ${text.slice(0, 200)}`,
      requestId,
    });
  }
}
