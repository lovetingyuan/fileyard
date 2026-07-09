import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babelPlugin from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import Icons from 'unplugin-icons/vite'
import babelPluginRelativePath from './scripts/babel-plugin-relative-path.js'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

// import { analyzer } from 'vite-bundle-analyzer'

process.env.VITE_BUILD_TIME = Date.now() + ''
// eslint-disable-next-line sonarjs/no-os-command-from-path
process.env.VITE_GIT_HASH = execSync('git rev-parse --short HEAD').toString('utf8').trim()

const viteHtmlEntryPoints = {
  main: resolve(process.cwd(), 'index.html'),
  admin: resolve(process.cwd(), 'admin.html'),
} as const

export default defineConfig(({ mode }) => ({
  css: {
    devSourcemap: false, // 明确关闭 CSS 的 sourcemap
  },
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: viteHtmlEntryPoints,
        },
      },
    },
  },
  plugins: [
    react(),
    Icons({ compiler: 'jsx', jsx: 'react' }),
    babelPlugin({
      presets: [reactCompilerPreset()],
      plugins: mode === 'development' ? [babelPluginRelativePath] : [],
    }),
    tailwindcss({}),
    cloudflare(),
    // analyzer(),
  ],
}))
