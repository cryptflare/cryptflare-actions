/**
 * Masks a secret value in workflow logs.
 *
 * GitHub's log redactor only matches exact substrings, so masking a
 * multi-line blob does not mask the individual lines a subsequent log
 * statement might print. For multi-line values, mask each non-empty line
 * in addition to the whole value. For single-line values, a single call
 * is sufficient (no need to double-mask).
 */
export declare function maskSecret(value: string): void;
