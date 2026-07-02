// Capa: contexto (estado) del módulo "auth".
// Responsabilidad: orquestar el estado de sesión con useReducer y exponer
// acciones de alto nivel a la app. Aquí vive la lógica async (llama servicios
// y despacha acciones); el reducer permanece puro.

import { createContext, useCallback, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@/modules/auth/types/user.types'
import {
  loginAsEjecutorRequest,
  loginAsSupervisorRequest,
  logoutRequest,
} from '@/modules/auth/services/auth.service'
import { getErrorMessage } from '@/shared/utils/error'

/** Estado de autenticación. */
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  error: string | null
}

/** Acciones del reducer de auth (unión discriminada por `type`). */
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; user: User }
  | { type: 'AUTH_ERROR'; error: string }
  | { type: 'AUTH_LOGOUT' }

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
}

/** Reducer puro de autenticación. */
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
      return { ...initialState }

    default:
      return state
  }
}

/** Valor expuesto por el contexto: estado + acciones de alto nivel. */
export interface AuthContextValue extends AuthState {
  /** Inicia sesión como supervisor. */
  loginAsSupervisor: () => Promise<void>
  /** Inicia sesión como ejecutor de un área operativa (requiere areaId). */
  loginAsEjecutor: (areaId: string) => Promise<void>
  /** Cierra la sesión actual. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  const loginAsSupervisor = useCallback(async () => {
    dispatch({ type: 'AUTH_START' })
    try {
      const user = await loginAsSupervisorRequest()
      dispatch({ type: 'AUTH_SUCCESS', user })
    } catch (error) {
      dispatch({ type: 'AUTH_ERROR', error: getErrorMessage(error) })
    }
  }, [])

  const loginAsEjecutor = useCallback(async (areaId: string) => {
    dispatch({ type: 'AUTH_START' })
    try {
      const user = await loginAsEjecutorRequest(areaId)
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
      // Aunque falle la llamada simulada, localmente cerramos la sesión.
      dispatch({ type: 'AUTH_LOGOUT' })
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, loginAsSupervisor, loginAsEjecutor, logout }),
    [state, loginAsSupervisor, loginAsEjecutor, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
