import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App'

// REMINDER: run supabase/migrations/008_api_usage.sql in Supabase SQL editor before deploying
const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
