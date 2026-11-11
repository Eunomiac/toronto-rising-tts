import { defineConfig, devices } from '@playwright/test';

const deployedBaseURL = process.env.PLAYER_MAP_BASE_URL;

export default defineConfig({
  testDir: './tests',
  testIgnore: 'debug-notes.spec.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: deployedBaseURL ?? 'http://127.0.0.1:4174',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: deployedBaseURL ? undefined : {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
