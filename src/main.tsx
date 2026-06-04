import { Buffer } from 'buffer'
// TON SDK relies on Buffer being available globally in the browser.
;(globalThis as unknown as { Buffer: typeof Buffer }).Buffer =
  (globalThis as unknown as { Buffer?: typeof Buffer }).Buffer || Buffer

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
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TonConnectUIProvider>
  </StrictMode>,
)
