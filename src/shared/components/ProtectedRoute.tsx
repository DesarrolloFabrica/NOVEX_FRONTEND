// Capa: componente compartido (guard de rutas).
// Responsabilidad: proteger rutas que requieren sesión. Si no hay usuario
// autenticado, redirige a /login; en caso contrario, renderiza la ruta hija.

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { RouteFallback } from '@/shared/components/RouteFallback'

export function ProtectedRoute() {
  const { isAuthenticated, loading, canRetrySession, error, retrySessionBootstrap } =
    useAuth()
  const location = useLocation()

  if (loading) {
    // Mismo escenario que la pantalla final (ver RouteFallback).
    return <RouteFallback label="Validando sesión…" />
  }

  if (canRetrySession && !isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#160d0b] px-6 text-center text-sm text-amber-50/90">
        <p role="alert">{error ?? 'No pudimos verificar tu sesión.'}</p>
        <button
          type="button"
          className="rounded border border-slate-600 px-4 py-2 text-slate-100 hover:border-slate-400"
          onClick={() => {
            void retrySessionBootstrap()
          }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }

  return (
    <>
      {canRetrySession && error ? (
        <div
          role="status"
          className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-950/90 px-4 py-2 text-center text-sm text-amber-100"
        >
          <span>{error}</span>
          <button
            type="button"
            className="rounded border border-amber-400/60 px-3 py-1 text-amber-50 hover:border-amber-200"
            onClick={() => {
              void retrySessionBootstrap()
            }}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      <Outlet />
    </>
  )
}
