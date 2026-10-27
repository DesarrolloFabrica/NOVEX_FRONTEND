import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { NovexPlatformIcon } from '@/shared/components/NovexPlatformIcon'
import { RegisterSituationCta } from '@/shared/components/RegisterSituationCta'
import { resolvePlatformNavItems } from '@/shared/constants/platformNavigation'

/**
 * Acceso compacto a la navegación de PLATAFORMA, para las experiencias que no
 * montan el carril vertical.
 *
 * Es un menú y no una fila de enlaces por decisión de producto: volcar los
 * cinco destinos de plataforma en la barra del Centro Operacional lo convertía
 * en una barra administrativa y le quitaba el carácter de escena ejecutiva. Las
 * SECCIONES del Centro (Inicio, Panorama, IA, Auditoría) sí van visibles y
 * fuera de este menú: son la navegación de la escena, no de la plataforma.
 *
 * Los destinos y su reparto por rol salen de
 * `shared/constants/platformNavigation`, el mismo origen que usa el carril, así
 * que las dos superficies nunca ofrecen destinos distintos al mismo usuario.
 *
 * Interacción idéntica a `NovexUserMenu`: cierra con Escape y con un puntero
 * fuera, y anuncia estado con `aria-expanded`.
 */

export interface NovexPlatformMenuProps {
  /**
   * Destino que se omite porque ya es la experiencia activa. Ofrecer «Centro
   * operacional» dentro del propio Centro es ruido, no navegación.
   */
  excludeTo?: string
  label?: string
}

export function NovexPlatformMenu({
  excludeTo,
  label = 'Plataforma',
}: NovexPlatformMenuProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const items = resolvePlatformNavItems(user?.roleCode).filter(
    (item) => item.to !== excludeTo,
  )

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

  if (items.length === 0) return null

  return (
    <div className="novex-platform-menu" ref={rootRef}>
      <button
        type="button"
        className="novex-platform-menu__trigger"
        data-testid="platform-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label}: ir a otra experiencia`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="novex-platform-menu__glyph" aria-hidden="true">
          <NovexPlatformIcon name="grid" />
        </span>
        <span className="novex-platform-menu__label">{label}</span>
        <NovexIcon
          name="chevron-down"
          size={14}
          className="novex-platform-menu__chevron"
        />
      </button>

      {open ? (
        <div
          className="novex-platform-menu__popover"
          role="menu"
          data-testid="platform-menu-popover"
          aria-label={label}
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              viewTransition
              role="menuitem"
              className={({ isActive }) =>
                `novex-platform-menu__item ${isActive ? 'is-active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              <span className="novex-platform-menu__item-icon">
                <NovexPlatformIcon name={item.icon} />
              </span>
              <span className="novex-platform-menu__item-copy">
                <strong>{item.label}</strong>
                <small>{item.eyebrow}</small>
              </span>
            </NavLink>
          ))}

          {/* El carril ofrecía esta acción a COORDINADOR y ANALISTA. Sin
              carril seguiría estando en el DOM en ninguna parte del Centro
              Operacional, así que se conserva aquí: el propio CTA decide si el
              rol puede crear situaciones y devuelve null si no. */}
          <div className="novex-platform-menu__action">
            <RegisterSituationCta variant="inline" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
