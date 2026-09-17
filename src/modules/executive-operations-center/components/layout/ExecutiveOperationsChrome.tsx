import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { NovexBrandMark } from '@/shared/components/NovexBrandMark'
import { NovexPlatformMenu } from '@/shared/components/NovexPlatformMenu'
import { NovexUserMenu } from '@/shared/components/NovexUserMenu'
import { NovexViewHelp } from '@/shared/components/NovexViewHelp'
import {
  NOVEX_BETA_HINT,
  NOVEX_BETA_LABEL,
} from '@/shared/constants/platformStatus'
import { visibleSubNavItems } from '@/modules/executive-operations-center/constants/navigation'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { normalizeRoleCode } from '@/modules/auth/utils/roleExperience'
import { EXECUTIVE_OPERATIONS_HOME } from '@/modules/executive-operations-center/constants/routes'
import '@/modules/executive-operations-center/styles/executive-chrome.css'

/**
 * Chrome del Centro Operacional: UNA sola fila.
 *
 * Sustituye a la composición anterior de dos filas —`NovexProductHeader` con
 * encabezado de tres líneas, más `.eoc-subnav` debajo—, que consumía ~161 px de
 * alto para decir tres cosas que la pantalla ya comunica. Aquí queda:
 *
 *   [NOVEX · Centro operacional] [Inicio | Panorama | IA | Auditoría] [Plataforma ▾] [?] [Usuario ▾]
 *
 * Se conserva deliberadamente:
 * - la identificación de pantalla, en dos líneas cortas (`NOVEX` sobre
 *   `Centro operacional`), no tres descriptivas;
 * - el `h1` con el nombre exacto de la pantalla, que es el nombre accesible de
 *   la vista y no solo decoración;
 * - las cuatro SECCIONES del Centro visibles y horizontales, con las clases
 *   `.eoc-subnav__link` que ya tenían, así que su tratamiento activo/hover no
 *   cambia;
 * - la ayuda contextual y el menú de usuario, que es donde vive «Cerrar
 *   sesión» ahora que el pie del carril no está.
 *
 * `NovexProductHeader` sigue intacto y en uso por las demás experiencias: esta
 * fase no lo modifica, solo deja de usarlo aquí.
 */

export interface ExecutiveOperationsChromeProps {
  /** Contenido del popover de ayuda de la sección activa. */
  help?: ReactNode
  helpTitle?: string
}

export function ExecutiveOperationsChrome({
  help,
  helpTitle,
}: ExecutiveOperationsChromeProps) {
  /*
   * Solo las secciones que este rol puede abrir de verdad. El coordinador ve
   * «Inicio» y nada más: las otras tres tienen guarda de `EXECUTIVE_ROLES` y lo
   * habrían devuelto a su landing en cuanto pulsara.
   */
  const { user } = useAuth()
  const secciones = visibleSubNavItems(normalizeRoleCode(user?.roleCode))

  return (
    <header className="eoc-chrome" data-testid="eoc-chrome">
      <div className="eoc-chrome__brand">
        <span className="eoc-chrome__mark-wrap" title={NOVEX_BETA_HINT}>
          <NovexBrandMark size="rail" className="eoc-chrome__mark" />
        </span>
        <div className="eoc-chrome__identity">
          <span className="eoc-chrome__wordmark">
            NOVEX
            <span
              className="novex-beta-mark"
              title={NOVEX_BETA_HINT}
              aria-label={NOVEX_BETA_HINT}
            >
              {NOVEX_BETA_LABEL}
            </span>
          </span>
          {/* Nombre de la pantalla. Estable en las cuatro secciones: la sección
              activa la marca la navegación, no el título. */}
          <h1 className="eoc-chrome__title">Centro operacional</h1>
        </div>
      </div>

      <nav
        className="eoc-subnav eoc-chrome__sections"
        aria-label="Secciones del centro operacional"
      >
        {secciones.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            viewTransition
            className={({ isActive }) =>
              `eoc-subnav__link ${isActive ? 'is-active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="eoc-chrome__actions">
        <NovexPlatformMenu excludeTo={EXECUTIVE_OPERATIONS_HOME} />
        {help ? <NovexViewHelp title={helpTitle}>{help}</NovexViewHelp> : null}
        <NovexUserMenu />
      </div>
    </header>
  )
}
