import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

const DISMISSED_PREFIX = 'novex.pilot.invitation.v1'

function dismissedKey(userId: string): string {
  return `${DISMISSED_PREFIX}.${encodeURIComponent(userId)}`
}

/** Recordado por pestaña de sesión: no reaparece en cada navegación, pero vuelve en una sesión nueva. */
function readDismissed(userId: string | undefined): boolean {
  if (!userId) return false
  try {
    return sessionStorage.getItem(dismissedKey(userId)) === 'dismissed'
  } catch {
    return false
  }
}

function rememberDismissed(userId: string | undefined): void {
  if (!userId) return
  try {
    sessionStorage.setItem(dismissedKey(userId), 'dismissed')
  } catch {
    // Sin storage la invitación reaparece en la siguiente navegación; no bloquea nada.
  }
}

export interface CoordinatorPilotInvitationProps {
  onStart: () => void
}

/**
 * Invitación no bloqueante al piloto del tutorial. Solo la monta el menú del
 * Centro en desarrollo y para el COORDINADOR. No cambia datos ni bloquea la pantalla.
 */
export function CoordinatorPilotInvitation({ onStart }: CoordinatorPilotInvitationProps) {
  const { user } = useAuth()
  const userId = user?.id
  const [dismissed, setDismissed] = useState(() => readDismissed(userId))

  if (dismissed) return null

  // Portal: el menú del Centro crea su propio contexto de apilamiento y dejaría
  // la invitación por debajo de los paneles.
  return createPortal(
    <section
      className="pilot-invitation"
      data-testid="pilot-invitation"
      role="region"
      aria-labelledby="pilot-invitation-title"
    >
      <p className="pilot-invitation__eyebrow">Tutorial · solo desarrollo</p>
      <h2 id="pilot-invitation-title" className="pilot-invitation__title">
        ¿Quiere conocer su Centro Operacional?
      </h2>
      <p className="pilot-invitation__text">
        Le mostraremos cómo consultar los problemas de su coordinación, realizar
        seguimiento y utilizar las herramientas disponibles.
      </p>
      {/* La acción principal va al final, donde termina la lectura. */}
      <div className="pilot-invitation__actions">
        <button
          type="button"
          className="pilot-invitation__later"
          data-testid="pilot-invitation-later"
          onClick={() => {
            rememberDismissed(userId)
            setDismissed(true)
          }}
        >
          Ahora no
        </button>
        <button
          type="button"
          className="pilot-invitation__start"
          data-testid="pilot-invitation-start"
          onClick={() => {
            rememberDismissed(userId)
            setDismissed(true)
            onStart()
          }}
        >
          Iniciar recorrido
        </button>
      </div>
    </section>,
    document.body,
  )
}
