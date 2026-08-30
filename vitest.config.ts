import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'html'],
    },
    include: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts'],
  },
});
