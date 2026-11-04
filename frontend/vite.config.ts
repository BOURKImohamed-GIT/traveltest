import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// THEME_BUILD=1 builds into the WordPress theme (wordpress-theme/moroccotravely/app)
// with fixed file names that the theme's functions.php loads.
const theme = !!process.env.THEME_BUILD

// https://vite.dev/config/
// Changes whenever the logo file changes, so browsers and caches fetch the new logo.
const logoVersion = createHash('md5').update(readFileSync('public/images/logo.png')).digest('hex').slice(0, 8)

export default defineConfig({
  plugins: [react()],
  define: { __LOGO_VERSION__: JSON.stringify(logoVersion) },
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
