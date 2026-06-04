// Installs the Buffer global. MUST be the first import — TON SDK modules read
// Buffer at evaluation time, which happens before this module's body runs.
import './polyfills'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { TonConnectUIProvider } from '@tonconnect/ui-react'
import './index.css'
import App from './App.tsx'

// Works both locally and under a GitHub Pages sub-path.
const manifestUrl = new URL(
  `${import.meta.env.BASE_URL}tonconnect-manifest.json`,
  window.location.href,
).href

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </TonConnectUIProvider>
  </StrictMode>,
)
