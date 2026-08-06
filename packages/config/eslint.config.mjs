import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Shared flat ESLint config for all Athena workspaces.
 * Import and spread, then add workspace-specific overrides.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.astro/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // Provider isolation: API-Football types must never leave the adapter.
    // Enforced properly with dependency-cruiser in Fase 1; this is the first line of defense.
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/providers/api-football/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/providers/api-football/*'], message: 'Provider models must not leak outside the adapter. Depend on the domain model instead.' }] },
      ],
    },
  },
);
