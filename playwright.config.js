const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    use: {
        baseURL: 'http://localhost:8080',
        headless: true,
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
    },
    webServer: {
        command: 'npx http-server -p 8080 .',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
    },
});
