import { defineConfig } from 'orval';

export default defineConfig({
  goldStandard: {
    input: {
      target: '../../apps/api/openapi.json',
    },
    output: {
      mode: 'split',
      client: 'fetch',
      target: 'src/client.ts',
      schemas: 'src/models',
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: 'src/http.ts',
          name: 'http',
        },
      },
    },
  },
  goldStandardZod: {
    input: {
      target: '../../apps/api/openapi.json',
    },
    output: {
      mode: 'split',
      client: 'zod',
      target: 'src/client',
      fileExtension: '.zod.ts',
    },
  },
});
