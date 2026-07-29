import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { App } from '@/app/App'
import '@/index.css'
import '@/styles/novex-os.css'
import '@/styles/login.css'
import '@/styles/platform-backgrounds.css'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

if (!googleClientId) {
  throw new Error('Falta VITE_GOOGLE_CLIENT_ID en el entorno del frontend.')
}

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <StrictMode>
      <App />
    </StrictMode>
  </GoogleOAuthProvider>,
)
