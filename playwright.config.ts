import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

/**
 * Web アプリのスモーク E2E。
 * CI では本番ビルド (vite build) を vite preview で配信してテストする。
 * 「全件パス」を厳密にするため retries は常に 0(flaky を合格扱いにしない)。
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // iPhone 相当の画面幅で確認する(アプリの主対象が iOS のため)。エンジンは Chromium。
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
