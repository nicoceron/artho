import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.PUBLIC_SITE_URL || undefined,
  devToolbar: {
    enabled: false,
  },
  server: {
    host: "127.0.0.1",
    port: 4321,
  },
});
