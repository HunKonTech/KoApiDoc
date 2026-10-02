import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Component tests import code from static/macro-ui, which has its own React.
  // Testing Library uses the root copy; dedupe makes everything use that one.
  resolve: { dedupe: ['react', 'react-dom'] },
  test: { include: ['tests/**/*.test.{ts,tsx}'] },
});
