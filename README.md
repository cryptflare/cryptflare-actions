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
- uses: cryptflare/cryptflare-actions@v1
  with:
    api-token: ${{ secrets.CRYPTFLARE_TOKEN }}

- run: npm run deploy
```

That's the minimal flow: log in, then do your job. Subsequent steps inherit `CRYPTFLARE_TOKEN` and `CRYPTFLARE_API_URL` as env vars for any tool that reads them (the CryptFlare CLI, SDK, or later actions in this suite as they ship).

See [login/README.md](./login/README.md) for the full input/output reference, permissions, troubleshooting, and more examples.

## Available actions

| Action                             | Status    | Purpose                                                                         |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------- |
| `cryptflare/cryptflare-actions@v1` | available | Login - validate a service or access token, expose identity info to later steps |
| `.../get-secrets@v1`               | planned   | Fetch secrets and inject into job env or a file                                 |
| `.../run@v1`                       | planned   | Run a command with secrets injected, nothing persisted to disk                  |
| `.../set-secret@v1`                | planned   | Create or update a secret from CI                                               |
| `.../rotate@v1`                    | planned   | Trigger rotation on a key or policy                                             |
| `.../dynamic-lease@v1`             | planned   | Issue short-lived AWS/Azure/GCP credentials, auto-revoked at job end            |
| `.../sync-trigger@v1`              | planned   | Kick a sync connection and wait for completion                                  |
| `.../drift-check@v1`               | planned   | Fail the job if a sync destination has drifted                                  |
| `.../audit-query@v1`               | planned   | Query audit events - compliance gates in CI                                     |

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
