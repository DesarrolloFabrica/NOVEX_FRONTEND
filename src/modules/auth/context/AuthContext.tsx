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
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { bootstrapAuthSessionRequest } from '@/modules/auth/services/auth-session.service'
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
import { setUnauthorizedHandler } from '@/shared/api/http'
import { getErrorMessage } from '@/shared/utils/error'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_BOOTSTRAP_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_ERROR'; error: string }
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
    }
  }

  return {
    user: readAuthSession(),
    isAuthenticated: false,
    loading: true,
    error: null,
  }
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
    case 'AUTH_BOOTSTRAP_START':
      return { ...state, loading: true, error: null }

    case 'AUTH_SUCCESS':
      return {
        user: action.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      }

    case 'AUTH_ERROR':
      return { ...state, loading: false, error: action.error }

    case 'AUTH_LOGOUT':
      return {
        user: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      }

    default:
      return state
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
  completeOnboarding: () => Promise<void>
  saveOnboardingProgress: (step: number, completed?: boolean) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    authReducer,
    undefined,
    createInitialState,
  )
  const [bootSplashActive, setBootSplashActive] = useState(false)

  const clearSession = useCallback(() => {
    clearAccessToken()
    clearAuthSession()
    setBootSplashActive(false)
    dispatch({ type: 'AUTH_LOGOUT' })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
    })

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearSession])

  useEffect(() => {
    const token = readAccessToken()
    if (!token) return

    let cancelled = false

    async function bootstrap() {
      dispatch({ type: 'AUTH_BOOTSTRAP_START' })
      try {
        const user = await bootstrapAuthSessionRequest()
        if (cancelled) return
        writeAuthSession(user)
        dispatch({ type: 'AUTH_SUCCESS', user })
      } catch {
        if (cancelled) return
        clearAccessToken()
        clearAuthSession()
        dispatch({ type: 'AUTH_LOGOUT' })
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

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
      clearSession()
    }
  }, [clearSession])

  const completeOnboarding = useCallback(async () => {
    if (!state.user || state.user.onboardingCompleted) return
    const current = state.user
    const updated = await completeOnboardingRequest(current)
    writeAuthSession(updated)
    dispatch({ type: 'AUTH_SUCCESS', user: updated })
  }, [state.user])

  const saveOnboardingProgress = useCallback(
    async (step: number, completed = false) => {
      if (!state.user) return
      const current = state.user
      try {
        const updated = await saveOnboardingProgressRequest(
          current,
          step,
          completed,
        )
        writeAuthSession(updated)
        dispatch({ type: 'AUTH_SUCCESS', user: updated })
      } catch {
        // El recorrido conserva una copia local si la sincronización falla.
      }
    },
    [state.user],
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
      completeOnboarding,
      saveOnboardingProgress,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
