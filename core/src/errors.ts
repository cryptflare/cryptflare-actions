/**
 * Extracts a human-readable message from anything a catch clause can catch.
 *
 * `throw` can surface non-Error values (strings, objects, null, undefined),
 * so `error instanceof Error ? error.message : String(error)` is not enough -
 * `String(null)` produces "null", and thrown objects produce "[object Object]".
 * This helper handles every case we have seen in the wild.
 */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error == null) return 'unknown error';
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Thrown by CryptflareClient when the API returns a non-2xx response.
 * Carries the HTTP status and any RFC 9457 problem+json fields we can parse,
 * so callers (and core.setFailed) can surface actionable messages.
 */
export class CryptflareApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly requestId: string | undefined;

  constructor(params: {
    status: number;
    message: string;
    code?: string | undefined;
    requestId?: string | undefined;
  }) {
    super(params.message);
    this.name = 'CryptflareApiError';
    this.status = params.status;
    this.code = params.code;
    this.requestId = params.requestId;
  }
}
