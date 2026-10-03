import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  // Motion and pixel geometry assertions share one local dev server. Run them
  // serially to keep timings and screenshots stable under browser load.
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:4393",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4393",
    // Astro detaches its dev server when it detects an AI coding agent. Playwright
    // needs this command to stay in the foreground so it can manage its lifetime.
    env: { ASTRO_DEV_BACKGROUND: "0" },
    url: "http://127.0.0.1:4393",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
