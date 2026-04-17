import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "src/admin-app/main.tsx",
    "better-auth.config.ts",
    "scripts/**/*.{ts,mjs,js}",
    "test/**/*.test.ts",
  ],
  project: ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
  ignoreFiles: ["src/react-app/vite-env.d.ts"],
  ignoreDependencies: [
    // Cloudflare Workers virtual modules used in tests.
    "cloudflare",
    // Referenced through Tailwind CSS directives instead of JS imports.
    "tailwindcss",
    "daisyui",
    // Invoked indirectly or used for postinstall patching.
    "@better-auth/cli",
    "oxc-parser",
  ],
};

export default config;
