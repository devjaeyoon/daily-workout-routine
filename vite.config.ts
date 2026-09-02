import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'pwa-icon.png'],
      manifest: {
        name: 'daily-workout-routine',
        short_name: '운동기록',
        description: '근비대 운동 세트 기록 및 AI 피드백용 로그',
        theme_color: '#3182F6',
        background_color: '#F2F4F6',
        display: 'standalone',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: '/pwa-icon.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
      },
    }),
    basicSsl(),
  ],
  server: {
    host: true,
  },
});
