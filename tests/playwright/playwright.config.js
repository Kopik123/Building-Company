const { defineConfig, devices } = require('@playwright/test');

const desktopChromium = { ...devices['Desktop Chrome'], channel: undefined };

const shouldUseExternalStaticServer = process.env.PW_EXTERNAL_STATIC_SERVER === '1';

module.exports = defineConfig({
  testDir: '.',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure'
  },
  webServer: shouldUseExternalStaticServer ? undefined : {
    command: 'node ../../scripts/playwright-static-server.js',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...desktopChromium
      }
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7']
      }
    },
    {
      name: 'mobile-webkit',
      use: {
        ...devices['iPhone 15']
      }
    }
  ]
});
