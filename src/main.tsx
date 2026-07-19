import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ResponsiveProvider } from './utils/responsive'
import { NavigationProvider } from './utils/navigation'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ResponsiveProvider>
      <NavigationProvider>
        <App />
      </NavigationProvider>
    </ResponsiveProvider>
  </StrictMode>,
)
