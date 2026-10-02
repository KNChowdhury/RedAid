import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({command, mode}) => {
  // Incident 2026-10-02: the Vercel production build ran without
  // VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, so supabaseClient.ts got a
  // null client and every fetch silently returned [] (no donors, no
  // requests, no error). Vite inlines these at build time, so fail the build
  // instead of shipping a site that looks up but has no backend.
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((key) => !env[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required build env: ${missing.join(', ')}. ` +
          'Set them in Vercel > Project Settings > Environment Variables (or .env.local), then rebuild.'
      );
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            charts: ['recharts'],
            motion: ['motion'],
          },
        },
      },
    },
  };
});
