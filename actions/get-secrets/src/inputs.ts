import * as core from '@actions/core';

const TOKEN_PREFIX = 'cf_';
const DEFAULT_API_URL = 'https://api.cryptflare.com';
const TOKEN_HELP_URL = 'https://vault.cryptflare.com/settings/tokens';
const VALID_OUTPUT_FORMATS = ['env', 'dotenv', 'json'] as const;

export type OutputFormat = (typeof VALID_OUTPUT_FORMATS)[number];

export type GetSecretsInputs = {
  token: string;
  apiUrl: string;
  orgId: string | undefined;
  workspace: string;
  environment: string;
  keys: string[];
  output: OutputFormat;
  outputPath: string | undefined;
  prefix: string;
  failOnMissing: boolean;
};

/**
 * Parses and validates inputs for get-secrets.
 *
 * Token, api-url, and org-id all fall back to env vars set by the login
 * action (CRYPTFLARE_TOKEN, CRYPTFLARE_API_URL, CRYPTFLARE_ORG_ID) so the
 * action can be used standalone OR after a login step with no double
 * configuration. Throws with actionable messages on bad input.
 */
export function getInputs(): GetSecretsInputs {
  const token = (core.getInput('api-token') || process.env.CRYPTFLARE_TOKEN || '').trim();
  if (!token) {
    throw new Error(
      `Missing api-token. Pass one explicitly via the api-token input, or run the login action first (which exports CRYPTFLARE_TOKEN). Create a token at ${TOKEN_HELP_URL}.`,
    );
  }
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw new Error(
      `Invalid CryptFlare token format: expected a token starting with "${TOKEN_PREFIX}". Create a new one at ${TOKEN_HELP_URL}.`,
    );
  }

  const rawUrl = (
    core.getInput('api-url') ||
    process.env.CRYPTFLARE_API_URL ||
    DEFAULT_API_URL
  ).trim();
  let apiUrl: string;
  try {
    apiUrl = new URL(rawUrl).toString().replace(/\/+$/, '');
  } catch {
    throw new Error(`Invalid api-url "${rawUrl}": must be a valid URL (e.g. ${DEFAULT_API_URL}).`);
  }

  const orgIdInput = (core.getInput('org-id') || process.env.CRYPTFLARE_ORG_ID || '').trim();
  const orgId = orgIdInput === '' ? undefined : orgIdInput;

  const workspace = core.getInput('workspace', { required: true }).trim();
  if (!workspace) {
    throw new Error(
      'Missing workspace input. Pass the workspace ID of the environment holding your secrets.',
    );
  }

  const environment = core.getInput('environment', { required: true }).trim();
  if (!environment) {
    throw new Error('Missing environment input. Pass the environment ID within the workspace.');
  }

  const keysRaw = core.getInput('keys', { required: true });
  const keys = keysRaw
    .split(/[,\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  if (keys.length === 0) {
    throw new Error('No keys to fetch. Pass a comma or newline separated list in the keys input.');
  }

  const output = core.getInput('output').trim().toLowerCase() || 'env';
  if (!VALID_OUTPUT_FORMATS.includes(output as OutputFormat)) {
    throw new Error(
      `Invalid output format "${output}". Must be one of: ${VALID_OUTPUT_FORMATS.join(', ')}.`,
    );
  }

  const outputPathRaw = core.getInput('output-path').trim();
  if ((output === 'dotenv' || output === 'json') && !outputPathRaw) {
    throw new Error(
      `output-path is required when output is "${output}". Pass a destination file path.`,
    );
  }
  if (output === 'env' && outputPathRaw) {
    core.warning(
      'output-path is ignored when output is "env"; secrets are exported as env vars only.',
    );
  }
  const outputPath = outputPathRaw === '' ? undefined : outputPathRaw;

  const prefix = core.getInput('prefix');

  const failOnMissingRaw = core.getInput('fail-on-missing').trim().toLowerCase();
  const failOnMissing = failOnMissingRaw === '' ? true : failOnMissingRaw !== 'false';

  return {
    token,
    apiUrl,
    orgId,
    workspace,
    environment,
    keys,
    output: output as OutputFormat,
    outputPath,
    prefix,
    failOnMissing,
  };
}
