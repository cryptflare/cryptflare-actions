<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://assets.cryptflare.com/logo-dark.png">
    <img src="https://assets.cryptflare.com/logo.png" alt="CryptFlare" width="220">
  </picture>
</p>

<h1 align="center">CryptFlare Actions</h1>

<p align="center">
  Official GitHub Actions for <a href="https://cryptflare.com">CryptFlare</a> - fetch secrets, issue short-lived cloud credentials, trigger syncs, and detect drift in your CI/CD pipelines.
</p>

<p align="center">
  <a href="https://github.com/cryptflare/cryptflare-actions/actions/workflows/ci.yml"><img src="https://github.com/cryptflare/cryptflare-actions/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/cryptflare/cryptflare-actions/releases"><img src="https://img.shields.io/github/v/release/cryptflare/cryptflare-actions?sort=semver" alt="Release"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/cryptflare/cryptflare-actions" alt="License"></a>
</p>

---

## Quick start

```yaml
- uses: cryptflare/cryptflare-actions/login@v1
  with:
    api-token: ${{ secrets.CRYPTFLARE_TOKEN }}

- uses: cryptflare/cryptflare-actions/get-secrets@v1
  with:
    workspace: ws_abc123
    environment: env_prod
    keys: DATABASE_URL, STRIPE_API_KEY, REDIS_URL

- run: npm run deploy
```

That's the full two-step flow: log in, fetch secrets, deploy. The login step exports `CRYPTFLARE_TOKEN`, `CRYPTFLARE_API_URL`, and `CRYPTFLARE_ORG_ID` as env vars so every subsequent action picks them up automatically - no need to pass the token more than once per job.

You can also skip the login step and pass the token directly to `get-secrets` if identity info is not needed downstream:

```yaml
- uses: cryptflare/cryptflare-actions/get-secrets@v1
  with:
    api-token: ${{ secrets.CRYPTFLARE_TOKEN }}
    workspace: ws_abc123
    environment: env_prod
    keys: DATABASE_URL
```

See [login/README.md](./login/README.md) and the action-specific READMEs for the full input/output reference, permissions, troubleshooting, and more examples.

> **Shortcut form:** `uses: cryptflare/cryptflare-actions@v1` (no sub-path) also works and runs the login action. This is what the GitHub Marketplace listing shows by default. The explicit `/login@v1` form is recommended in workflows because it makes the intent obvious alongside other sub-actions like `/get-secrets@v1`.

## Available actions

All sub-actions are consumed via the sub-path form: `cryptflare/cryptflare-actions/<name>@v1`.

| Action              | Status    | Purpose                                                                                         |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------- |
| `/login@v1`         | available | Validate a service or access token, expose identity info to later steps                         |
| `/get-secrets@v1`   | available | Fetch secrets from a workspace/environment and inject into job env, a .env file, or a JSON file |
| `/run@v1`           | planned   | Run a command with secrets injected, nothing persisted to disk                                  |
| `/set-secret@v1`    | planned   | Create or update a secret from CI                                                               |
| `/rotate@v1`        | planned   | Trigger rotation on a key or policy                                                             |
| `/dynamic-lease@v1` | planned   | Issue short-lived AWS/Azure/GCP credentials, auto-revoked at job end                            |
| `/sync-trigger@v1`  | planned   | Kick a sync connection and wait for completion                                                  |
| `/drift-check@v1`   | planned   | Fail the job if a sync destination has drifted                                                  |
| `/audit-query@v1`   | planned   | Query audit events - compliance gates in CI                                                     |

Each shipped action has its own README in its folder with full documentation.

## Authentication

All actions accept an `api-token` input or read `CRYPTFLARE_TOKEN` from the environment. Use a **service token** scoped to only the permissions that workflow needs - see the [login action's required permissions section](./login/README.md#required-permissions) and [service tokens guide](https://docs.cryptflare.com/guides/service-tokens) for least-privilege recipes.

## Security

Every value returned from the CryptFlare API is passed through `core.setSecret` before it touches your job environment, so secrets are masked in logs. Actions that issue ephemeral credentials (like `dynamic-lease`) will register post-steps that revoke leases at job end - credentials never outlive the job.

To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). PRs must pass CI, which includes a `dist/` drift check - if you change `src/`, rebuild and commit `dist/`.

## License

[MIT](./LICENSE)
