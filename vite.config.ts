import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const API_PREFIXES = [
  '/api',
  '/attendance',
  '/auth',
  '/coaching',
  '/employees',
  '/events',
  '/fees',
  '/filter-options',
  '/leaves',
  '/ledger',
  '/media',
  '/meta',
  '/modules',
  '/parent',
  '/payment-methods',
  '/payments',
  '/reports',
  '/results',
  '/routines',
  '/salary',
  '/school',
  '/sms',
  '/staff',
  '/staff-attendance',
  '/students',
  '/super-admin',
  '/system',
  '/teacher-exams',
  '/teachers',
  '/teacher-subjects',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: Object.fromEntries(
        API_PREFIXES.map((prefix) => [
          prefix,
          {
            target: proxyTarget,
            changeOrigin: true,
          },
        ]),
      ),
    },
  }
})
