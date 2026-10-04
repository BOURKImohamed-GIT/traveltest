import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import './index.css'

// Embedded previews (no server-side URL rewrites) keep navigation in memory.
const Router = import.meta.env.VITE_MEMORY_ROUTER ? MemoryRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)
