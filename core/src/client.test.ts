import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CryptflareClient } from './client.js';
import { CryptflareApiError } from './errors.js';

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

describe('CryptflareClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('sends a GET with bearer auth and default headers', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });

    const result = await client.get<{ ok: boolean }>('/v1/auth/whoami');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.cryptflare.com/v1/auth/whoami');
    expect(init?.method).toBe('GET');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer cf_tok');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
    expect(headers['User-Agent']).toBe('cryptflare-actions');
    expect(init?.body).toBeUndefined();
  });

  it('normalizes trailing slashes on the base URL', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const client = new CryptflareClient({
      baseUrl: 'https://api.cryptflare.com///',
      token: 'cf_tok',
    });
    await client.get('/v1/ping');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.cryptflare.com/v1/ping');
  });

  it('prefixes paths that do not start with a slash', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });
    await client.get('v1/ping');
    expect(fetchMock.mock.calls[0]![0]).toBe('https://api.cryptflare.com/v1/ping');
  });

  it('POSTs a JSON body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 'abc' }));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });

    const result = await client.post<{ id: string }>('/v1/secrets', { key: 'K', value: 'V' });

    expect(result).toEqual({ id: 'abc' });
    const init = fetchMock.mock.calls[0]![1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ key: 'K', value: 'V' }));
  });

  it('returns an empty object for 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });
    const result = await client.post('/v1/secrets/KEY/rotate', {});
    expect(result).toEqual({});
  });

  it('returns an empty object for a 200 with no body', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });
    const result = await client.get('/v1/health');
    expect(result).toEqual({});
  });

  it('throws CryptflareApiError with parsed problem+json on 4xx', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        403,
        { title: 'Forbidden', detail: 'Token lacks secrets:read', code: 'AUTH_INVALID_TOKEN' },
        { 'x-request-id': 'req_987' },
      ),
    );
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });

    await expect(client.get('/v1/secrets')).rejects.toMatchObject({
      name: 'CryptflareApiError',
      status: 403,
      code: 'AUTH_INVALID_TOKEN',
      message: 'Token lacks secrets:read',
      requestId: 'req_987',
    });
  });

  it('falls back to title when detail is missing', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { title: 'Not found' }));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });
    await expect(client.get('/v1/secrets/X')).rejects.toMatchObject({
      status: 404,
      message: 'Not found',
    });
  });

  it('falls back to HTTP status line when the body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>500</html>', { status: 500 }));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });
    const err = (await client.get('/v1/secrets').catch((e: unknown) => e)) as CryptflareApiError;
    expect(err).toBeInstanceOf(CryptflareApiError);
    expect(err.status).toBe(500);
    expect(err.message).toContain('500');
    expect(err.message).toContain('<html>500</html>');
  });

  it('surfaces network errors with the target URL', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });
    await expect(client.get('/v1/ping')).rejects.toThrow(
      /request to https:\/\/api\.cryptflare\.com\/v1\/ping failed: ECONNREFUSED/,
    );
  });

  it('throws a descriptive error for invalid JSON in a 2xx response', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{not json', { status: 200 }));
    const client = new CryptflareClient({ baseUrl: 'https://api.cryptflare.com', token: 'cf_tok' });
    await expect(client.get('/v1/ping')).rejects.toThrow(/invalid JSON response/);
  });

  it('honors a custom user agent', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
    const client = new CryptflareClient({
      baseUrl: 'https://api.cryptflare.com',
      token: 'cf_tok',
      userAgent: 'cryptflare-actions/login@0.1.0',
    });
    await client.get('/v1/ping');
    const headers = fetchMock.mock.calls[0]![1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('cryptflare-actions/login@0.1.0');
  });
});
