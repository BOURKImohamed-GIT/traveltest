import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App'
import { BASE_PATH } from './config'
import './index.css'

// Embedded previews (no server-side URL rewrites) keep navigation in memory.
const memory = !!import.meta.env.VITE_MEMORY_ROUTER

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {memory ? (
      <MemoryRouter>
        <App />
      </MemoryRouter>
    ) : (
      <BrowserRouter basename={BASE_PATH}>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
)
