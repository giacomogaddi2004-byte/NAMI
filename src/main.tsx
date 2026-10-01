import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { SessionProvider } from './auth/session'
import { ConfirmProvider } from './components/Confirm'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <SessionProvider>
        <ConfirmProvider>
          <App />
        </ConfirmProvider>
      </SessionProvider>
    </HashRouter>
  </StrictMode>,
)
