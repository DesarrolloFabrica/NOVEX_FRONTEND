import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'
import { EXECUTIVE_OPERATIONS_HOME } from '@/modules/auth/utils/roleExperience'

export interface OnboardingTourStep {
  id: string
  route: string
  target: string
  eyebrow: string
  title: string
  description: string
  expectation: string
  /** Hito de interfaz que confirma una acción real y avanza el recorrido. */
  advanceOnTarget?: string
  advanceOnVisibleTarget?: string
  visibilityRoot?: string
  waitingLabel?: string
  lockNavigation?: boolean
  placement?: 'auto' | 'center' | 'left'
  highlightTarget?: boolean
}

const SHARED_INTRO: OnboardingTourStep = {
  id: 'welcome',
  route: '/dashboard',
  target: '[data-tour="platform-brand"]',
  eyebrow: 'Bienvenido a NOVEX',
  title: 'Su espacio de trabajo está listo',
  description:
    'La navegación y los indicadores se adaptan a las responsabilidades de su rol.',
  expectation:
    'Este recorrido le mostrará el flujo que usará en el trabajo diario.',
}

const EXECUTIVE_FLOW: OnboardingTourStep[] = [
  {
    id: 'overview',
    route: '/dashboard',
    target: '[data-tour="role-dashboard"]',
    eyebrow: 'Command Center',
    title: 'Una lectura ejecutiva, sin ruido de captura',
    description:
      'Su vista prioriza estado institucional, riesgos y cambios relevantes.',
    expectation: 'No encontrará formularios de registro en esta experiencia.',
  },
  {
    id: 'kpis',
    route: '/dashboard',
    target: '[data-tour="executive-kpis"]',
    eyebrow: 'Indicadores',
    title: 'La operación resumida en señales',
    description:
      'Activas, críticas, resueltas, tiempos y pendientes IA se actualizan con datos reales.',
    expectation: 'Use estas señales para decidir dónde profundizar.',
  },
  {
    id: 'risk',
    route: '/dashboard',
    target: '[data-tour="priority-situations"]',
    eyebrow: 'Riesgos',
    title: 'Lo prioritario aparece primero',
    description:
      'Las situaciones abiertas más recientes y sensibles quedan a un clic de su expediente.',
    expectation:
      'Puede abrir el detalle y los reportes sin entrar al flujo operativo.',
  },
  {
    id: 'impact',
    route: '/dashboard',
    target: '[data-tour="impact-summary"]',
    eyebrow: 'Impacto institucional',
    title: 'Detecte concentraciones entre coordinaciones',
    description:
      'La intensidad combina cantidad de situaciones y nivel de afectación.',
    expectation: 'La Red de Impacto permite profundizar visualmente.',
  },
  {
    id: 'trends',
    route: '/dashboard',
    target: '[data-tour="operational-trend"]',
    eyebrow: 'Tendencias',
    title: 'Compare la composición del estado actual',
    description:
      'La distribución muestra el balance entre carga activa, riesgo y resolución.',
    expectation: 'Con esto termina su recorrido ejecutivo.',
  },
]

/**
 * RECORRIDO OPERACIONAL (COORDINADOR y ANALISTA) sobre la experiencia ACTUAL.
 *
 * El flujo anterior paseaba por el asistente de captura de
 * `/situaciones/nueva`, retirado como creador de problemas internos: la única
 * puerta de creación es el formulario del Centro Operacional, y ahí ocurre la
 * jornada de ambos roles.
 *
 * Por eso el recorrido no navega: los seis pasos ocurren en la MISMA ruta y
 * señalan las regiones reales. Ninguno exige crear ni cerrar un problema de
 * verdad —`advanceOnTarget` queda fuera a propósito—, para que conocer la
 * pantalla no obligue a ensuciar la operación con un caso de prueba.
 */
const OPERATIONAL_SHELL_FLOW: OnboardingTourStep[] = [
  {
    id: 'shell-intro',
    route: EXECUTIVE_OPERATIONS_HOME,
    target: '[data-tour="operational-shell"]',
    placement: 'center',
    highlightTarget: false,
    eyebrow: 'Centro operacional',
    title: 'Su jornada ocurre en esta pantalla',
    description:
      'Aquí ve el estado de las coordinaciones, reporta problemas y resuelve los de su área, sin cambiar de vista.',
    expectation: 'Todo lo que necesita está a la vista, sin capas encima.',
  },
  {
    id: 'shell-deck',
    route: EXECUTIVE_OPERATIONS_HOME,
    target: '[data-tour="operational-deck"]',
    eyebrow: 'Coordinaciones',
    title: 'Cada carta es una coordinación',
    description:
      'Su color y su etiqueta indican el estado operacional. Pulse una para observarla; su posición no cambia nunca.',
    expectation: 'Seleccionar una carta actualiza la lista del centro.',
  },
  {
    id: 'shell-coordination-problems',
    route: EXECUTIVE_OPERATIONS_HOME,
    target: '[data-tour="coordination-problems"]',
    eyebrow: 'Problemas del área',
    title: 'Lo que ocurre en la coordinación observada',
    description:
      'La lista se ordena por criticidad. Si solo tiene acceso a parte de los problemas, la pantalla se lo advierte.',
    expectation: 'Al elegir un problema se abre su detalle a la derecha.',
  },
  {
    id: 'shell-my-reports',
    route: EXECUTIVE_OPERATIONS_HOME,
    target: '[data-tour="my-reports"]',
    eyebrow: 'Mis reportes',
    title: 'Lo que usted ha reportado, esté donde esté',
    description:
      'Esta lista no depende de la carta seleccionada: reúne sus reportes de cualquier coordinación, activos y solucionados.',
    expectation: 'Abrir uno lleva la pantalla a su coordinación responsable.',
  },
  {
    id: 'shell-report',
    route: EXECUTIVE_OPERATIONS_HOME,
    target: '[data-tour="report-problem"]',
    eyebrow: 'Reportar',
    title: 'Registre un problema de su coordinación',
    description:
      'El formulario aparece a la derecha y muestra siempre a qué área quedará atribuido. Usted indica qué tan grave es y, si ya produjo una consecuencia, su afectación inicial.',
    expectation:
      'Un problema que ocurre en otra coordinación se registra como dependencia.',
  },
  {
    id: 'shell-resolve',
    route: EXECUTIVE_OPERATIONS_HOME,
    target: '[data-tour="action-panel"]',
    placement: 'left',
    eyebrow: 'Resolver',
    title: 'Cierre los problemas de su área con un aprendizaje',
    description:
      'En el detalle de un problema de la coordinación que usted coordina aparecen el campo de aprendizaje y el botón «Problema solucionado».',
    expectation:
      'Solo el coordinador responsable puede resolver; en los demás casos el detalle se consulta.',
  },
  {
    id: 'shell-complete',
    route: EXECUTIVE_OPERATIONS_HOME,
    target: '[data-tour="operational-shell"]',
    placement: 'center',
    highlightTarget: false,
    eyebrow: 'Recorrido completado',
    title: 'Ya puede operar el Centro Operacional',
    description:
      'Observar coordinaciones, consultar problemas, reportar y resolver con aprendizaje.',
    expectation:
      'Puede volver a ver este tutorial desde el menú de usuario cuando lo necesite.',
  },
]

/**
 * Variante del ANALISTA: misma pantalla y mismas regiones; cambian los textos
 * de reportar (elige la carta) y de resolver (solo Coordinación General).
 */
const ANALYST_SHELL_COPY: Record<string, Partial<OnboardingTourStep>> = {
  'shell-intro': {
    description:
      'Aquí ve el estado de las coordinaciones y reporta problemas en la que tenga seleccionada, sin cambiar de vista.',
  },
  'shell-report': {
    title: 'Registre un problema en la coordinación seleccionada',
    description:
      'Elija una carta y abra «Problema interno». Usted indica qué tan grave es y, si ya produjo una consecuencia, su afectación inicial.',
    expectation: 'En sus propios reportes podrá registrar después nuevas afectaciones.',
  },
  'shell-resolve': {
    title: 'Consulte el detalle y siga sus reportes',
    description:
      'En el detalle verá cómo fue reportado, su severidad actual y sus afectaciones. Un analista resuelve solo problemas de Coordinación General.',
    expectation: 'En los demás casos el cierre corresponde al coordinador responsable.',
  },
}

const ANALYST_SHELL_FLOW: OnboardingTourStep[] = OPERATIONAL_SHELL_FLOW.map(
  (step) => ({ ...step, ...ANALYST_SHELL_COPY[step.id] }),
)

const ADMIN_FLOW: OnboardingTourStep[] = []

export function getOnboardingSteps(role: NovexRoleCode): OnboardingTourStep[] {
  // Admin opera sin recorrido guiado: la consola es su espacio principal.
  if (role === 'ADMIN') return ADMIN_FLOW
  if (role === 'DIRECTOR') return [SHARED_INTRO, ...EXECUTIVE_FLOW]
  if (role === 'ANALISTA')
    return [
      { ...SHARED_INTRO, route: EXECUTIVE_OPERATIONS_HOME },
      ...ANALYST_SHELL_FLOW,
    ]
  /*
   * COORDINADOR. Recorre el Centro Operacional, que es su landing y su puesto
   * de trabajo. El intro comparte esa ruta para que el recorrido no empiece
   * moviéndolo a una pantalla que ya no usa.
   */
  return [
    { ...SHARED_INTRO, route: EXECUTIVE_OPERATIONS_HOME },
    ...OPERATIONAL_SHELL_FLOW,
  ]
}
