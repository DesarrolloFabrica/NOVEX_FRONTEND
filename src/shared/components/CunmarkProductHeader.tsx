import { useAuth } from '@/modules/auth/hooks/useAuth'
import { CunmarkUserMenu } from '@/shared/components/CunmarkUserMenu'
import { CunmarkViewHelp } from '@/shared/components/CunmarkViewHelp'
import type { ReactNode } from 'react'

interface CunmarkProductHeaderProps {
  title: string
  eyebrow?: string
  context?: string
  /** Contenido del popover de ayuda. Si se omite, no se muestra el botón. */
  help?: ReactNode
  helpTitle?: string
}

export function CunmarkProductHeader({
  title,
  eyebrow = 'Visión general',
  context,
  help,
  helpTitle,
}: CunmarkProductHeaderProps) {
  const { user } = useAuth()

  return (
    <header className="cunmark-os-topbar">
      <div className="cunmark-os-topbar__heading">
        <p className="cunmark-os-topbar__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="cunmark-os-topbar__route">
          <span aria-hidden="true" />
          {context ?? user?.name ?? 'Sesión activa'}
        </p>
      </div>

      <div className="cunmark-os-topbar__actions" aria-label="Acciones del encabezado">
        <CunmarkUserMenu />
        {help ? (
          <CunmarkViewHelp title={helpTitle}>{help}</CunmarkViewHelp>
        ) : null}
      </div>
    </header>
  )
}
