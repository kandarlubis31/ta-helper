import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // vite root is src/client, so include is relative to that
    include: ['**/__tests__/**/*.test.{js,jsx}'],
  },
}));
