import { useEffect, useRef, useState } from 'react'
import { CunmarkIcon } from '@/shared/components/CunmarkIcon'
import { useAuth } from '@/modules/auth/hooks/useAuth'

interface CunmarkUserMenuProps {
  onLogout?: () => void
}

export function CunmarkUserMenu({ onLogout }: CunmarkUserMenuProps) {
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
    <div className="cunmark-user-menu" ref={rootRef}>
      <button
        type="button"
        className="cunmark-user-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de usuario: ${user?.name ?? 'Operador Cunmark'}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="cunmark-user-menu__avatar" aria-hidden="true">
          {firstName.slice(0, 1)}
        </span>
        <span className="cunmark-user-menu__identity">
          <strong>{user?.name ?? 'Operador Cunmark'}</strong>
          <small>{role}</small>
        </span>
        <CunmarkIcon name="chevron-down" size={15} className="cunmark-user-menu__chevron" />
      </button>

      {open ? (
        <div className="cunmark-user-menu__popover" role="menu">
          <div className="cunmark-user-menu__popover-head">
            <span className="cunmark-user-menu__status-dot" aria-hidden="true" />
            <div>
              <strong>Sesión activa</strong>
              <small>Acceso protegido · Cunmark</small>
            </div>
          </div>
          <div className="cunmark-user-menu__items">
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <CunmarkIcon name="user" />
              Perfil
            </button>
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <CunmarkIcon name="grid" />
              Cambiar rol <span className="cunmark-user-menu__mock">mock</span>
            </button>
            <button type="button" role="menuitem" onClick={() => setOpen(false)}>
              <CunmarkIcon name="settings" />
              Preferencias
            </button>
          </div>
          <button
            type="button"
            role="menuitem"
            className="cunmark-user-menu__logout"
            onClick={() => void handleLogout()}
          >
            <CunmarkIcon name="log-out" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  )
}
