import * as core from '@actions/core';

/**
 * Masks a secret value in workflow logs.
 *
 * GitHub's log redactor only matches exact substrings, so masking a
 * multi-line blob does not mask the individual lines a subsequent log
 * statement might print. For multi-line values, mask each non-empty line
 * in addition to the whole value. For single-line values, a single call
 * is sufficient (no need to double-mask).
 */
export function maskSecret(value: string): void {
  if (!value) return;
  core.setSecret(value);
  if (!value.includes('\n')) return;
  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length > 0) core.setSecret(trimmed);
  }
}
