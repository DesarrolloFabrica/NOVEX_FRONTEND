import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'
import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import { NovexIcon } from '@/shared/components/NovexIcon'
import {
  hasSeenImpactNetworkTour,
  isImpactNetworkTourRole,
  rememberImpactNetworkTour,
} from './impactNetworkTourStorage'

interface ImpactNetworkTourCoordination {
  id: CoordinationId
  name: string
  shortName: string
}

interface ImpactNetworkTourSituation {
  id: string
  title: string
}

interface ImpactNetworkTourProps {
  userId: string | undefined
  role: NovexRoleCode
  ready: boolean
  autoStartAllowed: boolean
  forceStartKey: number
  coordination: ImpactNetworkTourCoordination | null
  situation: ImpactNetworkTourSituation | null
  onShowInstitutional: () => void
  onPreviewCoordination: (coordinationId: CoordinationId | null) => void
  onOpenCoordination: (coordinationId: CoordinationId) => void
  onOpenSituation: (situationId: string) => void
}

interface HighlightRect {
  top: number
  left: number
  width: number
  height: number
}

type TourScene =
  | 'institutional'
  | 'summary'
  | 'coordination'
  | 'situation'
  | 'unchanged'

interface ImpactNetworkTourStep {
  id: string
  eyebrow: string
  title: string
  description: string
  expectation: string
  target?: string
  placement?: 'auto' | 'center' | 'left' | 'right'
  scene: TourScene
  example?: ReactNode
}

const CARD_WIDTH = 390
const CARD_HEIGHT = 430
const CARD_GAP = 16
const VIEWPORT_MARGIN = 16

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function getCardStyle(
  rect: HighlightRect | null,
  placement: ImpactNetworkTourStep['placement'] = 'auto',
): CSSProperties {
  if (!rect || placement === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  const maximumLeft = Math.max(
    VIEWPORT_MARGIN,
    window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN,
  )
  const maximumTop = Math.max(
    VIEWPORT_MARGIN,
    window.innerHeight - CARD_HEIGHT - VIEWPORT_MARGIN,
  )
  const sideTop = clamp(rect.top, VIEWPORT_MARGIN, maximumTop)

  if (placement === 'left') {
    return { top: sideTop, left: VIEWPORT_MARGIN }
  }
  if (placement === 'right') {
    return { top: sideTop, left: maximumLeft }
  }

  const targetRight = rect.left + rect.width
  const targetBottom = rect.top + rect.height
  if (rect.left >= VIEWPORT_MARGIN + CARD_WIDTH + CARD_GAP) {
    return {
      top: sideTop,
      left: rect.left - CARD_WIDTH - CARD_GAP,
    }
  }
  if (
    window.innerWidth - targetRight >=
    VIEWPORT_MARGIN + CARD_WIDTH + CARD_GAP
  ) {
    return { top: sideTop, left: targetRight + CARD_GAP }
  }

  return {
    top:
      window.innerHeight - targetBottom >= CARD_HEIGHT + CARD_GAP
        ? targetBottom + CARD_GAP
        : VIEWPORT_MARGIN,
    left: clamp(
      rect.left + rect.width / 2 - CARD_WIDTH / 2,
      VIEWPORT_MARGIN,
      maximumLeft,
    ),
  }
}

function buildSteps(
  coordination: ImpactNetworkTourCoordination,
  situation: ImpactNetworkTourSituation | null,
): ImpactNetworkTourStep[] {
  const coordinationName = coordination.shortName || coordination.name

  const shared: ImpactNetworkTourStep[] = [
    {
      id: 'welcome',
      eyebrow: 'Red de impacto · Guía rápida',
      title: 'Revise una situación de principio a fin',
      description:
        'En pocos pasos aprenderá a pasar del panorama institucional al detalle de una situación y su alcance entre coordinaciones.',
      expectation:
        'La guía utilizará información visible para su rol y no modificará ningún dato.',
      placement: 'center',
      scene: 'institutional',
    },
    {
      id: 'coordination-map',
      eyebrow: '1 · Panorama institucional',
      title: 'Ubique dónde necesita profundizar',
      description:
        'Las coordinaciones están agrupadas por estado. Los indicadores, filtros y señales de prioridad ayudan a comenzar por lo más sensible.',
      expectation:
        'En el uso diario, seleccione cualquier isla para consultar su resumen antes de abrirla.',
      target: '[data-impact-tour="coordination-board"]',
      placement: 'right',
      scene: 'institutional',
    },
    {
      id: 'coordination-summary',
      eyebrow: '2 · Resumen de coordinación',
      title: `Confirme qué ocurre en ${coordinationName}`,
      description:
        'Este panel explica el estado, cuántas situaciones siguen activas, el impacto relacionado y la actividad reciente.',
      expectation:
        'Use “Revisar situación” para ir al caso prioritario o “Ver mapa” para consultar toda la coordinación.',
      target: '[data-impact-tour="coordination-summary"]',
      placement: 'left',
      scene: 'summary',
    },
    {
      id: 'situation-list',
      eyebrow: '3 · Situaciones de la coordinación',
      title: situation
        ? 'Elija el expediente que debe revisar'
        : 'Reconozca cuándo la operación está estable',
      description: situation
        ? 'La lista prioriza los casos activos y muestra riesgo, estado, áreas afectadas y fecha de actualización.'
        : 'Esta coordinación no tiene alertas abiertas. Cuando aparezca una situación, se listará aquí con su riesgo y estado.',
      expectation: situation
        ? 'La guía abrirá un caso real para mostrarle la lectura completa.'
        : 'No se insertarán alertas ficticias en la operación; a continuación verá un ejemplo didáctico.',
      target: situation
        ? '[data-impact-tour="situation-list"]'
        : '[data-impact-tour="empty-situations"]',
      placement: 'left',
      scene: 'coordination',
    },
  ]

  if (!situation) {
    return [
      ...shared,
      {
        id: 'example',
        eyebrow: '4 · Ejemplo didáctico',
        title: 'Así se leerá una situación activa',
        description:
          'Cuando exista un caso, la red conectará su coordinación de origen con las áreas declaradas o analizadas como afectadas.',
        expectation:
          'Abra el expediente para revisar riesgo, estado, trazabilidad y descargar el reporte disponible.',
        placement: 'center',
        scene: 'unchanged',
        example: (
          <div className="impact-network-tour__example">
            <span>Ejemplo de tutorial · No es un dato real</span>
            <strong>Interrupción de servicio académico</strong>
            <dl>
              <div>
                <dt>Origen</dt>
                <dd>{coordinationName}</dd>
              </div>
              <div>
                <dt>Riesgo</dt>
                <dd>Alto · 78/100</dd>
              </div>
              <div>
                <dt>Impacto</dt>
                <dd>2 coordinaciones relacionadas</dd>
              </div>
            </dl>
            <p>Origen → propagación → expediente → seguimiento</p>
          </div>
        ),
      },
      {
        id: 'complete',
        eyebrow: 'Recorrido completado',
        title: 'Ya conoce el flujo de revisión',
        description:
          'Empiece por una coordinación, revise sus situaciones y abra un expediente para entender el impacto completo.',
        expectation:
          'Puede volver a abrir esta guía desde “Acerca de Red de impacto”.',
        placement: 'center',
        scene: 'unchanged',
      },
    ]
  }

  return [
    ...shared,
    {
      id: 'impact-map',
      eyebrow: '4 · Alcance de la situación',
      title: 'Siga el impacto desde su origen',
      description: `La red abrió “${situation.title}”. La isla origen y sus conexiones muestran dónde comenzó y qué coordinaciones están relacionadas.`,
      expectation:
        'Las conexiones visibles provienen de información declarada o del análisis disponible; una simulación siempre se identifica como potencial.',
      target: '[data-impact-tour="impact-map"]',
      placement: 'left',
      scene: 'situation',
    },
    {
      id: 'situation-detail',
      eyebrow: '5 · Expediente y seguimiento',
      title: 'Compruebe el caso antes de decidir',
      description:
        'Aquí encontrará riesgo, estado, áreas relacionadas, actualización, línea de tiempo y las acciones permitidas para su rol.',
      expectation:
        'Puede descargar el PDF; los cambios de estado solo aparecen para usuarios autorizados. Use la flecha de regreso para volver a la coordinación.',
      target: '[data-impact-tour="situation-dossier"]',
      placement: 'left',
      scene: 'situation',
    },
    {
      id: 'complete',
      eyebrow: 'Recorrido completado',
      title: 'Ya puede revisar cualquier situación',
      description:
        'El flujo siempre es el mismo: panorama institucional → coordinación → situación → impacto y expediente.',
      expectation:
        'Puede volver a abrir esta guía desde “Acerca de Red de impacto”.',
      placement: 'center',
      scene: 'unchanged',
    },
  ]
}

export function ImpactNetworkTour({
  userId,
  role,
  ready,
  autoStartAllowed,
  forceStartKey,
  coordination,
  situation,
  onShowInstitutional,
  onPreviewCoordination,
  onOpenCoordination,
  onOpenSituation,
}: ImpactNetworkTourProps) {
  const eligible = isImpactNetworkTourRole(role)
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState<HighlightRect | null>(null)
  const [stepReady, setStepReady] = useState(false)
  const [tourCoordination, setTourCoordination] =
    useState<ImpactNetworkTourCoordination | null>(null)
  const [tourSituation, setTourSituation] =
    useState<ImpactNetworkTourSituation | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const autoStartedForUserRef = useRef<string | null>(null)
  const lastForceStartRef = useRef(0)
  const steps = useMemo(
    () =>
      tourCoordination ? buildSteps(tourCoordination, tourSituation) : [],
    [tourCoordination, tourSituation],
  )
  const step = steps[stepIndex]

  const start = useCallback(() => {
    if (!eligible || !ready || !coordination) return
    previousFocusRef.current = document.activeElement as HTMLElement | null
    setTourCoordination(coordination)
    setTourSituation(situation)
    setStepIndex(0)
    setRect(null)
    setStepReady(false)
    setActive(true)
  }, [coordination, eligible, ready, situation])

  const close = useCallback(
    (outcome: 'completed' | 'skipped') => {
      if (userId) rememberImpactNetworkTour(userId, outcome)
      setActive(false)
      setRect(null)
      setStepReady(false)
      onPreviewCoordination(null)
      window.setTimeout(() => previousFocusRef.current?.focus(), 0)
    },
    [onPreviewCoordination, userId],
  )

  useEffect(() => {
    if (
      !userId ||
      !eligible ||
      !ready ||
      !autoStartAllowed ||
      active ||
      autoStartedForUserRef.current === userId ||
      hasSeenImpactNetworkTour(userId)
    ) {
      return
    }

    autoStartedForUserRef.current = userId
    const timer = window.setTimeout(start, 450)
    return () => window.clearTimeout(timer)
  }, [active, autoStartAllowed, eligible, ready, start, userId])

  useEffect(() => {
    if (
      forceStartKey <= 0 ||
      forceStartKey === lastForceStartRef.current ||
      !eligible ||
      !ready
    ) {
      return
    }
    lastForceStartRef.current = forceStartKey
    start()
  }, [eligible, forceStartKey, ready, start])

  useEffect(() => {
    if (!active || !step || !tourCoordination) return

    if (step.scene === 'institutional') {
      onPreviewCoordination(null)
      onShowInstitutional()
    } else if (step.scene === 'summary') {
      onShowInstitutional()
      onPreviewCoordination(tourCoordination.id)
    } else if (step.scene === 'coordination') {
      onPreviewCoordination(null)
      onOpenCoordination(tourCoordination.id)
    } else if (step.scene === 'situation' && tourSituation) {
      onPreviewCoordination(null)
      onOpenSituation(tourSituation.id)
    }
  }, [
    active,
    onOpenCoordination,
    onOpenSituation,
    onPreviewCoordination,
    onShowInstitutional,
    step,
    tourCoordination,
    tourSituation,
  ])

  useLayoutEffect(() => {
    if (!active || !step) {
      setRect(null)
      setStepReady(false)
      return
    }

    if (!step.target) {
      setRect(null)
      setStepReady(true)
      return
    }

    let timer = 0
    let attempts = 0
    const update = () => {
      const target = document.querySelector<HTMLElement>(step.target!)
      if (!target) {
        setRect(null)
        setStepReady(false)
        if (attempts < 80) {
          attempts += 1
          timer = window.setTimeout(update, 100)
        } else {
          // Si la interfaz no puede montar el objetivo, mantenemos el recorrido
          // utilizable sin mostrar una tarjeta transitoria en una posición errónea.
          setStepReady(true)
        }
        return
      }

      target.scrollIntoView({ block: 'center', inline: 'center' })
      const box = target.getBoundingClientRect()
      const padding = 9
      const top = Math.max(8, box.top - padding)
      const left = Math.max(8, box.left - padding)
      setRect({
        top,
        left,
        width: Math.max(
          1,
          Math.min(window.innerWidth - left - 8, box.width + padding * 2),
        ),
        height: Math.max(
          1,
          Math.min(window.innerHeight - top - 8, box.height + padding * 2),
        ),
      })
      setStepReady(true)
    }

    const observer = new MutationObserver(update)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    update()
    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, step])

  const goToStep = useCallback((nextIndex: number) => {
    setStepReady(false)
    setRect(null)
    setStepIndex(nextIndex)
  }, [])

  const next = useCallback(() => {
    if (stepIndex >= steps.length - 1) {
      close('completed')
      return
    }
    goToStep(stepIndex + 1)
  }, [close, goToStep, stepIndex, steps.length])

  const previous = useCallback(() => {
    goToStep(Math.max(0, stepIndex - 1))
  }, [goToStep, stepIndex])

  useEffect(() => {
    if (!active) return
    const timer = stepReady
      ? window.setTimeout(() => dialogRef.current?.focus(), 60)
      : 0
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close('skipped')
        return
      }
      if (!stepReady) return
      if (event.key === 'ArrowRight') next()
      if (event.key === 'ArrowLeft' && stepIndex > 0) previous()
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)'),
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
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [active, close, next, previous, stepIndex, stepReady])

  if (!active || !step || !tourCoordination) return null

  const cardStyle = getCardStyle(rect, step.placement)
  const titleId = 'impact-network-tour-title'
  const descriptionId = 'impact-network-tour-description'

  return createPortal(
    <div
      className="novex-tour impact-network-tour"
      data-impact-tour-step={step.id}
      data-impact-tour-ready={stepReady ? 'true' : 'false'}
      aria-live="polite"
    >
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

      {stepReady ? (
        <div
          ref={dialogRef}
          className="novex-tour__card impact-network-tour__card"
          style={cardStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
          <header>
            <span>{step.eyebrow}</span>
            <button
              type="button"
              onClick={() => close('skipped')}
              aria-label="Omitir tutorial de Red de impacto"
            >
              <NovexIcon name="x" />
            </button>
          </header>
          <div
            className="novex-tour__progress"
            aria-label={`Paso ${stepIndex + 1} de ${steps.length}`}
          >
            <i
              style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
          <h2 id={titleId}>{step.title}</h2>
          <p id={descriptionId}>{step.description}</p>
          {step.example}
          <div className="novex-tour__expectation">
            <NovexIcon name="sparkles" />
            <span>
              <strong>Qué verá</strong>
              {step.expectation}
            </span>
          </div>
          <footer>
            <button
              type="button"
              className="novex-tour__skip"
              onClick={() => close('skipped')}
            >
              Omitir tutorial
            </button>
            <div>
              <button
                type="button"
                onClick={previous}
                disabled={stepIndex === 0}
              >
                Anterior
              </button>
              <button
                type="button"
                className="novex-tour__next"
                onClick={next}
              >
                {stepIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}
                <NovexIcon name="chevron-right" />
              </button>
            </div>
          </footer>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
