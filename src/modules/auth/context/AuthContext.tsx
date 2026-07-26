// Capa: contexto (estado) del módulo "auth".
// Responsabilidad: orquestar el estado de sesión con useReducer y exponer
// acciones de alto nivel a la app. Aquí vive la lógica async (llama servicios
// y despacha acciones); el reducer permanece puro.

import { createContext, useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/modules/auth/types/user.types'
import {
  completeOnboardingRequest,
  loginAsEjecutorRequest,
  loginAsSupervisorRequest,
  logoutRequest,
} from '@/modules/auth/services/auth.service'
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/modules/auth/utils/authSessionStorage'
import { getErrorMessage } from '@/shared/utils/error'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'AUTH_LOGOUT' }

function createInitialState(): AuthState {
  const session = readAuthSession()
  if (!session) {
    return {
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    }
  }

  return {
    user: session,
    isAuthenticated: true,
    loading: false,
    error: null,
  }
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
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
  loginAsSupervisor: () => Promise<void>
  loginAsEjecutor: (areaId: string) => Promise<void>
  logout: () => Promise<void>
  completeOnboarding: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, createInitialState)

  const loginAsSupervisor = useCallback(async () => {
    dispatch({ type: 'AUTH_START' })
    try {
      const user = await loginAsSupervisorRequest()
      writeAuthSession(user)
      dispatch({ type: 'AUTH_SUCCESS', user })
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', error: getErrorMessage(error) })
    }
  }, [])

  const loginAsEjecutor = useCallback(async (areaId: string) => {
    dispatch({ type: 'AUTH_START' })
    try {
      const user = await loginAsEjecutorRequest(areaId)
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
      clearAuthSession()
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [])

  const completeOnboarding = useCallback(async () => {
    if (!state.user || state.user.onboardingCompleted) return
    const current = state.user
    try {
      const updated = await completeOnboardingRequest(current)
      writeAuthSession(updated)
      dispatch({ type: 'AUTH_SUCCESS', user: updated })
    } catch {
      const fallback: User = {
        ...current,
        onboardingCompleted: true,
        onboardingSeenAt: new Date().toISOString(),
      }
      writeAuthSession(fallback)
      dispatch({
        type: 'AUTH_SUCCESS',
        user: fallback,
      })
    }
  }, [state.user])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      loginAsSupervisor,
      loginAsEjecutor,
      logout,
      completeOnboarding,
    }),
    [state, loginAsSupervisor, loginAsEjecutor, logout, completeOnboarding],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
