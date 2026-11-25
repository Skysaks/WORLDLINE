import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('./build.config.json', import.meta.url), 'utf8'));

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: config.e2e?.timeout ?? 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { browserName: 'chromium', serviceWorkers: 'block', locale: 'fr-FR', timezoneId: 'Europe/Paris' },
  projects: [
    { name: 'bureau', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
});
