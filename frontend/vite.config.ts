import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Offline mode imports the sample data from ../backend/scripts.
    fs: { allow: ['..'] },
  },
})
