import { useAuth } from '@/modules/auth/hooks/useAuth'
import { NovexUserMenu } from '@/shared/components/NovexUserMenu'
import { NovexViewHelp } from '@/shared/components/NovexViewHelp'
import type { ReactNode } from 'react'

interface NovexProductHeaderProps {
  title: string
  eyebrow?: string
  context?: string
  middle?: ReactNode
  /** Contenido del popover de ayuda. Si se omite, no se muestra el botón. */
  help?: ReactNode
  helpTitle?: string
}

export function NovexProductHeader({
  title,
  eyebrow = 'Visión general',
  context,
  middle,
  help,
  helpTitle,
}: NovexProductHeaderProps) {
  const { user } = useAuth()

  return (
    <header className="novex-os-topbar">
      <div className="novex-os-topbar__heading">
        <p className="novex-os-topbar__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="novex-os-topbar__route">
          <span aria-hidden="true" />
          {context ?? user?.name ?? 'Sesión activa'}
        </p>
      </div>

      {middle ? (
        <div className="novex-os-topbar__middle">{middle}</div>
      ) : null}

      <div className="novex-os-topbar__actions" aria-label="Acciones del encabezado">
        <NovexUserMenu />
        {help ? (
          <NovexViewHelp title={helpTitle}>{help}</NovexViewHelp>
        ) : null}
      </div>
    </header>
  )
}
