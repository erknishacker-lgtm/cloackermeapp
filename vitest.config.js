import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    fileParallelism: false,
    hookTimeout: 15000,
    testTimeout: 15000,
    // Avoid hanging when Node keeps the event loop open in CI/sandbox.
    forceExit: true
  }
});
