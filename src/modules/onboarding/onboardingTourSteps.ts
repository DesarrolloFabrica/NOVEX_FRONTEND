import type { NovexRoleCode } from '@/modules/auth/utils/roleExperience'

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

const OPERATIONAL_FLOW: OnboardingTourStep[] = [
  {
    id: 'impact',
    route: '/red-impacto',
    target: '[data-tour="impact-network"]',
    eyebrow: 'Red de impacto',
    title: 'Entienda el alcance antes de actuar',
    description:
      'Explore cómo una situación se origina y se propaga entre coordinaciones.',
    expectation:
      'Al seleccionar una coordinación verá sus situaciones y relaciones.',
  },
  {
    id: 'register',
    route: '/red-impacto',
    target: '[data-tour="register-situation"]',
    eyebrow: 'Captura operacional',
    title: 'Registre una situación desde cualquier vista',
    description:
      'Este acceso inicia el expediente operativo y está disponible solo para roles autorizados.',
    expectation: 'El formulario conservará su avance mientras agrega contexto.',
  },
  {
    id: 'capture',
    route: '/situaciones/nueva',
    target: '[data-tour="capture-form"]',
    eyebrow: 'Paso 1 de 3',
    title: 'Registre ahora su primera situación',
    description:
      'Complete los campos dentro del área iluminada. El recorrido continuará cuando el formulario esté validado y pulse Continuar.',
    expectation:
      'NOVEX conservará el borrador y validará la información antes de avanzar.',
    advanceOnTarget: '[data-tour="capture-review"]',
    waitingLabel: 'Complete el formulario para continuar',
  },
  {
    id: 'review',
    route: '/situaciones/nueva',
    target: '[data-tour="capture-review"]',
    eyebrow: 'Paso 2 de 3',
    title: 'Revise el expediente antes de enviarlo',
    description:
      'Compruebe el resumen y confirme el registro. Puede volver si encuentra algo que deba corregir.',
    expectation:
      'Al confirmar se crea una única situación y comienza la IA automáticamente.',
    advanceOnTarget: '[data-tour="analysis-stage"]',
    waitingLabel: 'Confirme el expediente para continuar',
  },
  {
    id: 'analysis',
    route: '/situaciones/nueva',
    target: '[data-tour="analysis-stage"]',
    eyebrow: 'Inteligencia operacional',
    title: 'NOVEX está preparando el informe',
    description:
      'El recorrido esperará aquí mientras se clasifican riesgo, impacto y recomendaciones. Si ocurre un error, puede reintentar sin duplicar la situación.',
    expectation:
      'Al terminar será llevado al expediente operativo recién creado.',
    advanceOnTarget: '[data-tour="situation-management"]',
    lockNavigation: true,
    waitingLabel: 'Esperando el análisis IA…',
  },
  {
    id: 'report',
    route: '/gestion',
    target: '[data-tour="ai-report"]',
    eyebrow: 'Informe generado',
    title: 'Revise la lectura ejecutiva de la IA',
    description:
      'Este bloque resume impacto, hipótesis y conclusión. Pulse Ver análisis ejecutivo IA para abrir el informe completo.',
    expectation:
      'El informe conserva el contexto original y la versión de análisis utilizada.',
    advanceOnTarget: '[data-tour="report-modal"]',
    waitingLabel: 'Abra el análisis ejecutivo para continuar',
  },
  {
    id: 'report-detail',
    route: '/gestion',
    target: '[data-tour="report-scroll"]',
    eyebrow: 'An\u00e1lisis ejecutivo IA',
    title: 'Revise el informe completo antes de exportarlo',
    description:
      'Recorra el an\u00e1lisis, sus hallazgos y recomendaciones. El siguiente paso aparecer\u00e1 cuando llegue al final del informe.',
    expectation:
      'Despl\u00e1cese dentro del \u00e1rea iluminada; el resto de la interfaz permanecer\u00e1 bloqueado.',
    advanceOnVisibleTarget: '[data-tour="report-end"]',
    visibilityRoot: '[data-tour="report-scroll"]',
    waitingLabel: 'Despl\u00e1cese hasta el final del informe',
    placement: 'left',
  },
  {
    id: 'pdf',
    route: '/gestion',
    target: '[data-tour="download-report"]',
    eyebrow: 'Reporte portable',
    title: 'Descargue el PDF cuando necesite compartirlo',
    description:
      'El PDF reúne el expediente y la inteligencia disponible sin alterar la situación.',
    expectation:
      'La descarga es opcional; siempre podrá volver a generarla desde el expediente.',
  },
  {
    id: 'history',
    route: '/situaciones',
    target: '[data-tour="situations-registry"]',
    eyebrow: 'Historial',
    title: 'Todo queda disponible para consulta',
    description:
      'Busque, filtre y abra cualquier situación dentro de su alcance.',
    expectation: 'El detalle conserva informe IA, evidencias y actividad.',
  },
  {
    id: 'management',
    route: '/gestion',
    target: '[data-tour="management-dossier"]',
    eyebrow: 'Ciclo operativo',
    title: 'Acompañe la situación hasta resolverla',
    description:
      'Revise recomendaciones, actividad y trazabilidad sin perder el expediente seleccionado.',
    expectation: 'Cada cambio queda disponible para auditoría y seguimiento.',
  },
  {
    id: 'status',
    route: '/gestion',
    target: '[data-tour="status-update-trigger"]',
    eyebrow: 'Estados y trazabilidad',
    title: 'Actualice el estado con una razón verificable',
    description:
      'Use Resuelta cuando el hecho esté controlado y Cerrada cuando la documentación esté completa.',
    expectation:
      'NOVEX validará las transiciones permitidas según el estado actual.',
  },
  {
    id: 'complete',
    route: '/gestion',
    target: '[data-tour="situation-management"]',
    placement: 'center',
    highlightTarget: false,
    eyebrow: 'Recorrido completado',
    title: 'Ya puede operar NOVEX de principio a fin',
    description:
      'Completó captura, análisis, consulta y seguimiento de su primera situación.',
    expectation:
      'Puede volver a ver este tutorial desde el menú de usuario cuando lo necesite.',
  },
]

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

const ADMIN_FLOW: OnboardingTourStep[] = [
  {
    id: 'admin',
    route: '/admin',
    target: '[data-tour="admin-console"]',
    eyebrow: 'Administración',
    title: 'Control central de la plataforma',
    description:
      'Usuarios, roles, coordinaciones, permisos y sistema viven en este espacio.',
    expectation: 'Los datos provienen de los catálogos vigentes del backend.',
  },
  {
    id: 'support',
    route: '/admin',
    target: '[data-tour="role-preview"]',
    eyebrow: 'Soporte por rol',
    title: 'Vea NOVEX desde la perspectiva de cada equipo',
    description:
      'Entre a cualquier dashboard sin alterar el rol ni los permisos de su sesión.',
    expectation: 'Siempre podrá regresar al control administrativo.',
  },
]

export function getOnboardingSteps(role: NovexRoleCode): OnboardingTourStep[] {
  if (role === 'ADMIN') return ADMIN_FLOW
  if (role === 'DIRECTOR') return [SHARED_INTRO, ...EXECUTIVE_FLOW]
  if (role === 'ANALISTA')
    return [SHARED_INTRO, ...EXECUTIVE_FLOW.slice(0, 2), ...OPERATIONAL_FLOW]
  return [{ ...SHARED_INTRO, route: '/red-impacto' }, ...OPERATIONAL_FLOW]
}
