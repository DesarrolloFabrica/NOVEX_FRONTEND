// Capa: canal mínimo entre LoginPage y el host de la transición post-login.
// Responsabilidad: decir cuánto esperar antes de cerrar (la reacción realmente
// aceptada por el personaje), sin pasar por AuthContext ni por el DOM.

import { createContext, useContext } from 'react'

export interface PostLoginTransitionCue {
  /** LoginPage: anota la espera antes de pedir la transición (0 = cerrar ya). */
  holdForReaction: (ms: number) => void
  /** Host: consume la espera anotada (se limpia al leerla). */
  takeReactionHold: () => number
}

/** Sin proveedor, nada que esperar: la transición cerraría de inmediato. */
const NO_CUE: PostLoginTransitionCue = {
  holdForReaction: () => {},
  takeReactionHold: () => 0,
}

export const PostLoginTransitionCueContext = createContext<PostLoginTransitionCue>(NO_CUE)

export function usePostLoginTransitionCue(): PostLoginTransitionCue {
  return useContext(PostLoginTransitionCueContext)
}

/** Implementación del canal sobre un contenedor mutable (sin renders). */
export function createPostLoginTransitionCue(): PostLoginTransitionCue {
  let holdMs = 0
  return {
    holdForReaction: (ms) => {
      holdMs = Math.max(0, ms)
    },
    takeReactionHold: () => {
      const value = holdMs
      holdMs = 0
      return value
    },
  }
}
