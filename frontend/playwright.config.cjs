const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
