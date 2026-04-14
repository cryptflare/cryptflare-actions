import { describe, expect, it } from 'vitest';

import { CryptflareApiError, errorMessage } from './errors.js';

describe('errorMessage', () => {
  it('returns the message from an Error instance', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns strings as-is', () => {
    expect(errorMessage('raw string')).toBe('raw string');
  });

  it('handles null and undefined', () => {
    expect(errorMessage(null)).toBe('unknown error');
    expect(errorMessage(undefined)).toBe('unknown error');
  });

  it('extracts message from objects with a string message field', () => {
    expect(errorMessage({ message: 'structured error' })).toBe('structured error');
  });

  it('ignores non-string message fields on objects', () => {
    const result = errorMessage({ message: 42 });
    expect(result).toBe('{"message":42}');
  });

  it('JSON-stringifies plain objects', () => {
    expect(errorMessage({ code: 'X', detail: 'Y' })).toBe('{"code":"X","detail":"Y"}');
  });

  it('falls back to String() when JSON.stringify throws', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = errorMessage(circular);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles numbers via JSON.stringify', () => {
    expect(errorMessage(42)).toBe('42');
  });

  it('subclass Error instances are detected', () => {
    class CustomError extends Error {}
    expect(errorMessage(new CustomError('sub'))).toBe('sub');
  });
});

describe('CryptflareApiError', () => {
  it('exposes status, message, code, and requestId', () => {
    const err = new CryptflareApiError({
      status: 403,
      message: 'Forbidden',
      code: 'AUTH_INVALID_TOKEN',
      requestId: 'req_123',
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(CryptflareApiError);
    expect(err.name).toBe('CryptflareApiError');
    expect(err.status).toBe(403);
    expect(err.message).toBe('Forbidden');
    expect(err.code).toBe('AUTH_INVALID_TOKEN');
    expect(err.requestId).toBe('req_123');
  });

  it('leaves optional fields undefined when omitted', () => {
    const err = new CryptflareApiError({ status: 500, message: 'oops' });
    expect(err.code).toBeUndefined();
    expect(err.requestId).toBeUndefined();
  });

  it('is catchable via errorMessage', () => {
    const err = new CryptflareApiError({ status: 500, message: 'internal' });
    expect(errorMessage(err)).toBe('internal');
  });
});
