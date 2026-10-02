import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import {
  DOSSIER_HISTORY_STATUS_LABEL,
  DOSSIER_SEVERITY_LABEL,
} from '@/modules/operational-cards/data/problemDossier'

/**
 * Presentación de las secciones de lectura del detalle: notas, otras
 * evidencias y cronología.
 *
 * Funciones puras: traducen el contrato del backend a texto legible y nunca
 * inventan un valor que no venga en él. Lo que falta se dice («Autor no
 * registrado», «Fecha no disponible») o simplemente no se pinta; un código
 * técnico o un objeto de metadata en bruto no llegan nunca a la vista.
 *
 * Las etiquetas de estado y severidad se reutilizan de `problemDossier`, que es
 * la fuente que ya usan las fichas del Centro Operacional. No se importan las
 * del módulo legacy `monitoring`: tienen otro vocabulario («Situación…») y
 * crearían una dependencia entre módulos solo por un diccionario.
 */

export const AUTHOR_NOT_RECORDED = 'Autor no registrado'
export const SYSTEM_AUTHOR = 'Sistema'
export const DATE_NOT_AVAILABLE = 'Fecha no disponible'

/** Zona horaria institucional: las fechas no dependen del navegador. */
const INSTITUTIONAL_TIME_ZONE = 'America/Bogota'

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-CO', {
  timeZone: INSTITUTIONAL_TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export interface FormattedDateTime {
  /** Texto para la persona. */
  label: string
  /** Valor ISO para `<time dateTime>`; null si la fecha no es válida. */
  iso: string | null
}

/** Fecha y hora en `es-CO` y hora de Bogotá; una fecha inválida no rompe la vista. */
export function formatProblemDateTime(
  value: string | null | undefined,
): FormattedDateTime {
  if (!value) return { label: DATE_NOT_AVAILABLE, iso: null }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return { label: DATE_NOT_AVAILABLE, iso: null }
  }
  return { label: DATE_TIME_FORMAT.format(date), iso: date.toISOString() }
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null
}

// ---------------------------------------------------------------- Evidencias

/** Tipos del backend (`EvidenceType`) traducidos. `NOTE` no se muestra como tipo. */
const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  IMAGE: 'Imagen',
  DOCUMENT: 'Documento',
  VIDEO: 'Video',
  EMAIL: 'Correo',
  LINK: 'Enlace',
  NOTE: 'Nota',
  OTHER: 'Otro',
}

export interface ProblemNoteView {
  id: string
  title: string
  /** Contenido completo, sin recortar; la vista respeta sus saltos de línea. */
  content: string
  author: string
  date: FormattedDateTime
}

export interface ProblemOtherEvidenceView {
  id: string
  title: string
  typeLabel: string
  description: string | null
  /** Metadatos que existen, ya legibles. Sin enlaces ni descargas: no hay soporte. */
  facts: readonly { label: string; value: string }[]
  author: string
  date: FormattedDateTime
}

/** Un decimal con la coma de `es-CO` («240,0 KB»). */
const SIZE_FORMAT = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function formatFileSize(bytes: number | null): string | null {
  // El backend serializa el tamaño como bigint; puede llegar como texto.
  const value = typeof bytes === 'string' ? Number(bytes) : bytes
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${SIZE_FORMAT.format(value / 1024)} KB`
  return `${SIZE_FORMAT.format(value / (1024 * 1024))} MB`
}

/**
 * Separa las notas de texto del resto. Las notas son lo único que hoy produce
 * la aplicación; los demás tipos solo pueden llegar por API y se conservan
 * aparte, sin prometer acceso al archivo, porque el backend no lo almacena.
 * Se respeta el orden de llegada del backend.
 */
export function splitProblemEvidences(items: readonly SituationEvidenceItem[]): {
  notes: ProblemNoteView[]
  others: ProblemOtherEvidenceView[]
} {
  const notes: ProblemNoteView[] = []
  const others: ProblemOtherEvidenceView[] = []

  for (const item of items) {
    const author = nonEmpty(item.uploadedByUserName) ?? AUTHOR_NOT_RECORDED
    const date = formatProblemDateTime(item.createdAt)

    if (item.type === 'NOTE') {
      notes.push({
        id: item.id,
        title: nonEmpty(item.title) ?? 'Nota sin título',
        content: item.description ?? '',
        author,
        date,
      })
      continue
    }

    const facts: { label: string; value: string }[] = []
    const fileName = nonEmpty(item.fileName)
    if (fileName) facts.push({ label: 'Archivo', value: fileName })
    const mimeType = nonEmpty(item.mimeType)
    if (mimeType) facts.push({ label: 'Formato', value: mimeType })
    const size = formatFileSize(item.fileSize)
    if (size) facts.push({ label: 'Tamaño', value: size })

    others.push({
      id: item.id,
      title: nonEmpty(item.title) ?? fileName ?? 'Evidencia sin título',
      typeLabel: EVIDENCE_TYPE_LABEL[item.type] ?? 'Evidencia',
      description: nonEmpty(item.description),
      facts,
      author,
      date,
    })
  }

  return { notes, others }
}

// ---------------------------------------------------------------- Cronología

/**
 * Etiquetas de los eventos que el detalle muestra. El cierre usa «Problema
 * cerrado», el mismo vocabulario del bloque de resolución («Cerrar problema»,
 * «Problema cerrado»).
 */
const TIMELINE_EVENT_LABEL: Record<string, string> = {
  SITUATION_CREATED: 'Problema registrado',
  STATUS_CHANGED: 'Estado cambiado',
  SEVERITY_CHANGED: 'Severidad cambiada',
  UPDATED: 'Problema actualizado',
  ATTACHMENT_ADDED: 'Evidencia agregada',
  SLA_WARNING: 'Plazo próximo a vencer',
  SLA_BREACHED: 'Plazo operativo vencido',
  CLOSED: 'Problema cerrado',
}

/** Etiqueta neutra: un código nuevo no se expone ni se atribuye a nadie. */
const UNKNOWN_EVENT_LABEL = 'Actividad registrada'

/** Eventos que emite el barrido de SLA del backend, sin usuario. */
const SYSTEM_EVENT_TYPES = new Set(['SLA_WARNING', 'SLA_BREACHED'])

/**
 * Eventos cuya `description` del backend solo repite lo que ya dicen la
 * etiqueta y la transición —y a veces con códigos en bruto, como «pasó a
 * IN_PROGRESS» en datos antiguos—. Para ellos se usa la metadata estructurada.
 */
const STRUCTURED_EVENT_TYPES = new Set([
  'SITUATION_CREATED',
  'STATUS_CHANGED',
  'SEVERITY_CHANGED',
  'UPDATED',
  'ATTACHMENT_ADDED',
  'SLA_WARNING',
  'SLA_BREACHED',
  'CLOSED',
])

const UPDATED_FIELD_LABEL: Record<string, string> = {
  title: 'título',
  description: 'descripción',
  coordinationId: 'coordinación',
  categoryId: 'categoría',
  occurredAt: 'fecha de ocurrencia',
}

export interface ProblemTimelineEntryView {
  id: string
  label: string
  /** Persona, «Sistema» o «Autor no registrado». */
  actor: string
  /** Valor anterior y nuevo, solo si ambos vienen y se pueden traducir. */
  transition: { from: string; to: string } | null
  /** Información adicional legible, sin repetir la etiqueta. */
  details: readonly string[]
  date: FormattedDateTime
}

function resolveActor(entry: SituationTimelineEntry): string {
  const name = nonEmpty(entry.userName)
  if (name) return name
  // Solo los eventos que el backend genera sin usuario se atribuyen al sistema;
  // una acción humana sin autor (severidad o datos editados) se declara como tal.
  if (SYSTEM_EVENT_TYPES.has(entry.eventType)) return SYSTEM_AUTHOR
  return AUTHOR_NOT_RECORDED
}

function resolveTransition(
  metadata: Record<string, unknown> | null,
): { from: string; to: string } | null {
  if (!metadata) return null
  const dictionary =
    metadata.field === 'status'
      ? DOSSIER_HISTORY_STATUS_LABEL
      : metadata.field === 'severity'
        ? (DOSSIER_SEVERITY_LABEL as Record<string, string>)
        : null
  if (!dictionary) return null

  const previous = nonEmpty(metadata.previousValue)
  const next = nonEmpty(metadata.newValue)
  const from = previous ? dictionary[previous] : undefined
  const to = next ? dictionary[next] : undefined
  // Un valor ausente o fuera del diccionario no se inventa ni se muestra crudo.
  return from && to ? { from, to } : null
}

function resolveDetails(entry: SituationTimelineEntry): string[] {
  const metadata = entry.metadata
  const details: string[] = []

  const comment = nonEmpty(metadata?.statusComment)
  if (comment) {
    details.push(
      `${metadata?.commentKind === 'closure' ? 'Motivo' : 'Nota'}: ${comment}`,
    )
  }

  switch (entry.eventType) {
    case 'SLA_WARNING':
    case 'SLA_BREACHED': {
      // La fecha del evento es la del registro (el barrido corre cada 30 min);
      // la fecha límite solo se muestra porque el contrato la trae aparte.
      const dueAt = formatProblemDateTime(nonEmpty(metadata?.dueAt))
      if (dueAt.iso) details.push(`Fecha límite: ${dueAt.label}`)
      break
    }
    case 'UPDATED': {
      const fields = Array.isArray(metadata?.fields) ? metadata.fields : []
      const labels = fields
        .map((item) =>
          item && typeof item === 'object' && 'field' in item
            ? UPDATED_FIELD_LABEL[String(item.field)]
            : undefined,
        )
        .filter((label): label is string => Boolean(label))
      if (labels.length > 0) details.push(`Campos: ${labels.join(', ')}`)
      break
    }
    case 'ATTACHMENT_ADDED': {
      const type = nonEmpty(metadata?.type)
      const typeLabel = type ? EVIDENCE_TYPE_LABEL[type] : undefined
      if (typeLabel) details.push(`Tipo: ${typeLabel}`)
      break
    }
    default:
      break
  }

  // Un evento desconocido conserva su texto descriptivo: es lo único que lo
  // explica, y es texto del backend, no un código.
  if (!STRUCTURED_EVENT_TYPES.has(entry.eventType)) {
    const description = nonEmpty(entry.description)
    if (description && description !== nonEmpty(entry.title)) {
      details.push(description)
    }
  }

  return details
}

export function toProblemTimelineEntryView(
  entry: SituationTimelineEntry,
): ProblemTimelineEntryView {
  return {
    id: entry.id,
    label: TIMELINE_EVENT_LABEL[entry.eventType] ?? UNKNOWN_EVENT_LABEL,
    actor: resolveActor(entry),
    transition: resolveTransition(entry.metadata),
    details: resolveDetails(entry),
    date: formatProblemDateTime(entry.createdAt),
  }
}
