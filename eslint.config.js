// @ts-check
import baseConfig from './packages/config/eslint/base.js';

// Lints only root-level config files; each app/package lints its own tree
// with its own eslint.config.js (see packages/config/eslint/base.js).
export default [
  ...baseConfig,
  {
    files: ['*.js', '*.mjs', '*.cjs', '*.ts'],
  },
  {
    ignores: ['apps/**', 'packages/**'],
  },
];
