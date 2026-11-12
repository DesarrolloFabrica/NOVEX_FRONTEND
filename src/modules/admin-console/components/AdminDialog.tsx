import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { getErrorMessage } from '@/shared/utils/error'

/**
 * Diálogo de formulario de la Consola.
 *
 * Accesible: `role="dialog"` + `aria-modal`, foco inicial en el primer campo,
 * Escape cierra (salvo mientras guarda), el foco no sale del diálogo con Tab y
 * vuelve al elemento que lo abrió al cerrar. El error del backend (409, 400…)
 * se muestra dentro del formulario y el diálogo sigue abierto para corregir.
 */
export function AdminDialog({
  title,
  eyebrow,
  submitLabel,
  onSubmit,
  onClose,
  children,
  danger = false,
}: {
  title: string
  eyebrow: string
  submitLabel: string
  /** Devuelve una promesa: el diálogo se cierra solo si se resuelve. */
  onSubmit: () => Promise<void>
  onClose: () => void
  children: ReactNode
  danger?: boolean
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLFormElement>(null)
  const titleId = useId()
  const errorId = useId()

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const first = dialogRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    )
    first?.focus()
    return () => opener?.focus?.()
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !saving) {
        event.preventDefault()
        onClose()
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [
          ...dialogRef.current.querySelectorAll<HTMLElement>(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
          ),
        ]
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit()
      onClose()
    } catch (submitError) {
      setError(getErrorMessage(submitError))
      setSaving(false)
    }
  }

  return (
    <div className="novex-ops-modal admin-console__modal" role="presentation">
      <button
        type="button"
        className="novex-ops-modal__backdrop"
        aria-label="Cerrar"
        disabled={saving}
        onClick={onClose}
      />
      <form
        ref={dialogRef}
        className="novex-ops-modal__dialog admin-form"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        onSubmit={(event) => void handleSubmit(event)}
        noValidate={false}
      >
        <header>
          <div>
            <p>{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
        </header>

        <div className="admin-form__fields">{children}</div>

        {error ? (
          <p className="admin-form__error" id={errorId} role="alert">
            {error}
          </p>
        ) : null}

        <footer className="admin-console__confirm-actions">
          <button
            type="button"
            className="novex-ops-modal__secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`novex-ops-modal__primary${danger ? ' is-danger' : ''}`}
            disabled={saving}
          >
            {saving ? 'Guardando…' : submitLabel}
          </button>
        </footer>
      </form>
    </div>
  )
}

/** Campo con etiqueta, ayuda opcional y control. */
export function AdminField({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string
  hint?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`admin-form__field${wide ? ' admin-form__field--wide' : ''}`}>
      <span className="admin-form__label">{label}</span>
      {children}
      {hint ? <span className="admin-form__hint">{hint}</span> : null}
    </label>
  )
}
