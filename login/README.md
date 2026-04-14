<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.cryptflare.com/logo-dark.png">
    <img src="https://assets.cryptflare.com/logo.png" alt="CryptFlare" width="180">
  </picture>
</p>

# `cryptflare/cryptflare-actions` - Login

Authenticate to [CryptFlare](https://cryptflare.com) and expose caller identity to later workflow steps. Supports both **service tokens** (org-level, no user) and **access tokens** (workspace-scoped, user-linked).

This is the default action in the `cryptflare-actions` suite. It validates a token against `GET /v1/auth/whoami`, masks the value in logs, and optionally exports `CRYPTFLARE_TOKEN`, `CRYPTFLARE_API_URL`, and `CRYPTFLARE_ORG_ID` as env vars so downstream actions pick them up automatically.

> Consumed as `cryptflare/cryptflare-actions/login@v1`. The shortcut `cryptflare/cryptflare-actions@v1` (no sub-path) also works and runs the same action - that's the form the GitHub Marketplace listing shows by default. Prefer the explicit `/login@v1` form in workflows because it makes the intent obvious alongside other sub-actions like `/get-secrets@v1`.

---

## Quick start

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to CryptFlare
        uses: cryptflare/cryptflare-actions/login@v1
        with:
          api-token: ${{ secrets.CRYPTFLARE_TOKEN }}

      - run: npm run deploy
```

That's the entire flow. Store your token as a GitHub Actions secret named `CRYPTFLARE_TOKEN`, pass it to the login step, and the rest of the job inherits `CRYPTFLARE_TOKEN` + `CRYPTFLARE_API_URL` as env vars for any downstream tool that understands them (CryptFlare CLI, SDK, or other cryptflare-actions).

## Examples

### Use outputs to gate a workflow

```yaml
- name: Log in to CryptFlare
  id: cryptflare
  uses: cryptflare/cryptflare-actions/login@v1
  with:
    api-token: ${{ secrets.CRYPTFLARE_TOKEN }}

- name: Only deploy if authed against the production org
  if: steps.cryptflare.outputs.org-id == 'org_prod_abc123'
  run: npm run deploy:prod
```

### Opt out of env var exports (security-conscious)

```yaml
- uses: cryptflare/cryptflare-actions/login@v1
  with:
    api-token: ${{ secrets.CRYPTFLARE_TOKEN }}
    export-env: 'false'
```

When `export-env` is `false`, the token is validated and outputs are set, but nothing is written to `$GITHUB_ENV`. You must then pass `api-token` explicitly to every downstream action in the job.

### Point at a self-hosted or staging API

```yaml
- uses: cryptflare/cryptflare-actions/login@v1
  with:
    api-token: ${{ secrets.CRYPTFLARE_STAGING_TOKEN }}
    api-url: https://api.staging.cryptflare.com
```

### Require a specific permission to exist on the token

```yaml
- id: cryptflare
  uses: cryptflare/cryptflare-actions/login@v1
  with:
    api-token: ${{ secrets.CRYPTFLARE_TOKEN }}

- name: Fail fast if token cannot read secrets
  if: contains(steps.cryptflare.outputs.permissions, 'secrets:read') != true
  run: |
    echo "::error::Token is missing required scope secrets:read"
    exit 1
```

## Inputs

| Name         | Required | Default                      | Description                                                                                                                                                                                                                                           |
| ------------ | -------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api-token`  | yes      | -                            | A CryptFlare service token or access token, prefixed with `cf_`. Create one at [vault.cryptflare.com/settings/tokens](https://vault.cryptflare.com/settings/tokens). Store as a GitHub Actions secret and pass via `${{ secrets.CRYPTFLARE_TOKEN }}`. |
| `api-url`    | no       | `https://api.cryptflare.com` | CryptFlare API base URL. Override for self-hosted installations or staging environments. Must be a valid URL.                                                                                                                                         |
| `export-env` | no       | `'true'`                     | When `true`, exports `CRYPTFLARE_TOKEN` and `CRYPTFLARE_API_URL` to `$GITHUB_ENV` for subsequent steps. Set to `'false'` to only populate outputs.                                                                                                    |

## Outputs

| Name          | Description                                                        | Example                      |
| ------------- | ------------------------------------------------------------------ | ---------------------------- |
| `token-type`  | `service` (org-level) or `access` (workspace-scoped, user-linked). | `service`                    |
| `org-id`      | Organisation ID the token is authenticated to.                     | `org_abc123`                 |
| `org-name`    | Organisation display name.                                         | `Acme Inc`                   |
| `org-plan`    | Organisation billing plan.                                         | `team`                       |
| `user-id`     | User ID that owns the token. Empty string for service tokens.      | `usr_xyz789`                 |
| `permissions` | Comma-separated list of scopes granted to the token.               | `secrets:read,secrets:write` |

Use outputs in later steps via `${{ steps.<step-id>.outputs.<name> }}`. For example, `${{ steps.cryptflare.outputs.org-id }}`.

## Required permissions

**None.** `GET /v1/auth/whoami` validates the token and returns identity without requiring any specific scope. Any valid, non-expired, non-disabled CryptFlare token works - including the narrowest possible service token with an empty scope list.

This is deliberate: the login action should never fail _because of_ a scope, only if the token itself is invalid.

## How the env var export works

When `export-env: 'true'` (the default), `login` writes two variables to `$GITHUB_ENV`:

- `CRYPTFLARE_TOKEN` - the full token value, already masked in logs
- `CRYPTFLARE_API_URL` - the normalised API URL (trailing slashes stripped)

Both become visible to **subsequent steps** in the same job. They are not visible to the current login step or to other jobs. GitHub's log redactor will continue to mask the token everywhere it appears, including if a later step accidentally echoes `$CRYPTFLARE_TOKEN`.

If a later action in this suite accepts an `api-token` input, it reads `CRYPTFLARE_TOKEN` from the environment as a fallback, so you don't need to re-pass it explicitly. Same for `api-url` / `CRYPTFLARE_API_URL`.

## Security notes

- The token is masked via `core.setSecret` immediately on input, before any log statement runs. If GitHub's runner sees the value anywhere in logs afterwards, it replaces it with `***`.
- `login` never writes the token to an output. Outputs are plain-text in workflow logs forever, so outputting a secret defeats redaction.
- The `cf_` prefix is validated locally before hitting the network, so an obviously-wrong token fails fast with an actionable error pointing at `vault.cryptflare.com/settings/tokens`.
- Use the narrowest-scoped service token you can get away with. For most deploy jobs that's `secrets:read` on one workspace; for rotation-heavy pipelines add `secrets:write`. Billing scope is never needed in CI.
- Service tokens support IP allowlists - if you run on self-hosted runners with stable IPs, pin the token to those.
- Always pass the token from a repository or organisation secret. Never inline it in the workflow file.

## Troubleshooting

**`Invalid CryptFlare token format: expected a token starting with "cf_"`** - the value passed to `api-token` does not look like a CryptFlare token. Check that the GitHub secret is set and that you wrote `${{ secrets.CRYPTFLARE_TOKEN }}` not `secrets.CRYPTFLARE_TOKEN`.

**`HTTP 401 Invalid API token`** - the token is syntactically valid but not recognised by the API. The token has been deleted, disabled, or expired. Create a new one.

**`HTTP 403 Request IP not in allowlist`** - the service token has an IP allowlist that does not include the GitHub runner IP. Either widen the allowlist (hosted runners use dynamic IPs so this usually means removing the allowlist for CI tokens) or switch to self-hosted runners with stable IPs.

**`request to https://api.cryptflare.com/v1/auth/whoami failed: <network error>`** - the runner cannot reach the API. Check `api-url`, firewall rules on self-hosted runners, or status at [status.cryptflare.com](https://status.cryptflare.com).

## Related actions

Once published, this suite will also include: `get-secrets`, `run`, `set-secret`, `rotate`, `dynamic-lease`, `sync-trigger`, `drift-check`, `audit-query`. See the [root README](../README.md) for the current action list and examples.

## License

[MIT](../LICENSE)
