import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// THEME_BUILD=1 builds into the WordPress theme (wordpress-theme/moroccotravely/app)
// with fixed file names that the theme's functions.php loads.
const theme = !!process.env.THEME_BUILD

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: theme ? './' : '/',
  server: {
    // Offline mode imports the sample data from the plugin folder.
    fs: { allow: ['..'] },
  },
  build: theme
    ? {
        outDir: '../wordpress-theme/moroccotravely/app',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            entryFileNames: 'app.js',
            chunkFileNames: 'chunk-[hash].js',
            assetFileNames: (info) => (info.names?.some((n) => n.endsWith('.css')) ? 'app.css' : 'assets/[name]-[hash][extname]'),
          },
        },
      }
    : {},
})
