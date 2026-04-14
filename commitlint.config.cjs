/**
 * Conventional Commits enforcement.
 * Scopes should match the action folder name (login, get-secrets, run,
 * dynamic-lease, sync-trigger, drift-check, rotate, set-secret, audit-query)
 * or a cross-cutting area (core, ci, release, deps, docs, repo).
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'revert', 'docs', 'refactor', 'test', 'build', 'ci', 'chore', 'deps'],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'api',
        'login',
        'get-secrets',
        'run',
        'set-secret',
        'rotate',
        'dynamic-lease',
        'sync-trigger',
        'drift-check',
        'audit-query',
        'core',
        'ci',
        'release',
        'deps',
        'docs',
        'repo',
      ],
    ],
    'scope-empty': [2, 'never'],
    // Disabled: acronyms like CI, API, TLS, AWS, HTTP are common in commit
    // subjects and fighting commitlint over them is wasted energy. The
    // scope-enum + type-enum + length limits already give us structure.
    'subject-case': [0],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 120],
  },
};
