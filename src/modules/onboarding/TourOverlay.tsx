import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { TourBubble } from './TourBubble'
import { evaluateTourPredicate, legacyAdvancePredicate, type TourPredicate } from './engine/tourPredicates'
import {
  isElementVisible,
  isSmallViewport,
  nearestScrollFrame,
  pickSheetEdge,
  planCardPlacement,
  revealInScrollContainers,
  sheetFreeBand,
  toHighlightRect,
  highlightBox,
  type TourBand,
  type TourCardSize,
  type TourRect,
} from './engine/tourGeometry'
import { composeMissingNotice } from './engine/tourCopy'
import type { OnboardingTourStep } from './onboardingTourSteps'
import '@/styles/tour-engine.css'

/** Tiempo máximo buscando el ancla antes de ofrecer una alternativa al usuario. */
const LOCATE_TIMEOUT_MS = 6000
/** Pausa breve tras cumplirse el estado, para que el usuario vea el resultado. */
const ADVANCE_DELAY_MS = 220
/** Las transiciones CSS de cartas y paneles terminan en torno a este tiempo. */
const SETTLE_DELAY_MS = 320
const DEFAULT_CARD_SIZE: TourCardSize = { width: 384, height: 320 }
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
/**
 * Margen para decidir que un paso condicionado no aplica. Al llegar, la vista
 * puede estar aún cargando (la lista de situaciones, el expediente): saltar al
 * instante encadenaba varios pasos y dejaba al usuario casi al final.
 */
const SHOW_WHEN_GRACE_MS = 450

/**
 * Las teclas del recorrido no se roban a los controles de la página: dentro de
 * un campo, un selector o unas pestañas, las flechas y Escape son de ellos.
 */
function isKeyForThePage(event: globalThis.KeyboardEvent): boolean {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return true
  const target = event.target
  if (!(target instanceof Element) || target.closest('.novex-tour')) return false
  if (target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])'))
    return true
  return Boolean(
    target.closest(
      '[role="tab"], [role="tablist"], [role="listbox"], [role="option"], [role="combobox"], [role="menu"], [role="menuitem"], [role="slider"], [role="spinbutton"], [role="radiogroup"], [role="dialog"]',
    ),
  )
}

type TargetPhase = 'locating' | 'ready' | 'missing'
/**
 * Qué resalta el overlay: el ancla del paso, el control para cumplir la
 * condición previa (`gate`) o la zona donde el usuario hace aparecer un ancla
 * ausente (`recovery`).
 */
type FocusMode = 'target' | 'gate' | 'recovery'

/** Las mutaciones del propio overlay no cambian el escenario. */
function touchesStage(records: MutationRecord[]): boolean {
  return records.some(
    (record) => !(record.target instanceof Element) || !record.target.closest('.novex-tour'),
  )
}

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

  // Dirección del último movimiento: un paso que no aplica se salta hacia donde
  // iba el usuario, para que «Anterior» no rebote hacia delante.
  const lastIndexRef = useRef(stepIndex)
  const directionRef = useRef<1 | -1>(1)
  if (stepIndex !== lastIndexRef.current) {
    directionRef.current = stepIndex > lastIndexRef.current ? 1 : -1
    lastIndexRef.current = stepIndex
  }
  // `showWhen` se decide al llegar al paso: si el usuario cambia la vista
  // mientras lo lee, el paso no desaparece bajo sus ojos. Si al llegar no se
  // cumple, se espera un margen breve por si la vista aún está cargando.
  const entryRef = useRef<{
    step: OnboardingTourStep
    state: 'show' | 'pending' | 'skip'
  } | null>(null)
  const [, rerender] = useReducer((value: number) => value + 1, 0)
  if (active && step && entryRef.current?.step !== step) {
    entryRef.current = {
      step,
      state: !step.showWhen || evaluateTourPredicate(step.showWhen) ? 'show' : 'pending',
    }
  }
  if (!active) entryRef.current = null
  const entryState = active && step ? (entryRef.current?.state ?? 'show') : 'show'
  /** El overlay trabaja solo cuando hay un paso que mostrar. */
  const live = active && entryState === 'show'

  const [phase, setPhase] = useState<TargetPhase>('locating')
  const [attempt, setAttempt] = useState(0)
  const [rect, setRect] = useState<TourRect | null>(null)
  const [placementRect, setPlacementRect] = useState<TourRect | null>(null)
  const [satisfied, setSatisfied] = useState(false)
  const [gated, setGated] = useState(false)
  const [cardSize, setCardSize] = useState<TourCardSize>(DEFAULT_CARD_SIZE)
  const targetRef = useRef<HTMLElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  /** Borde de la hoja elegido para el objetivo actual; lo fija la medición al cambiar de ancla. */
  const sheetEdgeRef = useRef<'top' | 'bottom' | undefined>(undefined)
  const advancedRef = useRef(false)
  // Los callbacks del padre se leen por referencia: que cambien de identidad
  // no debe reiniciar la medición del ancla.
  const onNextRef = useRef(onNext)
  onNextRef.current = onNext
  const onPreviousRef = useRef(onPrevious)
  onPreviousRef.current = onPrevious

  useLayoutEffect(() => {
    const entry = entryRef.current
    const condition = step?.showWhen
    if (!active || !entry || entry.state !== 'pending' || !condition) return
    let done = false
    // Una sola decisión por llegada: el doble montaje de StrictMode o un
    // render ajeno no pueden saltar dos pasos.
    const decide = (show: boolean) => {
      if (done || entryRef.current !== entry || entry.state !== 'pending') return
      done = true
      cleanup()
      entry.state = show ? 'show' : 'skip'
      if (show) rerender()
      else if (directionRef.current < 0 && stepIndex > 0) onPreviousRef.current()
      else onNextRef.current()
    }
    const observer = new MutationObserver((records) => {
      if (touchesStage(records) && evaluateTourPredicate(condition)) decide(true)
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    const timer = window.setTimeout(
      () => decide(evaluateTourPredicate(condition)),
      SHOW_WHEN_GRACE_MS,
    )
    function cleanup() {
      observer.disconnect()
      window.clearTimeout(timer)
    }
    return cleanup
  }, [active, step, stepIndex, entryState])

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

  // Condición previa del paso. Se evalúa antes de pintar para no mostrar ni un
  // instante la explicación sobre una vista equivocada, y se sigue observando:
  // si el usuario vuelve a abrir la vista, el paso vuelve a pedir el regreso.
  useLayoutEffect(() => {
    const gate = live ? step?.gate : undefined
    if (!gate) {
      setGated(false)
      return
    }
    let current = evaluateTourPredicate(gate.when)
    setGated(current)
    const observer = new MutationObserver((records) => {
      if (!touchesStage(records)) return
      const next = evaluateTourPredicate(gate.when)
      if (next === current) return
      current = next
      setGated(next)
      // Al cumplirse la condición el ancla del paso suele aparecer de nuevo.
      if (!next) setAttempt((value) => value + 1)
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => observer.disconnect()
  }, [live, step])

  // Localizar el ancla. Si aparece, se usa; si no, tras el plazo se ofrece una
  // alternativa. Nunca avanza solo.
  useEffect(() => {
    if (!live || !step) return
    advancedRef.current = false
    setSatisfied(false)
    // El foco anterior se conserva hasta medir el nuevo: así se desliza de un
    // elemento a otro en lugar de apagarse y volver a encenderse.
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
  }, [live, step, attempt])

  const focusMode: FocusMode | null = gated
    ? 'gate'
    : phase === 'ready' && step?.highlightTarget !== false
      ? 'target'
      : phase === 'missing' && step?.missingTarget
        ? 'recovery'
        : null

  // Medir y seguir lo que se resalta mientras el paso está activo. Todas las
  // mediciones parten de eventos y se agrupan en un solo frame.
  useEffect(() => {
    if (!live || !step || !focusMode) {
      setRect(null)
      setPlacementRect(null)
      return
    }

    let frame = 0
    let disposed = false
    let observed: HTMLElement | null = null
    const timers: number[] = []
    let advanceTimer = 0

    const checkPredicate = () => {
      if (!predicate) return
      const ok = evaluateTourPredicate(predicate)
      setSatisfied(ok)
      if (ok && kind === 'action' && !advancedRef.current) {
        advancedRef.current = true
        advanceTimer = window.setTimeout(() => {
          advanceTimer = 0
          onNextRef.current()
        }, ADVANCE_DELAY_MS)
      }
    }

    /** El elemento de este modo. El ancla se vuelve a buscar si React la sustituyó. */
    const resolve = (): HTMLElement | null => {
      if (focusMode === 'target') {
        const current = targetRef.current
        if (current?.isConnected) return current
        const replacement = document.querySelector<HTMLElement>(step.target)
        targetRef.current = replacement
        return replacement
      }
      const selector = focusMode === 'gate' ? step.gate?.target : step.missingTarget
      return selector ? document.querySelector<HTMLElement>(selector) : null
    }

    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => schedule())

    const measure = () => {
      frame = 0
      if (disposed) return
      const element = resolve()
      if (!element) {
        setRect(null)
        if (focusMode === 'target') setPhase('missing')
        return
      }
      if (element !== observed) {
        resizeObserver?.disconnect()
        resizeObserver?.observe(element)
        observed = element
        // En la hoja, el objetivo se lleva a la franja que ella deja libre, en el
        // borde donde esa franja cae dentro de su contenedor. Así su inicio
        // (título, bloque de avance) queda visible y no bajo el globo.
        const viewport = { width: window.innerWidth, height: window.innerHeight }
        let band: TourBand | null = null
        sheetEdgeRef.current = undefined
        if (isSmallViewport(viewport)) {
          const cardHeight =
            dialogRef.current?.getBoundingClientRect().height ?? DEFAULT_CARD_SIZE.height
          const edge = pickSheetEdge(
            element.getBoundingClientRect(),
            viewport,
            cardHeight,
            nearestScrollFrame(element),
          )
          sheetEdgeRef.current = edge
          band = sheetFreeBand(viewport, cardHeight, edge)
        }
        revealInScrollContainers(element, reduceMotion, band)
        // Un cambio de posición tras una transición CSS no emite evento: se mide
        // de nuevo una vez al terminar el asentamiento.
        timers.push(window.setTimeout(schedule, SETTLE_DELAY_MS))
      }
      // Solo la parte que se ve: un expediente largo dentro de un panel con
      // scroll no debe iluminar lo que queda oculto fuera del panel, ni quedarse
      // en una franja cuando el usuario se desplaza dentro de él.
      const visible = isElementVisible(element) ? highlightBox(element) : null
      const measured = visible
        ? toHighlightRect(visible, {
            width: window.innerWidth,
            height: window.innerHeight,
          })
        : null
      // Solo se actualiza si cambió: evita re-renders que alimentarían al propio observador.
      setRect((previous) => (sameRect(previous, measured) ? previous : measured))

      // Contexto de colocación: solo para el ancla del paso, nunca para la
      // condición previa ni la zona de recuperación.
      const context =
        focusMode === 'target' && step.placementTarget
          ? document.querySelector(step.placementTarget)
          : null
      const contextRect =
        context && isElementVisible(context)
          ? toHighlightRect(context.getBoundingClientRect(), {
              width: window.innerWidth,
              height: window.innerHeight,
            })
          : null
      setPlacementRect((previous) => (sameRect(previous, contextRect) ? previous : contextRect))

      if (focusMode === 'target') checkPredicate()
    }

    function schedule() {
      if (frame || disposed) return
      frame = window.requestAnimationFrame(measure)
    }

    schedule()
    const mutationObserver = new MutationObserver((records) => {
      if (touchesStage(records)) schedule()
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
      // Un avance pendiente que se cancela debe poder programarse de nuevo.
      if (advanceTimer) {
        window.clearTimeout(advanceTimer)
        advancedRef.current = false
      }
      resizeObserver?.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true })
    }
  }, [live, step, focusMode, predicate, kind, reduceMotion])

  // Teclado global del recorrido: Escape pausa, flechas navegan.
  useEffect(() => {
    if (!live) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (isKeyForThePage(event)) return
      const waitsForAction = Boolean(predicate) && kind === 'action' && !satisfied
      if (event.key === 'Escape' && !step?.lockNavigation) onPause()
      if (
        event.key === 'ArrowRight' &&
        !waitsForAction &&
        !gated &&
        phase === 'ready' &&
        !step?.lockNavigation
      )
        onNext()
      if (event.key === 'ArrowLeft' && stepIndex > 0 && !step?.lockNavigation)
        onPrevious()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [live, gated, kind, onNext, onPause, onPrevious, phase, predicate, satisfied, step, stepIndex])

  // Medir la tarjeta real para colocar la flecha con precisión.
  useLayoutEffect(() => {
    const element = dialogRef.current
    if (!live || !element) return
    const box = element.getBoundingClientRect()
    if (box.width && box.height) {
      if (box.width !== cardSize.width || box.height !== cardSize.height) {
        setCardSize({ width: box.width, height: box.height })
      }
    }
    // cardSize no entra en dependencias: solo se mide tras cambios de paso o estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, stepIndex, phase, rect, satisfied, gated])

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

  if (active && step && entryState === 'pending') {
    // Mientras se decide si el paso aplica, solo el velo: sin parpadeo de globo.
    return createPortal(
      <div className="novex-tour" aria-hidden="true">
        <span className="novex-tour__shade novex-tour__shade--full" />
      </div>,
      document.body,
    )
  }
  if (!live || !step) return null

  const navigationLocked = Boolean(step.lockNavigation)
  const recoveryRequired = navigationLocked && phase === 'missing' && Boolean(onRecover)
  const gate = gated ? step.gate : undefined
  const waitsForState = Boolean(predicate) && kind === 'action' && !satisfied && phase === 'ready'
  const passthrough = step.interaction === 'external' && focusMode === 'target' && rect !== null
  // Las franjas que rodean el foco solo bloquean clics: oscurece la sombra del foco.
  const shadeClass = `novex-tour__shade novex-tour__shade--edge${
    passthrough ? ' novex-tour__shade--passthrough' : ''
  }`
  // Con el ancla ausente, o esperando la condición previa, el globo pide actuar
  // en la página: si no hay zona que resaltar, el velo completo no bloquea.
  const missingPassthrough = (phase === 'missing' || gated) && !navigationLocked

  // Con contexto, el globo se aparta de él y la flecha apunta a lo resaltado.
  const contextRect = rect && focusMode === 'target' ? placementRect : null
  const placement = planCardPlacement(
    contextRect ?? rect,
    { width: window.innerWidth, height: window.innerHeight },
    cardSize,
    step.placement === 'center' ? 'center' : step.placement === 'left' ? 'left' : 'auto',
    contextRect && rect ? rect : undefined,
    sheetEdgeRef.current,
  )

  const notice =
    phase === 'missing' && !gate
      ? composeMissingNotice(step.missingNotice, Boolean(step.optional))
      : null

  const footer = (
    <>
      {!navigationLocked && !recoveryRequired ? (
        <button type="button" className="novex-tour__skip" onClick={onSkip}>
          Omitir recorrido
        </button>
      ) : null}
      <div>
        {!navigationLocked && !recoveryRequired ? (
          <button
            type="button"
            className="novex-tour__previous"
            onClick={onPrevious}
            disabled={stepIndex === 0}
          >
            <span aria-hidden="true">‹</span>
            Anterior
          </button>
        ) : null}
        {gate || phase === 'locating' ? null : recoveryRequired ? (
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
          step.optional ? (
            <button type="button" onClick={onNext}>
              {step.skipLabel ?? 'Saltar paso'}
              <span aria-hidden="true">›</span>
            </button>
          ) : null
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

  // Lo que el recorrido espera va en su propia línea, sobre los botones.
  const waitingLabel = gate
    ? gate.waitingLabel
    : phase === 'locating'
      ? 'Buscando esta parte de la pantalla…'
      : waitsForState
        ? (step.waitingLabel ?? 'Complete la acción para continuar')
        : null
  const status = waitingLabel ? (
    <span className="novex-tour__waiting" role="status">
      <i />
      {waitingLabel}
    </span>
  ) : null

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
          <span
            className={`novex-tour__spotlight novex-tour__spotlight--${focusMode ?? 'target'}`}
            style={rect}
          />
        </>
      ) : (
        <span
          className={`novex-tour__shade novex-tour__shade--full${
            missingPassthrough ? ' novex-tour__shade--passthrough' : ''
          }`}
        />
      )}
      <TourBubble
        ref={dialogRef}
        placement={placement}
        eyebrow={gate?.eyebrow ?? step.eyebrow}
        title={gate?.title ?? step.title}
        description={gate?.description ?? step.description}
        expectation={gate?.expectation ?? step.expectation}
        // Con el elemento ausente el aviso ya dice qué hacer; repetirlo alarga
        // el globo y en móvil lo hace tapar la zona donde se actúa.
        expectationOverride={phase === 'missing' && !gate ? '' : undefined}
        stepNumber={stepIndex + 1}
        stepTotal={steps.length}
        onPause={onPause}
        pauseHidden={navigationLocked}
        keyboardHint={!navigationLocked && placement.mode !== 'sheet'}
        onKeyDown={onCardKeyDown}
        notice={notice}
        status={status}
        footer={footer}
      />
    </div>,
    document.body,
  )
}
