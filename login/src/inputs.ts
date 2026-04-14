import * as core from '@actions/core';

const TOKEN_PREFIX = 'cf_';
const DEFAULT_API_URL = 'https://api.cryptflare.com';
const TOKEN_HELP_URL = 'https://vault.cryptflare.com/settings/tokens';

export type LoginInputs = {
  token: string;
  apiUrl: string;
  exportEnv: boolean;
};

/**
 * Parses and validates the action's inputs in one place. Throws on invalid
 * input with a message that tells the user exactly how to fix it - these
 * errors are caught at the top of run() and surfaced via core.setFailed.
 */
export function getInputs(): LoginInputs {
  const token = core.getInput('api-token', { required: true }).trim();
  if (!token) {
    throw new Error(
      `Missing api-token input. Pass a CryptFlare service or access token - create one at ${TOKEN_HELP_URL}.`,
    );
  }
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new Error(
      `Invalid CryptFlare token format: expected a token starting with "${TOKEN_PREFIX}". Create a new one at ${TOKEN_HELP_URL}.`,
    );
  }

  const rawUrl = core.getInput('api-url').trim() || DEFAULT_API_URL;
  let apiUrl: string;
  try {
    apiUrl = new URL(rawUrl).toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`Invalid api-url "${rawUrl}": must be a valid URL (e.g. ${DEFAULT_API_URL}).`);
  }

  const exportEnvRaw = core.getInput('export-env').trim().toLowerCase();
  const exportEnv = exportEnvRaw === '' ? true : exportEnvRaw !== 'false';

  return { token, apiUrl, exportEnv };
}
