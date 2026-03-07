import { config } from 'dotenv';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

const baseURL = process.env.PW_BASE_URL || 'http://localhost:3000';
const hasUnverifiedCreds = !!(process.env.PW_NO_ABN_EMAIL && process.env.PW_NO_ABN_PASSWORD);

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
  },

  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    ...(hasUnverifiedCreds
      ? [
          {
            name: 'setup-unverified',
            testMatch: /auth-unverified\.setup\.ts/,
          },
          {
            name: 'chromium-unverified',
            use: {
              ...devices['Desktop Chrome'],
              storageState: 'playwright/.auth/unverified-user.json',
            },
            dependencies: ['setup-unverified'],
            testMatch: /abn-gating-unverified\.spec\.ts/,
          },
        ]
      : []),
  ],

  webServer: process.env.PW_BASE_URL
    ? undefined // if you point tests at a deployed URL, don't start local server
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
