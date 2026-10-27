// Capa: proveedor del canal LoginPage → host de la transición post-login.

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  PostLoginTransitionCueContext,
  createPostLoginTransitionCue,
} from '@/shared/transition/postLoginTransitionCue'

export function PostLoginTransitionCueProvider({ children }: { children: ReactNode }) {
  // Una instancia estable por montaje; anotar no provoca renders.
  const [cue] = useState(createPostLoginTransitionCue)
  return (
    <PostLoginTransitionCueContext.Provider value={cue}>{children}</PostLoginTransitionCueContext.Provider>
  )
}
