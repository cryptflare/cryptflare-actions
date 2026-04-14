import { afterEach, describe, expect, it, vi } from 'vitest';
import * as core from '@actions/core';

import { maskSecret } from './mask.js';

describe('maskSecret', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('masks a single-line value once', () => {
    const spy = vi.spyOn(core, 'setSecret').mockImplementation(() => undefined);
    maskSecret('cf_abc123');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('cf_abc123');
  });

  it('masks the whole value plus each non-empty line of a multi-line value', () => {
    const spy = vi.spyOn(core, 'setSecret').mockImplementation(() => undefined);
    const pem = '-----BEGIN-----\nline1\nline2\n-----END-----';
    maskSecret(pem);
    // whole value + 4 non-empty lines
    expect(spy).toHaveBeenCalledTimes(5);
    expect(spy).toHaveBeenCalledWith(pem);
    expect(spy).toHaveBeenCalledWith('-----BEGIN-----');
    expect(spy).toHaveBeenCalledWith('line1');
    expect(spy).toHaveBeenCalledWith('line2');
    expect(spy).toHaveBeenCalledWith('-----END-----');
  });

  it('handles CRLF line endings', () => {
    const spy = vi.spyOn(core, 'setSecret').mockImplementation(() => undefined);
    maskSecret('a\r\nb\r\nc');
    expect(spy).toHaveBeenCalledWith('a');
    expect(spy).toHaveBeenCalledWith('b');
    expect(spy).toHaveBeenCalledWith('c');
  });

  it('skips whitespace-only lines', () => {
    const spy = vi.spyOn(core, 'setSecret').mockImplementation(() => undefined);
    maskSecret('a\n   \nb');
    const calls = spy.mock.calls.map((c) => c[0]);
    expect(calls).toContain('a');
    expect(calls).toContain('b');
    expect(calls).not.toContain('   ');
  });

  it('is a no-op for empty strings', () => {
    const spy = vi.spyOn(core, 'setSecret').mockImplementation(() => undefined);
    maskSecret('');
    expect(spy).not.toHaveBeenCalled();
  });
});
