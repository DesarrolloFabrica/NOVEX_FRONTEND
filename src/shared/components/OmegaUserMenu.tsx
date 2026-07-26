import { useEffect, useRef, useState } from 'react'
import { OmegaIcon } from '@/shared/components/OmegaIcon'
import { useAuth } from '@/modules/auth/hooks/useAuth'

interface OmegaUserMenuProps {
  onLogout?: () => void
}

export function OmegaUserMenu({ onLogout }: OmegaUserMenuProps) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const firstName = user?.name?.split(' ')[0] ?? 'Operador'
  const role = user?.role === 'supervisor' ? 'Supervisora General' : 'Ejecutor operativo'

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function handleLogout() {
    setOpen(false)
    if (onLogout) onLogout()
    else await logout()
  }

  return (
    <div className="omega-user-menu" ref={rootRef}>
      <button
        type="button"
        className="omega-user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de usuario: ${user?.name ?? 'Operador O.M.E.G.A.'}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="omega-user-menu__avatar" aria-hidden="true">
          {firstName.slice(0, 1)}
        </span>
        <span className="omega-user-menu__identity">
          <strong>{user?.name ?? 'Operador O.M.E.G.A.'}</strong>
          <small>{role}</small>
        </span>
        <OmegaIcon name="chevron-down" size={15} className="omega-user-menu__chevron" />
      </button>

      {open ? (
        <div className="omega-user-menu__popover" role="menu">
          <div className="omega-user-menu__popover-head">
            <span className="omega-user-menu__status-dot" aria-hidden="true" />
            <div>
              <strong>Sesión activa</strong>
              <small>Acceso protegido · O.M.E.G.A.</small>
            </div>
          </div>
          <div className="omega-user-menu__items">
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <OmegaIcon name="user" />
              Perfil
            </button>
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <OmegaIcon name="grid" />
              Cambiar rol <span className="omega-user-menu__mock">mock</span>
            </button>
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <OmegaIcon name="settings" />
              Preferencias
            </button>
          </div>
          <button
            type="button"
            role="menuitem"
            className="omega-user-menu__logout"
            onClick={() => void handleLogout()}
          >
            <OmegaIcon name="log-out" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  )
}
