import { defineConfig } from 'tsup';

// Bundles the API (and the shared workspace package, which ships as TypeScript) into dist/.
export default defineConfig({
  entry: { server: 'src/server.ts', vercel: 'src/vercel.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  clean: true,
  noExternal: ['@medi-cloud/shared'],
});
