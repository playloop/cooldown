import { defineConfig } from 'vitest/config';

// base './' makes every asset path relative, so the same build runs from
// itch.io, a subfolder, or straight off the disk.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  test: { include: ['src/**/*.test.ts'] },
});
