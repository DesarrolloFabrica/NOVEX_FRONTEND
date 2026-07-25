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

  // Sesión activa → Centro de Inteligencia Operacional (experiencia principal).
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/intelligence', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <main className={`${ROOM_SURFACE} omega-login`}>
      <div className="omega-login__scene" aria-hidden="true">
        <img src="/capas/primeraCapa.png" alt="" draggable={false} />
        <img src="/capas/SegundaCapa.png" alt="" draggable={false} />
        <div className="omega-login__scene-wash" />
      </div>

      <div className="omega-login__topbar">
        <div className="omega-login__brand">
          <span className="omega-brand-icon omega-login__brand-mark" aria-hidden="true">
            <img src="/capas/Logoprovisional.png" alt="" draggable={false} />
          </span>
          <span>O.M.E.G.A.</span>
        </div>
        <div className="omega-login__connection">
          <span aria-hidden="true" />
          Sistemas operativos
        </div>
      </div>

      <div className="omega-login__shell">
        <section className="omega-login__intro">
          <div className="omega-login__eyebrow">
            <span aria-hidden="true" />
            Centro de Inteligencia Operacional
          </div>
          <h1 className="omega-login__hero-logo">
            <span aria-hidden="true">
              Inteligencia
              <br />
              operacional
            </span>
            <span className="sr-only">O.M.E.G.A.</span>
          </h1>
          <p>
            Interpreta eventos operacionales, anticipa riesgos y coordina
            decisiones institucionales desde un único centro de inteligencia.
          </p>
          <div className="omega-login__capabilities" aria-label="Capacidades del sistema">
            <span>Eventos operacionales</span>
            <span>Interpretación con IA</span>
            <span>Tablero ejecutivo</span>
          </div>
        </section>

        <section className={`omega-login__panel ${PANEL}`}>
          <div className="omega-login__panel-scan" aria-hidden="true" />
          <header className="omega-login__panel-header">
            <div>
              <span>Autenticación segura</span>
              <h2>Acceso a la sala</h2>
              <p>Selecciona tu perfil operativo para continuar.</p>
            </div>
            <div className="omega-login__security-mark" aria-hidden="true">
              <span />
            </div>
          </header>

          {error && (
            <p className="omega-login__error" role="alert">
              {error}
            </p>
          )}

          <div className={`omega-login__access-card ${PANEL_QUIET}`}>
            <div className="omega-login__access-copy">
              <span className="omega-login__role-icon" aria-hidden="true">SG</span>
              <div>
                <p className={TEXT_LABEL}>Supervisor general</p>
                <p>Visión global, seguimiento y validación.</p>
              </div>
            </div>
            <button
              type="button"
              disabled={loading}
              aria-busy={loading}
              onClick={() => void loginAsSupervisor()}
              className={`omega-login__primary-action ${FOCUS_VISIBLE}`}
            >
              <span>Ingresar como supervisor</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="omega-login__separator">
            <span />
            <p>Acceso por área</p>
            <span />
          </div>

          <div className={`omega-login__access-card ${PANEL_QUIET}`}>
            <div className="omega-login__access-copy">
              <span className="omega-login__role-icon" aria-hidden="true">EO</span>
              <div>
                <p className={TEXT_LABEL}>Ejecutor operativo</p>
                <p>Registro y seguimiento por área operativa.</p>
              </div>
            </div>
            <label
              htmlFor="area"
              className="omega-login__field-label"
            >
              Área operativa
            </label>
            <select
              id="area"
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
              className={`omega-login__select ${FOCUS_VISIBLE}`}
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
              aria-busy={loading}
              onClick={() => void loginAsEjecutor(areaId)}
              className={`omega-login__secondary-action ${FOCUS_VISIBLE}`}
            >
              <span>Ingresar como ejecutor</span>
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <footer
            className="omega-login__panel-footer"
            aria-live="polite"
            data-state={loading ? 'loading' : 'ready'}
          >
            <span aria-hidden="true" />
            {loading ? 'Estableciendo enlace seguro…' : 'Entorno seguro de demostración'}
          </footer>
        </section>
      </div>
    </main>
  )
}
