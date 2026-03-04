import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './playwright',
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // Keep CI stable
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: 'playwright/.auth/state.json',
  },

  globalSetup: './playwright/global-setup.ts',

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: process.env.PW_BASE_URL
    ? undefined // if you point tests at a deployed URL, don't start local server
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
