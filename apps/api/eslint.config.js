// @ts-check
import baseConfig from '../../packages/config/eslint/base.js';

export default [
  ...baseConfig,
  {
    ignores: ['src/generated/**'],
  },
];
