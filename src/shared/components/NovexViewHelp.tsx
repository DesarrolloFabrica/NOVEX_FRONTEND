import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface NovexViewHelpProps {
  title?: string
  children: ReactNode
}

/**
 * Botón circular de información contextual de la vista activa.
 * Misma interacción en Inteligencia, Situaciones, Registro y Seguimiento.
 */
export function NovexViewHelp({
  title = 'Información sobre esta vista',
  children,
}: NovexViewHelpProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="novex-help-menu" ref={rootRef}>
      <button
        type="button"
        className="novex-help-menu__trigger"
        aria-label={title}
        aria-expanded={open}
        aria-controls="novex-view-help"
        onClick={() => setOpen((value) => !value)}
      >
        <NovexIcon name="help" size={14} strokeWidth={1.5} />
      </button>
      {open ? (
        <aside
          id="novex-view-help"
          className="novex-help-menu__popover"
          aria-label={title}
        >
          <strong>{title}</strong>
          {children}
        </aside>
      ) : null}
    </div>
  )
}
