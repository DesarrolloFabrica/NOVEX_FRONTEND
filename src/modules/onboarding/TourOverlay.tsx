import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { TourBubble } from './TourBubble'
import { evaluateTourPredicate, legacyAdvancePredicate, type TourPredicate } from './engine/tourPredicates'
import {
  isElementVisible,
  planCardPlacement,
  revealInScrollContainers,
  toHighlightRect,
  type TourCardSize,
  type TourRect,
} from './engine/tourGeometry'
import type { OnboardingTourStep } from './onboardingTourSteps'
import '@/styles/tour-engine.css'

/** Tiempo máximo buscando el ancla antes de ofrecer una alternativa al usuario. */
const LOCATE_TIMEOUT_MS = 6000
/** Pausa breve tras cumplirse el estado, para que el usuario vea el resultado. */
const ADVANCE_DELAY_MS = 220
/** Las transiciones CSS de cartas y paneles terminan en torno a este tiempo. */
const SETTLE_DELAY_MS = 320
const DEFAULT_CARD_SIZE: TourCardSize = { width: 370, height: 340 }
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const DEFAULT_MISSING_NOTICE =
  'No encontramos esta parte de la pantalla todavía. Ábrala y pulse «Reintentar»'

type TargetPhase = 'locating' | 'ready' | 'missing'

export interface TourOverlayProps {
  active: boolean
  steps: readonly OnboardingTourStep[]
  stepIndex: number
  onNext: () => void
  onPrevious: () => void
  onPause: () => void
  onSkip: () => void
  /** Acción para pasos con navegación bloqueada cuando el elemento falta. */
  onRecover?: () => void
}

function sameRect(left: TourRect | null, right: TourRect | null): boolean {
  if (left === right) return true
  if (!left || !right) return false
  return (
    left.top === right.top &&
    left.left === right.left &&
    left.width === right.width &&
    left.height === right.height
  )
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(
    () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches === true,
  )
  useEffect(() => {
    const media = window.matchMedia?.(REDUCED_MOTION_QUERY)
    if (!media) return
    const onChange = () => setReduce(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return reduce
}

/**
 * Overlay del recorrido, independiente de cualquier contexto. Localiza el ancla,
 * mide su posición con eventos (no con sondeos permanentes), espera el estado que
 * confirma cada acción y ofrece una alternativa cuando el elemento no aparece.
 */
export function TourOverlay({
  active,
  steps,
  stepIndex,
  onNext,
  onPrevious,
  onPause,
  onSkip,
  onRecover,
}: TourOverlayProps) {
  const step = steps[stepIndex]
  const reduceMotion = usePrefersReducedMotion()

  const [phase, setPhase] = useState<TargetPhase>('locating')
  const [attempt, setAttempt] = useState(0)
  const [rect, setRect] = useState<TourRect | null>(null)
  const [satisfied, setSatisfied] = useState(false)
  const [cardSize, setCardSize] = useState<TourCardSize>(DEFAULT_CARD_SIZE)
  const targetRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const advancedRef = useRef(false)
  // Los callbacks del padre se leen por referencia: que cambien de identidad
  // no debe reiniciar la medición del ancla.
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext

  // Memorizado por paso: un predicado nuevo en cada render reiniciaría los
  // observadores y provocaría un bucle de medición.
  const predicate: TourPredicate | null = useMemo(
    () => (step ? (step.advanceWhen ?? legacyAdvancePredicate(step)) : null),
    [step],
  )
  const kind = step?.kind ?? (predicate ? 'action' : 'info')

  // Foco: al abrir se guarda el elemento previo y al cerrar se devuelve.
  useEffect(() => {
    if (!active) return
    const returnTo = document.activeElement as HTMLElement | null
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 50)
    return () => {
      window.clearTimeout(focusTimer)
      if (returnTo?.isConnected) returnTo.focus()
    }
  }, [active])

  // Localizar el ancla. Si aparece, se usa; si no, tras el plazo se ofrece una
  // alternativa. Nunca avanza solo.
  useEffect(() => {
    if (!active || !step) return
    advancedRef.current = false
    setSatisfied(false)
    setRect(null)
    if (step.highlightTarget === false) {
      targetRef.current = null
      setPhase('ready')
      return
    }

    const locate = () => {
      const element = document.querySelector<HTMLElement>(step.target)
      if (!element) return false
      targetRef.current = element
      setPhase('ready')
      return true
    }
    setPhase('locating')
    if (locate()) return

    const observer = new MutationObserver(() => {
      if (locate()) cleanup()
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = window.setTimeout(() => {
      cleanup()
      targetRef.current = null
      setPhase('missing')
    }, LOCATE_TIMEOUT_MS)
    const cleanup = () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
    return cleanup
  }, [active, step, attempt])

  // Medir y seguir el ancla mientras el paso está activo. Todas las mediciones
  // parten de eventos y se agrupan en un solo frame.
  useEffect(() => {
    if (!active || !step || phase !== 'ready') return
    const target = targetRef.current
    if (!target) return

    let frame = 0
    let disposed = false
    const timers: number[] = []

    const checkPredicate = () => {
      if (!predicate) return
      const ok = evaluateTourPredicate(predicate)
      setSatisfied(ok)
      if (ok && kind === 'action' && !advancedRef.current) {
        advancedRef.current = true
        timers.push(window.setTimeout(() => onNextRef.current(), ADVANCE_DELAY_MS))
      }
    }

    const measure = () => {
      frame = 0
      if (disposed) return
      if (!target.isConnected) {
        setRect(null)
        setPhase('missing')
        return
      }
      const measured = isElementVisible(target)
        ? toHighlightRect(target.getBoundingClientRect(), {
            width: window.innerWidth,
            height: window.innerHeight,
          })
        : null
      // Solo se actualiza si cambió: evita re-renders que alimentarían al propio observador.
      setRect((previous) => (sameRect(previous, measured) ? previous : measured))
      checkPredicate()
    }

    const schedule = () => {
      if (frame || disposed) return
      frame = window.requestAnimationFrame(measure)
    }

    revealInScrollContainers(target, reduceMotion)
    schedule()
    // Un cambio de posición tras una transición CSS no emite evento: se mide
    // de nuevo una vez al terminar el asentamiento.
    timers.push(window.setTimeout(schedule, SETTLE_DELAY_MS))

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    resizeObserver?.observe(target)
    const mutationObserver = new MutationObserver((records) => {
      // Las mutaciones del propio overlay no cambian el escenario: se ignoran.
      const outside = records.some(
        (record) =>
          !(record.target instanceof Element) ||
          !record.target.closest('.novex-tour'),
      )
      if (outside) schedule()
    })
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { capture: true, passive: true })

    return () => {
      disposed = true
      if (frame) window.cancelAnimationFrame(frame)
      timers.forEach((timer) => window.clearTimeout(timer))
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true })
    }
  }, [active, step, phase, predicate, kind, reduceMotion])

  // Teclado global del recorrido: Escape pausa, flechas navegan.
  useEffect(() => {
    if (!active) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      const waitsForAction = Boolean(predicate) && kind === 'action' && !satisfied
      if (event.key === 'Escape' && !step?.lockNavigation) onPause()
      if (
        event.key === 'ArrowRight' &&
        !waitsForAction &&
        phase === 'ready' &&
        !step?.lockNavigation
      )
        onNext()
      if (event.key === 'ArrowLeft' && stepIndex > 0 && !step?.lockNavigation)
        onPrevious()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, kind, onNext, onPause, onPrevious, phase, predicate, satisfied, step, stepIndex])

  // Medir la tarjeta real para colocar la flecha con precisión.
  useLayoutEffect(() => {
    const element = dialogRef.current
    if (!active || !element) return
    const box = element.getBoundingClientRect()
    if (box.width && box.height) {
      if (box.width !== cardSize.width || box.height !== cardSize.height) {
        setCardSize({ width: box.width, height: box.height })
      }
    }
    // cardSize no entra en dependencias: solo se mide tras cambios de paso o estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, phase, rect, satisfied])

  // Atrapar Tab dentro del globo, salvo en pasos que requieren interactuar fuera.
  const onCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || step?.interaction === 'external') return
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]',
      ),
    )
    if (focusable.length === 0) return
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

  if (!active || !step) return null

  const navigationLocked = Boolean(step.lockNavigation)
  const recoveryRequired = navigationLocked && phase === 'missing' && Boolean(onRecover)
  const waitsForState = Boolean(predicate) && kind === 'action' && !satisfied && phase === 'ready'
  const passthrough = step.interaction === 'external' && phase === 'ready' && rect !== null
  const shadeClass = `novex-tour__shade${passthrough ? ' novex-tour__shade--passthrough' : ''}`

  const placement = planCardPlacement(
    rect,
    { width: window.innerWidth, height: window.innerHeight },
    cardSize,
    step.placement === 'center' ? 'center' : step.placement === 'left' ? 'left' : 'auto',
  )

  const notice =
    phase === 'missing' ? (
      <>
        {step.missingNotice ?? DEFAULT_MISSING_NOTICE}
        {step.optional ? ', o continúe sin este paso.' : '.'} El recorrido no
        avanzará hasta que usted lo decida.
      </>
    ) : null

  const footer = (
    <>
      {!navigationLocked && !recoveryRequired ? (
        <button type="button" className="novex-tour__skip" onClick={onSkip}>
          Omitir recorrido
        </button>
      ) : null}
      <div>
        {!navigationLocked && !recoveryRequired ? (
          <button type="button" onClick={onPrevious} disabled={stepIndex === 0}>
            Anterior
          </button>
        ) : null}
        {phase === 'locating' ? (
          <span className="novex-tour__waiting" role="status">
            <i />
            Buscando esta parte de la pantalla…
          </span>
        ) : recoveryRequired ? (
          <button
            type="button"
            className="novex-tour__next"
            onClick={() => {
              onPause()
              onRecover?.()
            }}
          >
            Revisar situaciones
            <span aria-hidden="true">›</span>
          </button>
        ) : phase === 'missing' ? (
          <>
            <button type="button" onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </button>
            {step.optional ? (
              <button type="button" className="novex-tour__next" onClick={onNext}>
                Continuar sin este paso
              </button>
            ) : null}
          </>
        ) : waitsForState ? (
          <span className="novex-tour__waiting" role="status">
            <i />
            {step.waitingLabel ?? 'Complete la acción para continuar'}
          </span>
        ) : (
          <button
            type="button"
            className="novex-tour__next"
            onClick={onNext}
            disabled={kind === 'wait' && phase !== 'ready'}
          >
            {stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
            <span aria-hidden="true">›</span>
          </button>
        )}
      </div>
    </>
  )

  return createPortal(
    <div
      className={`novex-tour${reduceMotion ? ' novex-tour--reduced-motion' : ''}`}
      aria-live="polite"
    >
      {rect ? (
        <>
          <span className={shadeClass} style={{ top: 0, left: 0, right: 0, height: rect.top }} />
          <span
            className={shadeClass}
            style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
          />
          <span
            className={shadeClass}
            style={{ top: rect.top, left: 0, width: rect.left, height: rect.height }}
          />
          <span
            className={shadeClass}
            style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }}
          />
          <span className="novex-tour__spotlight" style={rect} />
        </>
      ) : (
        <span className="novex-tour__shade novex-tour__shade--full" />
      )}
      <TourBubble
        ref={dialogRef}
        placement={placement}
        eyebrow={step.eyebrow}
        title={step.title}
        description={step.description}
        expectation={step.expectation}
        expectationOverride={
          phase === 'missing'
            ? 'Puede continuar cuando este elemento esté disponible.'
            : undefined
        }
        stepNumber={stepIndex + 1}
        stepTotal={steps.length}
        onPause={onPause}
        pauseHidden={navigationLocked}
        onKeyDown={onCardKeyDown}
        notice={notice}
        footer={footer}
      />
    </div>,
    document.body,
  )
}
