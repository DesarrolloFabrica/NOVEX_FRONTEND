import type { TourPredicate } from '../engine/tourPredicates'
import type { OnboardingTourStep, TourStepGate } from '../onboardingTourSteps'

/**
 * Piloto del recorrido del COORDINADOR. Es una definición independiente: no
 * sustituye ni modifica los pasos de los demás roles.
 *
 * Todos los pasos viven en /centro-operacional. Ninguno ejecuta acciones de
 * negocio: los que dependen de un problema seleccionado son opcionales y ofrecen
 * continuar cuando no hay datos.
 */
const ROUTE = '/centro-operacional'
const EYEBROW_PREFIX = 'Piloto · '

/** La lista de problemas, solo cuando tiene alguno que elegir. */
const PROBLEM_LIST_WITH_ROWS =
  '[data-tour="coordination-problems"]:has([data-testid="problem-row"])'

/** Controles «Volver» reales del expediente, del historial y del formulario de reporte. */
const PANEL_BACK_CONTROLS =
  '[data-testid="detail-back"], [data-testid="history-back"], [data-testid="report-form-back"]'

/** El panel de acción muestra alguna de estas vistas en lugar de sus opciones. */
function panelShowing(modes: string[]): TourPredicate {
  return {
    type: 'any',
    predicates: modes.map((mode) => ({
      type: 'present',
      selector: `[data-testid="action-panel"][data-mode="${mode}"]`,
    })),
  }
}

/**
 * Pide volver a la vista principal del panel antes de explicar sus opciones.
 * Solo resalta el control «Volver»: nunca lo pulsa ni cambia el problema.
 */
function returnToPanelGate(modes: string[], purpose: string): TourStepGate {
  return {
    when: panelShowing(modes),
    target: PANEL_BACK_CONTROLS,
    eyebrow: 'Volver',
    title: 'Regrese a la vista de su coordinación',
    description: `Para ver ${purpose}, cierre la vista abierta con la flecha «Volver». Cerrarla no cambia ningún dato.`,
    expectation: 'Cuando el panel muestre sus opciones, el recorrido continuará aquí.',
    waitingLabel: 'Esperando que cierre la vista',
  }
}

export const COORDINATOR_PILOT_STEPS: OnboardingTourStep[] = [
  {
    id: 'bienvenida',
    route: ROUTE,
    target: '[data-tour="operational-shell"]',
    highlightTarget: false,
    placement: 'center',
    eyebrow: `${EYEBROW_PREFIX}Coordinador`,
    title: 'Bienvenido a su coordinación',
    description:
      'Este es su espacio de trabajo en NOVEX. Aquí podrá conocer el estado de su coordinación, consultar situaciones y realizar seguimiento a los problemas que requieren atención.',
    expectation: 'El recorrido no cambia ningún dato. Puede omitirlo cuando quiera.',
  },
  {
    id: 'carta-propia',
    route: ROUTE,
    // La carta misma: su contenedor se estira con la columna y resaltaría escenario vacío.
    target: '[data-tour="own-coordination"] [data-testid="coordination-card"]',
    eyebrow: 'Su coordinación',
    title: 'Su coordinación, en una carta',
    description:
      'Esta carta representa a su coordinación y es la pieza central de su espacio de trabajo. Su ilustración, su color y sus señales le muestran cómo está su área.',
    expectation:
      'Siempre verá aquí la coordinación a la que pertenece. En el siguiente paso leerá su estado.',
  },
  {
    id: 'indicadores',
    route: ROUTE,
    target: '[data-tour="own-coordination"] [data-testid="coordination-card-status"]',
    // Se resalta solo la etiqueta, pero el globo se aparta de la carta entera.
    placementTarget: '[data-tour="own-coordination"] [data-testid="coordination-card"]',
    eyebrow: 'Estado',
    title: 'El estado de su coordinación',
    description:
      'Esta etiqueta indica el estado operativo actual de su coordinación. Se calcula con sus problemas activos y con las dependencias de otras áreas que la afectan.',
    expectation: 'Alerta y Crítico piden su atención. Desconocido indica que no se pudo calcular.',
  },
  {
    id: 'personaje',
    route: ROUTE,
    // La figura, sus vidas y su rótulo como una unidad; la región solo añade el marco.
    // Atributos literales: el testid de la región se genera con una plantilla.
    target: '[data-tour="operational-shell"] [data-testid="direction-character"]',
    eyebrow: 'Personaje',
    title: 'El personaje de su coordinación',
    description:
      'Su expresión refleja el estado de su coordinación. Los corazones representan sus vidas operativas y disminuyen según la cantidad y gravedad de los problemas que la afectan.',
    expectation:
      'Estado y vidas son indicadores distintos: Crítico no significa haber perdido todos los corazones.',
  },
  {
    id: 'mis-reportes',
    route: ROUTE,
    // El panel sin el marco de su región: cabecera con el total, lista y «Expandir».
    target: '[data-tour="my-reports"] [data-testid="my-reports"]',
    eyebrow: 'Mis reportes',
    title: 'Los problemas que usted ha reportado',
    description:
      'Aquí encuentra los problemas que usted ha registrado, abiertos o cerrados, con su estado actual, aunque involucren a otras coordinaciones.',
    expectation: 'Al elegir uno se abre su expediente. Solo aparecen los que usted registró.',
  },
  {
    id: 'problemas',
    route: ROUTE,
    target: '[data-tour="coordination-problems"]',
    eyebrow: 'Problemas',
    title: 'Problemas de su coordinación',
    description:
      'La lista ordena los problemas por prioridad. Si hay muchos, despliegue la lista para verlos todos.',
    expectation: 'El botón «Expandir» muestra todos los problemas del área.',
  },
  {
    id: 'detalle',
    route: ROUTE,
    target: '[data-tour="problem-detail"]',
    eyebrow: 'Detalle',
    title: 'El expediente de un problema',
    description:
      'Al elegir un problema se abre su expediente: quién lo reportó, qué ocurrió y las afectaciones registradas.',
    expectation: 'Este paso se muestra cuando hay un problema seleccionado.',
    optional: true,
    missingNotice:
      'Todavía no hay un problema seleccionado. Si su lista tiene problemas, elija uno y pulse «Reintentar».',
    missingTarget: PROBLEM_LIST_WITH_ROWS,
  },
  {
    id: 'seguimiento',
    route: ROUTE,
    target: '[data-tour="problem-actions"]',
    eyebrow: 'Seguimiento',
    title: 'Avance y resolución',
    description:
      'Desde el expediente se avanza el estado del problema. Si su coordinación es la responsable, también puede cerrarlo registrando el aprendizaje.',
    expectation: 'Este recorrido no avanza ni cierra ningún problema.',
    requires: ['SITUATIONS_UPDATE'],
    optional: true,
    missingNotice:
      'Estas acciones aparecen al abrir un problema. Elija uno en la lista y pulse «Reintentar».',
    missingTarget: PROBLEM_LIST_WITH_ROWS,
  },
  {
    id: 'reportar',
    route: ROUTE,
    target: '[data-tour="action-panel"]',
    eyebrow: 'Reportar',
    title: 'Reportar o consultar',
    description:
      'Use «Problema interno» para su coordinación o «Dependencia de otra coordinación» cuando otra área deba resolverlo. No se abre ningún formulario.',
    expectation: 'Al entrar, su coordinación ya está seleccionada.',
    requires: ['SITUATIONS_CREATE'],
    gate: returnToPanelGate(['detail', 'history', 'report'], 'las opciones de reporte'),
  },
  {
    id: 'historial',
    route: ROUTE,
    // Con el historial ya abierto se resalta el propio historial.
    target: '[data-tour="history-open"], [data-tour="problem-history"]',
    eyebrow: 'Historial',
    title: 'Problemas ya cerrados',
    description:
      'En el historial consulta problemas cerrados por semana, mes o ciclo, con el aprendizaje que quedó registrado.',
    expectation: 'Abrirlo no cambia nada. Para volver use «Volver».',
    optional: true,
    missingNotice: 'El acceso al historial no está visible en este momento.',
    gate: returnToPanelGate(['detail', 'report'], 'el acceso al historial'),
  },
  {
    id: 'menu',
    route: ROUTE,
    target: '[data-tour="center-menu"]',
    eyebrow: 'Menú',
    title: 'Menú y final del recorrido',
    description:
      'Desde el menú cambia de vista, abre la ayuda y registra un problema cuando lo necesite.',
    expectation: 'Con esto termina el recorrido. Pulse Finalizar.',
  },
]

export const COORDINATOR_PILOT_STEP_COUNT = COORDINATOR_PILOT_STEPS.length
