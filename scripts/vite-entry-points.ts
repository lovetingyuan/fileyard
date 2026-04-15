import { resolve } from "node:path";

export const viteHtmlEntryPoints = {
  main: resolve(process.cwd(), "index.html"),
  adminUsers: resolve(process.cwd(), "admin/users/index.html"),
} as const;
