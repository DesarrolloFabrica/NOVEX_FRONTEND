// Capa: página de acceso (antesala de la Sala O.M.E.G.A.).
// Responsabilidad: COMPONER la vista de acceso y delegar la lógica al contexto.
// El componente no contiene reglas de negocio: solo invoca acciones de useAuth
// y reacciona al estado (loading/error/isAuthenticated). Esta fase es puramente
// visual: alinea el login con el lenguaje y la paleta del Centro de Monitoreo.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { OPERATIONAL_AREAS } from '@/modules/areas/data/areas.mock'
import {
  FOCUS_VISIBLE,
  PANEL,
  PANEL_QUIET,
  ROOM_SURFACE,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'

export function LoginPage() {
  const { isAuthenticated, loading, error, loginAsSupervisor, loginAsEjecutor } =
    useAuth()
  const navigate = useNavigate()
  const [areaId, setAreaId] = useState<string>(OPERATIONAL_AREAS[0]?.id ?? '')

  // Cuando la sesión queda activa, se navega al Centro de Monitoreo.
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/monitoring', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <main className={`${ROOM_SURFACE} flex items-center justify-center px-4 py-10`}>
      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2">
        {/* Identidad institucional de la sala. */}
        <section className="text-center lg:text-left">
          <div className="mb-3 flex items-center justify-center gap-2 lg:justify-start">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            <span className={TEXT_LABEL}>Centro de Monitoreo Operativo</span>
          </div>
          <h1 className="text-5xl font-bold tracking-[0.3em] text-slate-100">
            O.M.E.G.A.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
            Antesala de acceso a la Sala de Operaciones. Valida los compromisos
            institucionales por área durante el precomité y monitorea la salud
            operativa en tiempo real.
          </p>
        </section>

        {/* Controles de acceso. */}
        <section className={`p-6 sm:p-8 ${PANEL}`}>
          <header className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100">
              Acceso a la Sala
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Selecciona tu modo de operación para ingresar.
            </p>
          </header>

          {error && (
            <p className="mb-5 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-900/60">
              {error}
            </p>
          )}

          {/* Acceso Supervisor. */}
          <div className={`p-4 ${PANEL_QUIET}`}>
            <p className={TEXT_LABEL}>Supervisor</p>
            <p className="mt-1 mb-3 text-sm text-slate-400">
              Acceso a la visión global y a la validación de compromisos.
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loginAsSupervisor()}
              className={`w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white ring-1 ring-inset ring-indigo-500/60 transition-colors duration-200 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_VISIBLE}`}
            >
              Ingresar como Supervisor
            </button>
          </div>

          {/* Separador entre modos de acceso. */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-800/70" />
            <span className="text-[11px] uppercase tracking-[0.18em] text-slate-600">
              o
            </span>
            <span className="h-px flex-1 bg-slate-800/70" />
          </div>

          {/* Acceso Ejecutor. */}
          <div className={`p-4 ${PANEL_QUIET}`}>
            <p className={TEXT_LABEL}>Ejecutor</p>
            <p className="mt-1 mb-3 text-sm text-slate-400">
              Acceso a los compromisos del área seleccionada.
            </p>
            <label
              htmlFor="area"
              className="mb-1.5 block text-[11px] uppercase tracking-[0.18em] text-slate-500"
            >
              Área operativa
            </label>
            <select
              id="area"
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
              className="mb-3 w-full rounded-lg bg-slate-900/60 px-3 py-2 text-slate-100 ring-1 ring-inset ring-slate-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {OPERATIONAL_AREAS.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={loading || !areaId}
              onClick={() => void loginAsEjecutor(areaId)}
              className={`w-full rounded-lg bg-slate-800/80 px-4 py-2.5 font-medium text-slate-100 ring-1 ring-inset ring-slate-700 transition-colors duration-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_VISIBLE}`}
            >
              Ingresar como Ejecutor
            </button>
          </div>

          <p className="mt-5 text-center text-xs text-slate-600">
            {loading ? 'Conectando con la Sala…' : 'Entorno de demostración'}
          </p>
        </section>
      </div>
    </main>
  )
}
