// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

/** Shared base flat-config array. Apps extend this and append framework-specific plugins. */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['**/dist/**', '**/build/**', '**/.output/**', '**/coverage/**', '**/node_modules/**'],
  },
);
