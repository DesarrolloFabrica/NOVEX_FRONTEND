import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from './OnboardingContext'
import { NovexIcon } from '@/shared/components/NovexIcon'

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

const TOUR_CARD_WIDTH = 370
const TOUR_CARD_HEIGHT = 340
const TOUR_CARD_GAP = 16
const TOUR_VIEWPORT_MARGIN = 16

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function getTourCardStyle(
  rect: HighlightRect,
  placement: 'auto' | 'center' | 'left' = 'auto',
): CSSProperties {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const targetRight = rect.left + rect.width
  const targetBottom = rect.top + rect.height
  const maximumLeft = Math.max(
    TOUR_VIEWPORT_MARGIN,
    viewportWidth - TOUR_CARD_WIDTH - TOUR_VIEWPORT_MARGIN,
  )
  const maximumTop = Math.max(
    TOUR_VIEWPORT_MARGIN,
    viewportHeight - TOUR_CARD_HEIGHT - TOUR_VIEWPORT_MARGIN,
  )
  const sideTop = clamp(rect.top, TOUR_VIEWPORT_MARGIN, maximumTop)

  if (placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  if (placement === 'left') {
    return { top: sideTop, left: TOUR_VIEWPORT_MARGIN }
  }

  if (
    rect.left >=
    TOUR_VIEWPORT_MARGIN + TOUR_CARD_WIDTH + TOUR_CARD_GAP
  ) {
    return {
      top: sideTop,
      left: rect.left - TOUR_CARD_WIDTH - TOUR_CARD_GAP,
    }
  }

  if (
    viewportWidth - targetRight >=
    TOUR_VIEWPORT_MARGIN + TOUR_CARD_WIDTH + TOUR_CARD_GAP
  ) {
    return { top: sideTop, left: targetRight + TOUR_CARD_GAP }
  }

  const centeredLeft = clamp(
    rect.left + rect.width / 2 - TOUR_CARD_WIDTH / 2,
    TOUR_VIEWPORT_MARGIN,
    maximumLeft,
  )
  const fitsBelow =
    viewportHeight - targetBottom >=
    TOUR_VIEWPORT_MARGIN + TOUR_CARD_HEIGHT + TOUR_CARD_GAP

  return {
    top: fitsBelow
      ? targetBottom + TOUR_CARD_GAP
      : clamp(
          rect.top - TOUR_CARD_HEIGHT - TOUR_CARD_GAP,
          TOUR_VIEWPORT_MARGIN,
          maximumTop,
        ),
    left: centeredLeft,
  }
}

export function OnboardingTour() {
  const { active, stepIndex, steps, next, previous, pause, skip } =
    useOnboarding()
  const step = steps[stepIndex]
  const navigate = useNavigate()
  const [rect, setRect] = useState<HighlightRect | null>(null)
  const [targetMissing, setTargetMissing] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active || !step) return
    setRect(null)
    setTargetMissing(false)
    if (step.highlightTarget === false) return
    let frame = 0
    let attempts = 0
    const update = () => {
      const target = document.querySelector<HTMLElement>(step.target)
      if (target) {
        setTargetMissing(false)
        target.scrollIntoView({
          block: 'center',
          inline: 'center',
          behavior: 'auto',
        })
        const box = target.getBoundingClientRect()
        const padding = 10
        setRect({
          top: Math.max(8, box.top - padding),
          left: Math.max(8, box.left - padding),
          width: Math.min(window.innerWidth - 16, box.width + padding * 2),
          height: Math.min(window.innerHeight - 16, box.height + padding * 2),
        })
      } else if (attempts < 30) {
        attempts += 1
        frame = window.setTimeout(update, 100)
      } else if (attempts < 300) {
        if (attempts === 30) setTargetMissing(true)
        attempts += 1
        frame = window.setTimeout(update, 100)
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => {
      window.clearTimeout(frame)
      window.removeEventListener('resize', update)
    }
  }, [active, step])

  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      const waitsForAction = Boolean(
        step?.advanceOnTarget || step?.advanceOnVisibleTarget,
      )
      if (event.key === 'Escape' && !step?.lockNavigation) pause()
      if (
        event.key === 'ArrowRight' &&
        !waitsForAction &&
        !step?.lockNavigation
      )
        next()
      if (
        event.key === 'ArrowLeft' &&
        stepIndex > 0 &&
        !step?.lockNavigation
      )
        previous()
    }
    document.addEventListener('keydown', onKey)
    window.setTimeout(() => dialogRef.current?.focus(), 50)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, next, pause, previous, step, stepIndex])

  useEffect(() => {
    if (!active || !step?.advanceOnTarget) return
    let advanced = false

    const checkMilestone = () => {
      if (advanced || !document.querySelector(step.advanceOnTarget!)) return
      advanced = true
      window.setTimeout(next, 220)
    }

    const observer = new MutationObserver(checkMilestone)
    observer.observe(document.body, { childList: true, subtree: true })
    const interval = window.setInterval(checkMilestone, 300)
    checkMilestone()

    return () => {
      observer.disconnect()
      window.clearInterval(interval)
    }
  }, [active, next, step])

  useEffect(() => {
    if (!active || !step?.advanceOnVisibleTarget) return
    let advanced = false
    let visibilityObserver: IntersectionObserver | null = null
    let observedTarget: Element | null = null

    const connectObserver = () => {
      if (advanced) return
      const target = document.querySelector(step.advanceOnVisibleTarget!)
      const root = step.visibilityRoot
        ? document.querySelector(step.visibilityRoot)
        : null
      if (!target || (step.visibilityRoot && !root) || target === observedTarget)
        return

      visibilityObserver?.disconnect()
      observedTarget = target
      visibilityObserver = new IntersectionObserver(
        (entries) => {
          if (advanced || !entries.some((entry) => entry.isIntersecting)) return
          advanced = true
          window.setTimeout(next, 220)
        },
        { root, threshold: 0.8 },
      )
      visibilityObserver.observe(target)
    }

    const mutationObserver = new MutationObserver(connectObserver)
    mutationObserver.observe(document.body, { childList: true, subtree: true })
    const interval = window.setInterval(connectObserver, 300)
    connectObserver()

    return () => {
      visibilityObserver?.disconnect()
      mutationObserver.disconnect()
      window.clearInterval(interval)
    }
  }, [active, next, step])

  if (!active || !step) return null
  const recoveryRequired = Boolean(step.lockNavigation && targetMissing)
  const navigationLocked = Boolean(step.lockNavigation && !recoveryRequired)
  const waitsForAction = Boolean(
    (step.advanceOnTarget || step.advanceOnVisibleTarget) && !recoveryRequired,
  )
  const cardStyle = rect && step.placement !== 'center'
    ? getTourCardStyle(rect, step.placement)
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return createPortal(
    <div className="novex-tour" aria-live="polite">
      {rect ? (
        <>
          <span
            className="novex-tour__shade"
            style={{ top: 0, left: 0, right: 0, height: rect.top }}
          />
          <span
            className="novex-tour__shade"
            style={{
              top: rect.top + rect.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <span
            className="novex-tour__shade"
            style={{
              top: rect.top,
              left: 0,
              width: rect.left,
              height: rect.height,
            }}
          />
          <span
            className="novex-tour__shade"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
            }}
          />
          <span className="novex-tour__spotlight" style={rect} />
        </>
      ) : (
        <span className="novex-tour__shade novex-tour__shade--full" />
      )}
      <div
        ref={dialogRef}
        className="novex-tour__card"
        style={cardStyle}
        role="dialog"
        aria-modal={waitsForAction ? undefined : true}
        aria-labelledby="novex-tour-title"
        tabIndex={-1}
      >
        <header>
          <span>{step.eyebrow}</span>
          {!navigationLocked ? (
            <button type="button" onClick={pause} aria-label="Pausar tutorial">
              <NovexIcon name="x" />
            </button>
          ) : null}
        </header>
        <div
          className="novex-tour__progress"
          aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}
        >
          <i style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
        </div>
        <h2 id="novex-tour-title">{step.title}</h2>
        <p>{step.description}</p>
        <div className="novex-tour__expectation">
          <NovexIcon name="sparkles" />
          <span>
            <strong>Qué esperar</strong>
            {recoveryRequired
              ? 'No encontramos el expediente que esta etapa debe analizar. Cierre el recorrido y reviselo en Situaciones registradas.'
              : step.expectation}
          </span>
        </div>
        <footer className={navigationLocked ? 'is-locked' : undefined}>
          {!navigationLocked && !recoveryRequired ? (
            <button type="button" className="novex-tour__skip" onClick={skip}>
              Omitir recorrido
            </button>
          ) : null}
          <div>
            {!navigationLocked && !recoveryRequired ? (
              <button type="button" onClick={previous} disabled={stepIndex === 0}>
                Anterior
              </button>
            ) : null}
            {recoveryRequired ? (
              <button
                type='button'
                className='novex-tour__next'
                onClick={() => {
                  pause()
                  navigate('/situaciones')
                }}
              >
                Revisar situaciones
                <NovexIcon name='chevron-right' />
              </button>
            ) : waitsForAction ? (
              <span className="novex-tour__waiting" role="status">
                <i />
                {step.waitingLabel ?? 'Complete la acción para continuar'}
              </span>
            ) : (
              <button type="button" className="novex-tour__next" onClick={next}>
                {stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
                <NovexIcon name="chevron-right" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
