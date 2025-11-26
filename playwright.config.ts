import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration
 * Testing authentication flows and 2FA bypass prevention
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for auth state consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid auth conflicts
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
