import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET;
  const apiPath = env.API_PROXY_PATH;

  // Для dev/preview прокси обязателен; для сборки и тестов он не нужен.
  if (command === 'serve' && mode !== 'test' && (!target || !apiPath)) {
    throw new Error(
      'Не заданы API_PROXY_TARGET и/или API_PROXY_PATH. Создайте .env по примеру .env.example.'
    );
  }

  // API отдаёт данные по http и без CORS-заголовков, поэтому в dev-режиме
  // (и в preview) запросы на /api проксируются на target.
  const proxy = target && apiPath
    ? {
        '/api': {
          target,
          changeOrigin: true,
          // path содержит и query-строку: /api?number=1 -> API_PROXY_PATH?number=1
          rewrite: (path) => path.replace(/^\/api/, apiPath)
        }
      }
    : undefined;

  return {
    plugins: [react()],
    server: proxy ? { proxy } : {},
    preview: proxy ? { proxy } : {},
    test: {
      // Тестам не нужен настоящий ключ: fetch в них замокан.
      env: {
        VITE_API_KEY: env.VITE_API_KEY || 'test-key'
      }
    }
  };
});
