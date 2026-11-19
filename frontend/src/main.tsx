import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './brand/brand.css'
import './brand/ops-login.css'
import './index.css'
import { initBrand } from './brand/brand'
import App from './App.tsx'

// Theme resolved by src/brand (URL > shell > branding.json > env). Never throws.
void initBrand()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
