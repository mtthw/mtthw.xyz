const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests/browser",
  use: {
    baseURL: "http://127.0.0.1:1314",
    browserName: "chromium",
  },
  webServer: {
    command: "python3 -m http.server 1314 --directory public",
    url: "http://127.0.0.1:1314",
    reuseExistingServer: !process.env.CI,
  },
});
