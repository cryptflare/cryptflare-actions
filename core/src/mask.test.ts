import { afterEach, describe, expect, it, vi } from 'vitest';

import { maskSecret } from './mask.js';

const setSecretMock = vi.fn<(value: string) => void>();

vi.mock('@actions/core', () => ({
  setSecret: (value: string) => setSecretMock(value),
}));

describe('maskSecret', () => {
  afterEach(() => {
    setSecretMock.mockClear();
  });

  it('masks a single-line value once', () => {
    maskSecret('cf_abc123');
    expect(setSecretMock).toHaveBeenCalledTimes(1);
    expect(setSecretMock).toHaveBeenCalledWith('cf_abc123');
  });

  it('masks the whole value plus each non-empty line of a multi-line value', () => {
    const pem = '-----BEGIN-----\nline1\nline2\n-----END-----';
    maskSecret(pem);
    // whole value + 4 non-empty lines
    expect(setSecretMock).toHaveBeenCalledTimes(5);
    expect(setSecretMock).toHaveBeenCalledWith(pem);
    expect(setSecretMock).toHaveBeenCalledWith('-----BEGIN-----');
    expect(setSecretMock).toHaveBeenCalledWith('line1');
    expect(setSecretMock).toHaveBeenCalledWith('line2');
    expect(setSecretMock).toHaveBeenCalledWith('-----END-----');
  });

  it('handles CRLF line endings', () => {
    maskSecret('a\r\nb\r\nc');
    expect(setSecretMock).toHaveBeenCalledWith('a');
    expect(setSecretMock).toHaveBeenCalledWith('b');
    expect(setSecretMock).toHaveBeenCalledWith('c');
  });

  it('skips whitespace-only lines', () => {
    maskSecret('a\n   \nb');
    const calls = setSecretMock.mock.calls.map((c) => c[0]);
    expect(calls).toContain('a');
    expect(calls).toContain('b');
    expect(calls).not.toContain('   ');
  });

  it('is a no-op for empty strings', () => {
    maskSecret('');
    expect(setSecretMock).not.toHaveBeenCalled();
  });
});
