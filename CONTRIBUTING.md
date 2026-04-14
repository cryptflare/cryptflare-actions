# Contributing

Thanks for your interest in CryptFlare Actions.

## Prerequisites

- Node.js 20 (see `.node-version`)
- pnpm 9

## Setup

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
```

## Commit conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org/). `release-please` reads commit messages to generate the changelog and bump the version.

- `feat(get-secrets): add support for JSON output format` - minor bump
- `fix(core): mask multi-line values correctly` - patch bump
- `feat!: rename api-token input to token` - major bump

Scopes should match the action folder name (`login`, `get-secrets`, `run`, `core`, ...).

## The `dist/` rule

GitHub Actions run `dist/index.js` directly from the committed tree. If you change any file under `src/`, you **must** run `pnpm build` and commit the resulting `dist/` in the same PR. CI enforces this via a `git status` check after a clean build.

## Release process

1. Merge PRs to `main` using conventional commit messages.
2. `release-please` opens a "Release PR" that bumps `version`, updates `CHANGELOG.md`, and updates `.release-please-manifest.json`.
3. Merge the Release PR. This creates a tag (`v1.2.3`), a GitHub Release, and a Release event.
4. The `update-major-tag` job force-moves `v1` to the new tag so `@v1` consumers pick up the patch.

Never hand-tag releases. Never hand-edit `CHANGELOG.md`.
