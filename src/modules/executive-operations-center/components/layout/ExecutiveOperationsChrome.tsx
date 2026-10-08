import type { ReactNode } from 'react'
import { NovexBrandMark } from '@/shared/components/NovexBrandMark'
import { NovexUserMenu } from '@/shared/components/NovexUserMenu'
import { NovexViewHelp } from '@/shared/components/NovexViewHelp'
import {
  NOVEX_BETA_HINT,
  NOVEX_BETA_LABEL,
} from '@/shared/constants/platformStatus'
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
 *
 * FASE 1 (retiro del shell legacy): salen las pestañas de sección (Panorama
 * global, Inteligencia IA, Auditoría) y el menú «Plataforma». Queda, de forma
 * TEMPORAL y sin rediseño: identidad NOVEX, nombre de la pantalla, ayuda y
 * menú de usuario (rol, cerrar sesión y, para ADMIN, Administración).
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
          {/* Nombre de la pantalla y nombre accesible de la vista. */}
          <h1 className="eoc-chrome__title">Centro operacional</h1>
        </div>
      </div>

      <div className="eoc-chrome__actions">
        {help ? <NovexViewHelp title={helpTitle}>{help}</NovexViewHelp> : null}
        <NovexUserMenu />
      </div>
    </header>
  )
}
