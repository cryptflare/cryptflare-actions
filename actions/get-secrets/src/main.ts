import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import * as core from '@actions/core';
import {
  CryptflareApiError,
  CryptflareClient,
  errorMessage,
  maskSecret,
} from '@cryptflare-actions/core';

import { getInputs, type GetSecretsInputs } from './inputs.js';

type WhoamiResponse = {
  tokenType: 'service' | 'access';
  tokenId: string | null;
  organisation: { id: string; name: string; plan: string };
  userId: string | null;
  permissions: string[];
};

type RevealedSecret = {
  data: {
    key: string;
    value: string;
    version: number;
    encoding: 'utf-8' | 'base64';
  };
};

type FetchedSecret = { key: string; value: string };

export async function run(): Promise<void> {
  try {
    const inputs = getInputs();
    maskSecret(inputs.token);

    const client = new CryptflareClient({ baseUrl: inputs.apiUrl, token: inputs.token });

    const orgId = await resolveOrgId(client, inputs.orgId);

    const fetched = await core.group(
      `Fetching ${inputs.keys.length} secret(s) from CryptFlare`,
      async () => {
        core.info(`Organisation: ${orgId}`);
        core.info(`Workspace:    ${inputs.workspace}`);
        core.info(`Environment:  ${inputs.environment}`);
        core.info(`Keys:         ${inputs.keys.join(', ')}`);
        return await fetchAll(client, orgId, inputs);
      },
    );

    // Mask every value before any later step can see it.
    for (const { value } of fetched) maskSecret(value);

    switch (inputs.output) {
      case 'env':
        writeToEnv(fetched, inputs.prefix);
        break;
      case 'dotenv':
        writeDotenv(fetched, inputs.outputPath!);
        break;
      case 'json':
        writeJson(fetched, inputs.outputPath!);
        break;
    }

    core.setOutput('keys', fetched.map((s) => s.key).join(','));
    core.setOutput('count', String(fetched.length));

    core.info(`Fetched ${fetched.length} secret(s) in ${inputs.output} format.`);
  } catch (error) {
    core.setFailed(`CryptFlare get-secrets failed: ${errorMessage(error)}`);
  }
}

/**
 * Resolve the organisation id for path construction. Callers can pass
 * `org-id` explicitly or rely on `CRYPTFLARE_ORG_ID` (exported by login);
 * otherwise we probe `/v1/auth/whoami` and read it from the response.
 */
async function resolveOrgId(
  client: CryptflareClient,
  explicit: string | undefined,
): Promise<string> {
  if (explicit) return explicit;
  const who = await client.get<WhoamiResponse>('/v1/auth/whoami');
  return who.organisation.id;
}

/**
 * Fetches every requested key in parallel. The CryptFlare API has no batch
 * endpoint today, so N keys = N concurrent GET requests. The hosted runner
 * can easily handle 10-50 of these in parallel without rate-limit concerns.
 */
async function fetchAll(
  client: CryptflareClient,
  orgId: string,
  inputs: GetSecretsInputs,
): Promise<FetchedSecret[]> {
  const base = `/v1/organisations/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(inputs.workspace)}/environments/${encodeURIComponent(inputs.environment)}/secrets`;

  const settled = await Promise.allSettled(
    inputs.keys.map(async (key): Promise<FetchedSecret> => {
      const response = await client.get<RevealedSecret>(`${base}/${encodeURIComponent(key)}`);
      const { value, encoding } = response.data;
      const decoded =
        encoding === 'base64' ? Buffer.from(value, 'base64').toString('utf-8') : value;
      return { key, value: decoded };
    }),
  );

  const missing: string[] = [];
  const failed: { key: string; reason: string }[] = [];
  const results: FetchedSecret[] = [];

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i]!;
    const key = inputs.keys[i]!;
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
      continue;
    }
    const reason = outcome.reason;
    if (reason instanceof CryptflareApiError && reason.status === 404) {
      missing.push(key);
    } else {
      failed.push({ key, reason: errorMessage(reason) });
    }
  }

  // Non-404 failures are always fatal.
  if (failed.length > 0) {
    const summary = failed.map((f) => `${f.key}: ${f.reason}`).join('; ');
    throw new Error(`failed to fetch ${failed.length} secret(s): ${summary}`);
  }

  if (missing.length > 0) {
    if (inputs.failOnMissing) {
      throw new Error(
        `${missing.length} secret(s) not found in workspace/${inputs.workspace}/environment/${inputs.environment}: ${missing.join(', ')}. Set fail-on-missing to false to skip missing keys.`,
      );
    }
    core.warning(`Skipping ${missing.length} missing secret(s): ${missing.join(', ')}`);
  }

  return results;
}

function writeToEnv(secrets: FetchedSecret[], prefix: string): void {
  for (const { key, value } of secrets) {
    const envName = `${prefix}${key}`;
    core.exportVariable(envName, value);
  }
}

function writeDotenv(secrets: FetchedSecret[], path: string): void {
  ensureDir(path);
  const body = secrets.map(({ key, value }) => `${key}=${encodeDotenvValue(value)}`).join('\n');
  writeFileSync(path, body + '\n', { encoding: 'utf-8', mode: 0o600 });
  core.info(`Wrote ${secrets.length} secret(s) to ${path} (mode 600)`);
}

function writeJson(secrets: FetchedSecret[], path: string): void {
  ensureDir(path);
  const obj: Record<string, string> = {};
  for (const { key, value } of secrets) obj[key] = value;
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n', { encoding: 'utf-8', mode: 0o600 });
  core.info(`Wrote ${secrets.length} secret(s) to ${path} (mode 600)`);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
}

/**
 * Escapes a value for a .env file. Wraps in double quotes when the value
 * contains whitespace, quotes, backslashes, or newlines, and escapes
 * backslashes / quotes inside the quoted form. Dotenv parsers (node dotenv,
 * python-dotenv, etc.) all agree on this convention.
 */
function encodeDotenvValue(value: string): string {
  if (!/[\s"'\\=#$]/.test(value)) return value;
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
}
