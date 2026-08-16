import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Bootstrap carries all styling for this app — no custom stylesheet.
import 'bootstrap/dist/css/bootstrap.min.css'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
