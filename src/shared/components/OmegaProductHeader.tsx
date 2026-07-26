import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { OmegaIcon } from '@/shared/components/OmegaIcon'
import { OmegaUserMenu } from '@/shared/components/OmegaUserMenu'

interface OmegaProductHeaderProps {
  title: string
  eyebrow?: string
  /** Muestra el botón de ayuda contextual junto al menú de usuario. */
  showHelp?: boolean
}

export function OmegaProductHeader({
  title,
  eyebrow = 'Centro de Inteligencia Operacional',
  showHelp = false,
}: OmegaProductHeaderProps) {
  const { user } = useAuth()
  const [helpOpen, setHelpOpen] = useState(false)
  const helpRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!helpOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!helpRef.current?.contains(event.target as Node)) setHelpOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setHelpOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [helpOpen])

  return (
    <header className="omega-os-topbar">
      <div className="omega-os-topbar__heading">
        <p className="omega-os-topbar__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="omega-os-topbar__route">
          <span aria-hidden="true" />
          {user?.name ?? 'Sesión activa'}
        </p>
      </div>

      <div className="omega-os-topbar__actions" aria-label="Acciones del encabezado">
        <OmegaUserMenu />
        {showHelp ? (
          <div className="omega-help-menu" ref={helpRef}>
            <button
              type="button"
              className="omega-help-menu__trigger"
              aria-label="Información sobre esta vista"
              aria-expanded={helpOpen}
              aria-controls="omega-view-help"
              onClick={() => setHelpOpen((value) => !value)}
            >
              <OmegaIcon name="help" size={14} strokeWidth={1.5} />
            </button>
            {helpOpen ? (
              <aside
                id="omega-view-help"
                className="omega-help-menu__popover"
                aria-label="Información sobre esta vista"
              >
                <strong>Información sobre esta vista</strong>
                <p>
                  Aquí puede consultar la recomendación de la IA, identificar
                  prioridades y abrir cada situación para tomar una decisión.
                </p>
                <p>
                  Use <b>Registrar situación</b> cuando ocurra un nuevo evento
                  operativo que deba analizarse.
                </p>
              </aside>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
