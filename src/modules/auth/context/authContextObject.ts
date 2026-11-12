import { createContext } from 'react'
import type { AuthContextValue } from './AuthContext'

/**
 * El objeto de contexto vive fuera de `AuthContext.tsx`: así ese archivo solo
 * exporta componentes y la recarga en caliente no crea un segundo contexto
 * que deje a los consumidores sin proveedor.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
