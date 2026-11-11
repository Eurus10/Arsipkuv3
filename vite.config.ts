import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom',
        'react-dom/client',
        'lucide-react',
        '@supabase/supabase-js',
        'docx',
        'jspdf',
        'jszip',
        'mammoth',
        'xlsx',
        'xlsx-js-style',
        'html-to-image',
        'html2canvas',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
      ],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('xlsx') ||
                id.includes('xlsx-js-style') ||
                id.includes('docx') ||
                id.includes('jszip') ||
                id.includes('mammoth')
              ) {
                return 'vendor-office';
              }
              if (
                id.includes('jspdf') ||
                id.includes('html2canvas') ||
                id.includes('html-to-image')
              ) {
                return 'vendor-pdf-canvas';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-gemini';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('scheduler')
              ) {
                return 'vendor-react';
              }
              return 'vendor-misc';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1200,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
