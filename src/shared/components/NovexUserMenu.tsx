import { useEffect, useRef, useState } from 'react'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { useAuth } from '@/modules/auth/hooks/useAuth'

interface NovexUserMenuProps {
  onLogout?: () => void
}

export function NovexUserMenu({ onLogout }: NovexUserMenuProps) {
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
    <div className="novex-user-menu" ref={rootRef}>
      <button
        type="button"
        className="novex-user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de usuario: ${user?.name ?? 'Operador Novex'}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="novex-user-menu__avatar" aria-hidden="true">
          {firstName.slice(0, 1)}
        </span>
        <span className="novex-user-menu__identity">
          <strong>{user?.name ?? 'Operador Novex'}</strong>
          <small>{role}</small>
        </span>
        <NovexIcon name="chevron-down" size={15} className="novex-user-menu__chevron" />
      </button>

      {open ? (
        <div className="novex-user-menu__popover" role="menu">
          <div className="novex-user-menu__popover-head">
            <span className="novex-user-menu__status-dot" aria-hidden="true" />
            <div>
              <strong>Sesión activa</strong>
              <small>Acceso protegido · Novex</small>
            </div>
          </div>
          <div className="novex-user-menu__items">
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <NovexIcon name="user" />
              Perfil
            </button>
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <NovexIcon name="settings" />
              Preferencias
            </button>
          </div>
          <button
            type="button"
            role="menuitem"
            className="novex-user-menu__logout"
            onClick={() => void handleLogout()}
          >
            <NovexIcon name="log-out" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  )
}
