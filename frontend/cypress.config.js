import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'axmyia',
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: false,
    viewportWidth: 1920,
    viewportHeight: 1080,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
