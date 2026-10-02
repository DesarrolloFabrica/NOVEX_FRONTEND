import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CharacterLivesShowcase } from '@/dev/CharacterLivesShowcase'

/**
 * Entrada del showcase de desarrollo. Solo la carga `dev/character-lives.html`
 * con el servidor de Vite; no es entrada de `vite build`.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CharacterLivesShowcase />
  </StrictMode>,
)
