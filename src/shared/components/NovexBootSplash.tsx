import { useEffect, useRef, useState } from 'react'
import { NovexBrandMark } from '@/shared/components/NovexBrandMark'

type NovexBootSplashProps = {
  /** Duración mínima visible antes de iniciar el desvanecido (ms). */
  holdMs?: number
  /** Duración del fade-out (ms). */
  fadeMs?: number
  /**
   * Si es false, el splash espera (tras el hold mínimo) antes de salir.
   * Útil para terminar de cargar datos y evitar un segundo loader.
   */
  ready?: boolean
  /**
   * Se llama al iniciar la salida, con el splash aún opaco.
   * Usar para navegar a la plataforma sin revelar el login debajo.
   */
  onEnter?: () => void
  /** Se llama al terminar el fade-out (desmontar el splash). */
  onComplete: () => void
}

/**
 * Pantalla de carga post-login: logo centrado, órbita sutil y fade hacia la plataforma.
 * Debe montarse a nivel de app (no dentro de LoginPage) para sobrevivir el cambio de ruta.
 */
export function NovexBootSplash({
  holdMs = 2000,
  fadeMs = 650,
  ready = true,
  onEnter,
  onComplete,
}: NovexBootSplashProps) {
  const [holdElapsed, setHoldElapsed] = useState(false)
  const [exiting, setExiting] = useState(false)
  const onEnterRef = useRef(onEnter)
  const onCompleteRef = useRef(onComplete)
  const enteredRef = useRef(false)
  onEnterRef.current = onEnter
  onCompleteRef.current = onComplete

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const visibleMs = reduced ? 400 : holdMs
    const holdTimer = window.setTimeout(() => {
      setHoldElapsed(true)
    }, visibleMs)

    return () => {
      window.clearTimeout(holdTimer)
    }
  }, [holdMs])

  useEffect(() => {
    if (!holdElapsed || !ready || exiting || enteredRef.current) return

    enteredRef.current = true
    onEnterRef.current?.()
    setExiting(true)
  }, [exiting, holdElapsed, ready])

  useEffect(() => {
    if (!exiting) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const exitMs = reduced ? 180 : fadeMs

    const doneTimer = window.setTimeout(() => {
      onCompleteRef.current()
    }, exitMs)

    return () => {
      window.clearTimeout(doneTimer)
    }
  }, [exiting, fadeMs])

  return (
    <div
      className={`novex-boot-splash${exiting ? ' is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Inicializando Novex"
    >
      <div className="novex-boot-splash__backdrop" aria-hidden="true" />
      <div className="novex-boot-splash__aurora" aria-hidden="true" />

      <div className="novex-boot-splash__stage">
        <div className="novex-boot-splash__orbit" aria-hidden="true" />
        <div className="novex-boot-splash__halo" aria-hidden="true" />
        <NovexBrandMark size="splash" />
        <div className="novex-boot-splash__scan" aria-hidden="true" />
      </div>

      <div className="novex-boot-splash__copy">
        <p className="novex-boot-splash__eyebrow">Visión general</p>
        <p className="novex-boot-splash__title">Inicializando Novex</p>
        <div className="novex-boot-splash__progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  )
}
