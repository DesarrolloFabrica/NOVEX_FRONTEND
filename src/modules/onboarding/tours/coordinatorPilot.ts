import type { OnboardingTourStep } from '../onboardingTourSteps'

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

export const COORDINATOR_PILOT_STEPS: OnboardingTourStep[] = [
  {
    id: 'bienvenida',
    route: ROUTE,
    target: '[data-tour="operational-shell"]',
    highlightTarget: false,
    placement: 'center',
    eyebrow: `${EYEBROW_PREFIX}Coordinador`,
    title: 'Bienvenido al Centro operacional',
    description:
      'Este es su puesto de trabajo. Aquí ve su coordinación, sus reportes y los problemas que le corresponden.',
    expectation: 'El recorrido no cambia ningún dato. Puede omitirlo cuando quiera.',
  },
  {
    id: 'carta-propia',
    route: ROUTE,
    target: '[data-tour="own-coordination"]',
    eyebrow: 'Su coordinación',
    title: 'Esta es su carta',
    description:
      'Muestra el nombre de su coordinación y el color que la identifica.',
    expectation: 'Siempre verá aquí la coordinación a la que pertenece.',
  },
  {
    id: 'indicadores',
    route: ROUTE,
    target: '[data-tour="own-coordination"] [data-testid="coordination-card-status"]',
    eyebrow: 'Indicadores',
    title: 'El estado de su área',
    description:
      'La etiqueta de la carta resume cómo va su coordinación. Léala antes de revisar los problemas.',
    expectation: 'Es solo una lectura: mirar la carta no la modifica.',
  },
  {
    id: 'mis-reportes',
    route: ROUTE,
    target: '[data-tour="my-reports"]',
    eyebrow: 'Mis reportes',
    title: 'Lo que usted ha reportado',
    description:
      'Aquí aparecen los problemas que usted registró, de cualquier coordinación.',
    expectation: 'Al elegir uno, se abre su detalle.',
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
      'Estas acciones aparecen al abrir un problema de su coordinación. Puede continuar sin este paso.',
  },
  {
    id: 'reportar',
    route: ROUTE,
    target: '[data-tour="action-panel"]',
    eyebrow: 'Reportar',
    title: 'Reportar o consultar',
    description:
      'Desde este panel registra un problema interno de su coordinación o una dependencia de otra. Esta explicación no abre ningún formulario.',
    expectation: 'Al entrar, su coordinación ya está seleccionada.',
    requires: ['SITUATIONS_CREATE'],
  },
  {
    id: 'historial',
    route: ROUTE,
    target: '[data-tour="history-open"]',
    eyebrow: 'Historial',
    title: 'Problemas ya cerrados',
    description:
      'En el historial consulta problemas cerrados por semana, mes o ciclo, con el aprendizaje que quedó registrado.',
    expectation: 'Abrirlo no cambia nada. Para volver use «Volver».',
    optional: true,
    missingNotice:
      'El acceso al historial no está disponible en este momento. Puede continuar.',
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
