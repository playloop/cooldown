import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// base './' makes every asset path relative, so the same build runs from
// itch.io, a subfolder, or straight off the disk.
export default defineConfig({
  base: './',
  build: { target: 'es2022' },
  // One version number, package.json's, reaches the game as __BUILD_VERSION__.
  define: { __BUILD_VERSION__: JSON.stringify(pkg.version) },
  test: { include: ['src/**/*.test.ts'] },
});
