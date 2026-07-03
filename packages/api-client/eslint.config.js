// @ts-check
import baseConfig from '../config/eslint/base.js';

export default [
  ...baseConfig,
  {
    ignores: ['src/client.ts', 'src/client.zod.ts', 'src/models/**'],
  },
];
