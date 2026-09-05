import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = process.env.E2E_PORT ?? '3100';
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_SKIP_WEB_SERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        // Own port and own build directory: a dev server already running on 3000
        // keeps its .next to itself, so neither run overwrites the other's chunks.
        env: { PORT: E2E_PORT, NEXT_DIST_DIR: '.next-e2e' },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
