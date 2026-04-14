import * as core from '@actions/core';
import { CryptflareClient, errorMessage, maskSecret } from '@cryptflare-actions/core';

import { getInputs } from './inputs.js';

type WhoamiResponse = {
  tokenType: 'service' | 'access';
  tokenId: string | null;
  organisation: { id: string; name: string; plan: string };
  userId: string | null;
  permissions: string[];
};

export async function run(): Promise<void> {
  try {
    const inputs = getInputs();

    // Mask the token before it can leak into any log line, including our own.
    maskSecret(inputs.token);

    const client = new CryptflareClient({ baseUrl: inputs.apiUrl, token: inputs.token });

    const identity = await core.group('Authenticating to CryptFlare', async () => {
      const who = await client.get<WhoamiResponse>('/v1/auth/whoami');
      core.info(`API reachable: ${inputs.apiUrl}`);
      core.info(`Token type:    ${who.tokenType}`);
      core.info(`Organisation:  ${who.organisation.name} (${who.organisation.id})`);
      core.info(`Plan:          ${who.organisation.plan}`);
      if (who.tokenType === 'access' && who.userId) {
        core.info(`User:          ${who.userId}`);
      }
      if (who.tokenType === 'service' && who.tokenId) {
        core.info(`Token id:      ${who.tokenId}`);
      }
      core.info(
        `Permissions:   ${who.permissions.length > 0 ? who.permissions.join(', ') : '(none)'}`,
      );
      return who;
    });

    core.setOutput('token-type', identity.tokenType);
    core.setOutput('org-id', identity.organisation.id);
    core.setOutput('org-name', identity.organisation.name);
    core.setOutput('org-plan', identity.organisation.plan);
    core.setOutput('user-id', identity.userId ?? '');
    core.setOutput('permissions', identity.permissions.join(','));

    if (inputs.exportEnv) {
      core.exportVariable('CRYPTFLARE_TOKEN', inputs.token);
      core.exportVariable('CRYPTFLARE_API_URL', inputs.apiUrl);
      core.exportVariable('CRYPTFLARE_ORG_ID', identity.organisation.id);
      core.info(
        'Exported CRYPTFLARE_TOKEN, CRYPTFLARE_API_URL, and CRYPTFLARE_ORG_ID for subsequent steps.',
      );
    }
  } catch (error) {
    core.setFailed(`CryptFlare login failed: ${errorMessage(error)}`);
  }
}
