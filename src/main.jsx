import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/outfit'
import '@fontsource-variable/instrument-sans'
import './index.css'
import App from './App.jsx'

// /admin is its own chunk: visitors never download the dashboard or the PDF reader.
const isAdmin = /^\/admin(\/|$)/.test(window.location.pathname)
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={<div className="min-h-svh bg-ground" />}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
