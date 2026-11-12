// Capa: contexto (estado) del módulo "auth".
// Responsabilidad: orquestar el estado de sesión con useReducer y exponer
// acciones de alto nivel a la app. Aquí vive la lógica async (llama servicios
// y despacha acciones); el reducer permanece puro.

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  bootstrapAuthSessionRequest,
  isInvalidSessionError,
  isTransientSessionError,
} from '@/modules/auth/services/auth-session.service'
import type { User } from '@/modules/auth/types/user.types'
import {
  completeOnboardingRequest,
  loginWithEmailRequest,
  logoutRequest,
  saveOnboardingProgressRequest,
} from '@/modules/auth/services/auth.service'
import { loginWithGoogleRequest } from '@/modules/auth/services/google-auth.service'
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/modules/auth/utils/authSessionStorage'
import {
  clearAccessToken,
  readAccessToken,
} from '@/modules/auth/utils/accessTokenStorage'
import { isAccessTokenExpired } from '@/modules/auth/utils/decodeAccessToken'
import {
  clearSessionExpiryNotice,
  markSessionExpired,
  sanitizeReturnPath,
} from '@/modules/auth/utils/sessionExpiryNotice'
import { clearUserOperationalDrafts } from '@/modules/operational-cards/services/clear-user-drafts'
import { ApiError, setUnauthorizedHandler } from '@/shared/api/http'
import { getErrorMessage } from '@/shared/utils/error'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
  /** Bootstrap falló por red/5xx: se puede reintentar sin perder el token. */
  canRetrySession: boolean
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_BOOTSTRAP_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_ERROR'; error: string }
  | {
      type: 'AUTH_BOOTSTRAP_TRANSIENT_FAILURE'
      error: string
      user: User | null
    }
  | { type: 'AUTH_LOGOUT' }

function createInitialState(): AuthState {
  const token = readAccessToken()
  if (!token) {
    const staleSession = readAuthSession()
    if (staleSession) {
      clearAuthSession()
    }
    return {
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      canRetrySession: false,
    }
  }

  return {
    user: readAuthSession(),
    isAuthenticated: false,
    loading: true,
    error: null,
    canRetrySession: false,
  }
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      // Conserva el error previo para que el login no “salte” al reintentar
      // (el mensaje se reemplaza al terminar, no se vacía a mitad).
      return { ...state, loading: true, canRetrySession: false }

    case 'AUTH_BOOTSTRAP_START':
      return { ...state, loading: true, error: null, canRetrySession: false }

    case 'AUTH_SUCCESS':
      return {
        user: action.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        canRetrySession: false,
      }

    case 'AUTH_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
        canRetrySession: false,
      }

    case 'AUTH_BOOTSTRAP_TRANSIENT_FAILURE':
      return {
        user: action.user,
        // Con usuario en caché se mantiene la UI usable; sin él, se muestra
        // reintento sin fingir autenticación completa.
        isAuthenticated: Boolean(action.user),
        loading: false,
        error: action.error,
        canRetrySession: true,
      }

    case 'AUTH_LOGOUT':
      return {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        canRetrySession: false,
      }

    default: {
      const _exhaustive: never = action
      void _exhaustive
      return state
    }
  }
}

export interface AuthContextValue extends AuthState {
  /** Splash post-login a nivel de app (sobrevive el cambio de ruta). */
  bootSplashActive: boolean
  beginBootSplash: () => void
  endBootSplash: () => void
  loginWithEmail: (email: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => Promise<void>
  /** Reintenta `/auth/me` tras un fallo transitorio de red/5xx. */
  retrySessionBootstrap: () => Promise<void>
  completeOnboarding: () => Promise<void>
  saveOnboardingProgress: (step: number, completed?: boolean) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function currentReturnPath(): string | null {
  if (typeof window === 'undefined') return null
  return sanitizeReturnPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    authReducer,
    undefined,
    createInitialState,
  )
  const [bootSplashActive, setBootSplashActive] = useState(false)
  const currentUserRef = useRef(state.user)
  const onboardingMutationQueueRef = useRef<Promise<void>>(Promise.resolve())
  currentUserRef.current = state.user

  const clearSession = useCallback((options?: { voluntary?: boolean }) => {
    const previousUserId = currentUserRef.current?.id ?? null
    if (options?.voluntary && previousUserId) {
      clearUserOperationalDrafts(previousUserId)
      clearSessionExpiryNotice()
    }
    currentUserRef.current = null
    clearAccessToken()
    clearAuthSession()
    setBootSplashActive(false)
    dispatch({ type: 'AUTH_LOGOUT' })
  }, [])

  const invalidateSession = useCallback(
    (reason: 'expired' | 'unauthorized') => {
      markSessionExpired({
        reason,
        returnPath: currentReturnPath(),
        userId: currentUserRef.current?.id ?? readAuthSession()?.id ?? null,
      })
      clearSession()
    },
    [clearSession],
  )

  useEffect(() => {
    setUnauthorizedHandler(() => {
      invalidateSession('expired')
    })

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [invalidateSession])

  const runBootstrap = useCallback(async (cancelled: () => boolean) => {
    dispatch({ type: 'AUTH_BOOTSTRAP_START' })
    const token = readAccessToken()
    if (!token) {
      dispatch({ type: 'AUTH_LOGOUT' })
      return
    }

    if (isAccessTokenExpired(token)) {
      if (cancelled()) return
      invalidateSession('expired')
      return
    }

    try {
      const user = await bootstrapAuthSessionRequest()
      if (cancelled()) return
      writeAuthSession(user)
      clearSessionExpiryNotice()
      dispatch({ type: 'AUTH_SUCCESS', user })
    } catch (error) {
      if (cancelled()) return

      if (isInvalidSessionError(error)) {
        const status = error instanceof ApiError ? error.status : 401
        invalidateSession(status === 403 ? 'unauthorized' : 'expired')
        return
      }

      if (isTransientSessionError(error)) {
        const cached = readAuthSession()
        dispatch({
          type: 'AUTH_BOOTSTRAP_TRANSIENT_FAILURE',
          error:
            'No pudimos verificar tu sesión por un problema temporal de conexión. Puedes reintentar sin perder el trabajo en curso.',
          user: cached,
        })
        return
      }

      // Token ilegible u otro error local de sesión: limpiar.
      clearAccessToken()
      clearAuthSession()
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [invalidateSession])

  useEffect(() => {
    const token = readAccessToken()
    if (!token) return

    let cancelled = false
    void runBootstrap(() => cancelled)

    return () => {
      cancelled = true
    }
  }, [runBootstrap])

  const retrySessionBootstrap = useCallback(async () => {
    await runBootstrap(() => false)
  }, [runBootstrap])

  const beginBootSplash = useCallback(() => {
    setBootSplashActive(true)
  }, [])

  const endBootSplash = useCallback(() => {
    setBootSplashActive(false)
  }, [])

  const loginWithEmail = useCallback(async (email: string) => {
    dispatch({ type: 'AUTH_START' })
    try {
      const user = await loginWithEmailRequest(email)
      writeAuthSession(user)
      dispatch({ type: 'AUTH_SUCCESS', user })
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', error: getErrorMessage(error) })
    }
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    dispatch({ type: 'AUTH_START' })
    try {
      const user = await loginWithGoogleRequest(credential)
      writeAuthSession(user)
      dispatch({ type: 'AUTH_SUCCESS', user })
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', error: getErrorMessage(error) })
    }
  }, [])

  const logout = useCallback(async () => {
    dispatch({ type: 'AUTH_START' })
    try {
      await logoutRequest()
    } finally {
      clearSession({ voluntary: true })
    }
  }, [clearSession])

  const completeOnboarding = useCallback((): Promise<void> => {
    const requestedBy = currentUserRef.current
    if (!requestedBy) return Promise.resolve()

    const mutation = onboardingMutationQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const current = currentUserRef.current
        if (!current || current.id !== requestedBy.id) return

        const updated = await completeOnboardingRequest(current)
        if (currentUserRef.current?.id !== requestedBy.id) return

        currentUserRef.current = updated
        writeAuthSession(updated)
        dispatch({ type: 'AUTH_SUCCESS', user: updated })
      })

    onboardingMutationQueueRef.current = mutation.catch(() => undefined)
    return mutation
  }, [])

  const saveOnboardingProgress = useCallback(
    (step: number, completed?: boolean): Promise<void> => {
      const requestedBy = currentUserRef.current
      if (!requestedBy) return Promise.resolve()

      const mutation = onboardingMutationQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          const current = currentUserRef.current
          if (!current || current.id !== requestedBy.id) return

          const updated = await saveOnboardingProgressRequest(
            current,
            step,
            completed,
          )
          if (currentUserRef.current?.id !== requestedBy.id) return

          currentUserRef.current = updated
          writeAuthSession(updated)
          dispatch({ type: 'AUTH_SUCCESS', user: updated })
        })

      onboardingMutationQueueRef.current = mutation.catch(() => undefined)
      return mutation.catch(() => undefined)
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      bootSplashActive,
      beginBootSplash,
      endBootSplash,
      loginWithEmail,
      loginWithGoogle,
      logout,
      retrySessionBootstrap,
      completeOnboarding,
      saveOnboardingProgress,
    }),
    [
      state,
      bootSplashActive,
      beginBootSplash,
      endBootSplash,
      loginWithEmail,
      loginWithGoogle,
      logout,
      retrySessionBootstrap,
      completeOnboarding,
      saveOnboardingProgress,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
