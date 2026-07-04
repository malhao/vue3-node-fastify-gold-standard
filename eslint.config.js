// @ts-check
import baseConfig from './packages/config/eslint/base.js';

// Lints only root-level config files; each app/package lints its own tree
// with its own eslint.config.js (see packages/config/eslint/base.js).
export default [
  ...baseConfig,
  {
    files: ['*.js', '*.mjs', '*.cjs', '*.ts', 'scripts/**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      // Root-level tooling scripts run under Node. `globals` isn't a dependency,
      // so declare the handful these scripts actually use.
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
      },
    },
  },
  {
    ignores: ['apps/**', 'packages/**'],
  },
];
