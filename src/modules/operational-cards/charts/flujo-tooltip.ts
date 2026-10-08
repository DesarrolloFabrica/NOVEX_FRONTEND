import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * Tooltips (HTML para ECharts) de ESTADO:
 * - CARGA: total de activos con la composición Internos (categorías) /
 *   Externos (coordinaciones afectadas), top 3 + «+ N más».
 * - MOVIMIENTO: reportados y solucionados del bucket.
 */

export const TOOLTIP_TOP = 3

export type TopRows = {
  rows: Array<{ label: string; count: number }>
  /** Filas no mostradas («+N más»). */
  hidden: number
}

/** Top N por cantidad (el orden ya viene count DESC, nombre ASC). */
export function topRows(
  list: ReadonlyArray<{ label: string; count: number }>,
  limit = TOOLTIP_TOP,
): TopRows {
  return { rows: list.slice(0, limit), hidden: Math.max(0, list.length - limit) }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const row = (label: string, value: number, strong = false, indent = false) =>
  `<div style="display:flex;justify-content:space-between;gap:18px${
    indent ? ';padding-left:10px;opacity:.85' : ''
  }"><span>${escapeHtml(label)}</span>${strong ? `<b>${value}</b>` : `<span>${value}</span>`}</div>`

const title = (text: string) =>
  `<div style="font-weight:800;margin-bottom:4px">${escapeHtml(text)}</div>`

const rule = '<div style="margin:4px 0;border-top:1px dashed rgb(35 25 16 / .3)"></div>'

/** Bloque de composición: cabecera con su total + top N indentado. */
function block(heading: string, total: number, top: TopRows, emptyText: string) {
  const lines = top.rows.map((item) => row(item.label, item.count, false, true))
  if (top.hidden > 0) {
    lines.push(`<div style="padding-left:10px;opacity:.6">+ ${top.hidden} más</div>`)
  }
  return [
    `<div style="display:flex;justify-content:space-between;gap:18px;margin-top:4px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase"><span>${escapeHtml(heading)}</span><b style="font-size:12px">${total}</b></div>`,
    lines.length > 0
      ? lines.join('')
      : `<div style="padding-left:10px;opacity:.6">${escapeHtml(emptyText)}</div>`,
  ].join('')
}

/**
 * MOVIMIENTO DE PROBLEMAS (eventos): reportados (created_at en el bucket) y
 * solucionados (closed_at en el bucket). Sin desglose en esta fase.
 */
export function movimientoTooltipHtml(
  bucket: OperationalKpiFlowBucket,
  bucketTitle: string,
): string {
  if (bucket.future || !bucket.solved) {
    return `${title(bucketTitle)}<span style="opacity:.65">Futuro · sin datos todavía</span>`
  }
  return [
    title(`${bucketTitle}${bucket.current ? ' · actual' : ''}`),
    row('Reportados', bucket.created ?? 0, true),
    row('Solucionados', bucket.solved.total, true),
  ].join('')
}

/**
 * CARGA (línea del total): una sola interacción explica la composición.
 * Total de activos + bloque INTERNOS (categorías) + bloque EXTERNOS
 * (coordinaciones afectadas), cada uno con top 3 y «+ N más».
 */
export function flujoTooltipHtml(bucket: OperationalKpiFlowBucket, bucketTitle: string): string {
  if (bucket.future || !bucket.active) {
    return `${title(bucketTitle)}<span style="opacity:.65">Futuro · sin datos todavía</span>`
  }
  const active = bucket.active
  const internal = topRows(
    active.internalBreakdown.map((item) => ({ label: item.categoryName, count: item.count })),
  )
  const external = topRows(
    active.externalBreakdown.map((item) => ({ label: item.coordinationName, count: item.count })),
  )
  return [
    title(`${bucketTitle}${bucket.current ? ' · actual' : ''}`),
    row(bucket.current ? 'Activos ahora' : 'Activos al cierre', active.total, true),
    rule,
    block('Internos', active.internal, internal, 'Sin internos activos'),
    block('Externos · coordinaciones afectadas', active.external, external, 'Sin externos activos'),
  ].join('')
}
