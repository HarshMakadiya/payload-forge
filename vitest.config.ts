import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@payload-forge/shared': fileURLToPath(
        new URL('./packages/shared/src/index.ts', import.meta.url)
      ),
    },
  },
  test: {
    coverage: {
      reporter: ['text', 'html'],
    },
    include: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
  },
});
