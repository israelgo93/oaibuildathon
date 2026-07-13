import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './Router'
import './styles.css'
import './system.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('No se encontro el elemento raiz de la aplicacion')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
