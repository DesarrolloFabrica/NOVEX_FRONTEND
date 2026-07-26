import { jsPDF } from 'jspdf'
import type {
  ActionPriority,
  CertaintyLevel,
  ExecutiveUrgency,
  IndicatorTrend,
  OperationalEvent,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
  eventRef,
  timelineTypeLabel,
} from '@/modules/operational-events/components/eventPresentation'

type RGB = [number, number, number]

const COLORS = {
  ink: [25, 38, 58] as RGB,
  muted: [100, 116, 139] as RGB,
  line: [221, 228, 238] as RGB,
  panel: [246, 248, 252] as RGB,
  navy: [7, 17, 37] as RGB,
  navySoft: [16, 34, 65] as RGB,
  white: [255, 255, 255] as RGB,
}

const RISK_COLOR: Record<RiskLevel, RGB> = {
  critical: [224, 63, 89],
  high: [224, 145, 38],
  moderate: [24, 139, 190],
  low: [27, 158, 102],
}

const PRIORITY_LABEL: Record<ActionPriority, string> = {
  immediate: 'INMEDIATA',
  high: 'ALTA',
  medium: 'MEDIA',
  scheduled: 'PROGRAMADA',
}

const URGENCY_LABEL: Record<ExecutiveUrgency, string> = {
  immediate: 'Inmediata',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const CERTAINTY_LABEL: Record<CertaintyLevel, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const TREND_LABEL: Record<IndicatorTrend, string> = {
  up: 'Debe subir',
  down: 'Debe bajar',
  stable: 'Debe mantenerse',
}

/** Helvetica de jsPDF solo soporta WinAnsi; normalizamos tipografía tipográfica. */
function pdfText(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2022|\u00B7/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00A0/g, ' ')
    .replace(/\u2248/g, 'aprox. ')
    .normalize('NFC')
}

function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return pdfText(iso)
  return pdfText(
    new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  )
}

function safeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function downloadPdfBlob(doc: jsPDF, filename: string): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // Revoca después de un tick para no cortar la descarga en algunos navegadores.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export async function exportSituationReportPdf(
  event: OperationalEvent,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 16
  const contentWidth = pageWidth - margin * 2
  const interpretation = event.interpretation
  const report = interpretation?.executiveReport ?? null
  const risk = report?.riskAssessment.riskLevel ?? interpretation?.riskLevel ?? 'moderate'
  const accent = RISK_COLOR[risk]
  const reference = eventRef(event.id)
  const reportTitle = report?.incidentSummary.executiveTitle ?? event.title
  let y = 0

  doc.setProperties({
    title: pdfText(`Reporte ejecutivo ${reference} - ${reportTitle}`),
    subject: 'Analisis ejecutivo de inteligencia operacional',
    author: 'Centro de Inteligencia Operacional OMEGA',
    creator: 'Plataforma OMEGA',
  })

  const setText = (color: RGB) => doc.setTextColor(...color)
  const setFill = (color: RGB) => doc.setFillColor(...color)
  const setDraw = (color: RGB) => doc.setDrawColor(...color)

  function continuationHeader(): void {
    setFill(COLORS.navy)
    doc.rect(0, 0, pageWidth, 18, 'F')
    setText(COLORS.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('OMEGA', margin, 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text(pdfText(`REPORTE EJECUTIVO  /  ${reference}`), margin, 13)
    setFill(accent)
    doc.rect(0, 18, pageWidth, 1.2, 'F')
    y = 27
  }

  function addPageIfNeeded(requiredHeight: number): void {
    if (y + requiredHeight <= pageHeight - 18) return
    doc.addPage()
    continuationHeader()
  }

  function sectionTitle(number: number | null, title: string): void {
    addPageIfNeeded(14)
    setFill(accent)
    if (number !== null) {
      doc.roundedRect(margin, y, 8, 6, 1.2, 1.2, 'F')
      setText(COLORS.white)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text(String(number).padStart(2, '0'), margin + 4, y + 4.2, {
        align: 'center',
      })
      setText(COLORS.ink)
      doc.setFontSize(9)
      doc.text(pdfText(title).toUpperCase(), margin + 11, y + 4.6)
    } else {
      doc.roundedRect(margin, y, 2.2, 6, 1, 1, 'F')
      setText(COLORS.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(pdfText(title).toUpperCase(), margin + 5, y + 4.6)
    }
    y += 10
  }

  function paragraph(text: string, options?: { muted?: boolean }): void {
    const lines = doc.splitTextToSize(
      pdfText(text || 'Sin informacion.'),
      contentWidth - 10,
    )
    const height = lines.length * 4.6 + 8
    addPageIfNeeded(height)
    setFill(COLORS.panel)
    setDraw(COLORS.line)
    doc.roundedRect(margin, y, contentWidth, height, 2.5, 2.5, 'FD')
    setText(options?.muted ? COLORS.muted : COLORS.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(lines, margin + 5, y + 6)
    y += height + 5
  }

  function bulletList(items: string[], options?: { muted?: boolean }): void {
    if (items.length === 0) {
      paragraph('Sin informacion declarada.', { muted: true })
      return
    }
    for (const item of items) {
      const lines = doc.splitTextToSize(pdfText(item), contentWidth - 12)
      const height = lines.length * 4.4 + 3
      addPageIfNeeded(height)
      setFill(accent)
      doc.circle(margin + 2.2, y + 1.6, 0.9, 'F')
      setText(options?.muted ? COLORS.muted : COLORS.ink)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.2)
      doc.text(lines, margin + 6, y + 2.8)
      y += height
    }
    y += 4
  }

  function subLabel(text: string): void {
    addPageIfNeeded(8)
    setText(COLORS.muted)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.text(pdfText(text).toUpperCase(), margin, y + 3)
    y += 6
  }

  function labelValue(label: string, value: string, x: number, top: number): void {
    setText(COLORS.muted)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(pdfText(label).toUpperCase(), x, top)
    setText(COLORS.ink)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(pdfText(value), 52)
    doc.text(lines, x, top + 4.2)
  }

  // Encabezado institucional.
  setFill(COLORS.navy)
  doc.rect(0, 0, pageWidth, 47, 'F')
  setFill(COLORS.navySoft)
  doc.circle(pageWidth - 12, 2, 34, 'F')
  setFill(accent)
  doc.rect(0, 47, pageWidth, 1.5, 'F')

  setDraw(accent)
  doc.setLineWidth(0.7)
  doc.circle(margin + 6, 14, 6, 'S')
  setText(COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('O', margin + 4.4, 16)
  doc.setFontSize(14)
  doc.text('OMEGA', margin + 16, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.text('CENTRO DE INTELIGENCIA OPERACIONAL', margin + 16, 17)

  setFill(accent)
  doc.roundedRect(pageWidth - 58, 9, 42, 9, 2, 2, 'F')
  setText(COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(
    pdfText(
      `${EVENT_STATUS_LABEL[event.status]} · ${RISK_LEVEL_LABEL[risk]}`,
    ).toUpperCase(),
    pageWidth - 37,
    14.7,
    { align: 'center' },
  )

  setText(COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  const titleLines = doc.splitTextToSize(pdfText(reportTitle), 135)
  doc.text(titleLines.slice(0, 2), margin, 29)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(188, 202, 222)
  doc.text(
    pdfText(`${reference}  -  Analisis ejecutivo de inteligencia operacional`),
    margin,
    42,
  )

  y = 56

  // Identificación del reporte.
  setFill(COLORS.white)
  setDraw(COLORS.line)
  doc.roundedRect(margin, y, contentWidth, 23, 3, 3, 'FD')
  labelValue('Reportado', formatDateTime(event.reportedAt), margin + 6, y + 7)
  labelValue('Area de origen', event.sourceAreaName, margin + 66, y + 7)
  labelValue('Responsable', event.reportedBy.name, margin + 126, y + 7)
  y += 30

  // Resumen de riesgo, severidad, certeza y urgencia.
  const gap = 4
  const cardWidth = (contentWidth - gap * 3) / 4
  const summaryCards = [
    [
      'Riesgo',
      `${report?.riskAssessment.riskScore ?? interpretation?.riskScore ?? '-'} / 100`,
    ],
    [
      'Severidad',
      report
        ? `${report.riskAssessment.severity} / 5`
        : interpretation
          ? `${interpretation.impactSeverity} / 5`
          : '-',
    ],
    [
      'Nivel de certeza',
      report
        ? `${report.riskAssessment.certainty.percentage}% (${CERTAINTY_LABEL[report.riskAssessment.certainty.level]})`
        : interpretation?.confidence !== undefined
          ? `${Math.round(interpretation.confidence * 100)}%`
          : '-',
    ],
    [
      'Urgencia',
      report ? URGENCY_LABEL[report.executiveConclusion.urgency] : '-',
    ],
  ]

  summaryCards.forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + gap)
    setFill(index === 0 ? accent : COLORS.panel)
    setDraw(index === 0 ? accent : COLORS.line)
    doc.roundedRect(x, y, cardWidth, 22, 2.5, 2.5, 'FD')
    setText(index === 0 ? COLORS.white : COLORS.muted)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.text(pdfText(label).toUpperCase(), x + 4, y + 6)
    setText(index === 0 ? COLORS.white : COLORS.ink)
    doc.setFontSize(11)
    doc.text(pdfText(value), x + 4, y + 15)
  })
  y += 30

  if (report) {
    // 1. ¿Qué ocurrió?
    sectionTitle(1, 'Que ocurrio')
    paragraph(report.incidentSummary.executiveSummary)
    subLabel('Causas detectadas (evidencia del relato)')
    bulletList(report.rootCause.detectedCauses)
    subLabel('Hipotesis de la IA')
    bulletList(report.rootCause.hypotheses, { muted: true })
    subLabel('Dependencias involucradas')
    bulletList(report.rootCause.dependencies)

    // 2. ¿Qué tan grave es?
    sectionTitle(2, 'Que tan grave es')
    paragraph(
      `Riesgo ${RISK_LEVEL_LABEL[report.riskAssessment.riskLevel]} (${report.riskAssessment.riskScore}/100) con severidad ${report.riskAssessment.severity}/5. ` +
        `Categoria: ${interpretation?.categoryName ?? 'Sin clasificar'}.`,
    )
    subLabel(
      `Nivel de certeza: ${CERTAINTY_LABEL[report.riskAssessment.certainty.level]} (${report.riskAssessment.certainty.percentage}%)`,
    )
    paragraph(report.riskAssessment.certainty.explanation, { muted: true })

    // 3. ¿Por qué es grave?
    sectionTitle(3, 'Por que es grave')
    bulletList(report.decisionFactors)

    // 4. ¿Quién está siendo afectado?
    sectionTitle(4, 'Quien esta siendo afectado')
    addPageIfNeeded(29)
    const impactCards = [
      ['INTERNO', `${report.impactAnalysis.internalImpactPercentage}%`],
      ['EXTERNO', `${report.impactAnalysis.externalImpactPercentage}%`],
      ['ESTUDIANTES', `${report.impactAnalysis.studentImpactPercentage}%`],
    ]
    const impactWidth = (contentWidth - gap * 2) / 3
    impactCards.forEach(([label, value], index) => {
      const x = margin + index * (impactWidth + gap)
      setFill(COLORS.panel)
      setDraw(
        index === 0
          ? [178, 221, 238]
          : index === 1
            ? [213, 198, 238]
            : [238, 216, 175],
      )
      doc.roundedRect(x, y, impactWidth, 22, 2.5, 2.5, 'FD')
      setText(COLORS.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.text(pdfText(value), x + 5, y + 9)
      setText(COLORS.muted)
      doc.setFontSize(6.5)
      doc.text(pdfText(label), x + 5, y + 16)
    })
    y += 29

    paragraph(
      [
        `Estudiantes afectados (estimado): ${
          report.impactAnalysis.estimatedAffectedStudents !== null
            ? `aprox. ${report.impactAnalysis.estimatedAffectedStudents.toLocaleString('es-CO')}`
            : 'no inferible con el contexto actual'
        }`,
        `Areas afectadas: ${report.impactAnalysis.estimatedAffectedAreas}`,
        `Procesos afectados: ${report.impactAnalysis.affectedProcesses.join('; ')}`,
      ].join('\n'),
    )

    subLabel('Areas afectadas y motivo')
    for (const area of report.affectedAreas) {
      const reasonLines = doc.splitTextToSize(
        pdfText(area.reason),
        contentWidth - 14,
      )
      const rowHeight = reasonLines.length * 4.2 + 10
      addPageIfNeeded(rowHeight)
      setFill(RISK_COLOR[area.affectationLevel])
      doc.circle(margin + 2.2, y + 2, 1.3, 'F')
      setText(COLORS.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.2)
      doc.text(
        pdfText(
          `${area.name}  -  Afectacion ${RISK_LEVEL_LABEL[area.affectationLevel].toLowerCase()}`,
        ),
        margin + 6,
        y + 3,
      )
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.6)
      setText(COLORS.muted)
      doc.text(reasonLines, margin + 6, y + 8)
      y += rowHeight
    }
    y += 4

    // 5. ¿Qué recomienda la IA?
    sectionTitle(5, 'Que recomienda la IA')
    for (const action of report.recommendedActions) {
      const actionLines = doc.splitTextToSize(
        pdfText(action.action),
        contentWidth - 14,
      )
      const reasonLines = doc.splitTextToSize(
        pdfText(`Motivo: ${action.reason}`),
        contentWidth - 14,
      )
      const rowHeight = actionLines.length * 4.4 + reasonLines.length * 4 + 15
      addPageIfNeeded(rowHeight)
      setFill(COLORS.panel)
      setDraw(COLORS.line)
      doc.roundedRect(margin, y, contentWidth, rowHeight - 3, 2.5, 2.5, 'FD')
      setFill(accent)
      doc.roundedRect(margin + 4, y + 3.5, 24, 5, 1.5, 1.5, 'F')
      setText(COLORS.white)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.text(PRIORITY_LABEL[action.priority], margin + 16, y + 7, {
        align: 'center',
      })
      setText(COLORS.muted)
      doc.setFontSize(6.5)
      doc.text(
        pdfText(`${action.suggestedArea}  ·  ${action.recommendedTime}`),
        margin + contentWidth - 5,
        y + 7,
        { align: 'right' },
      )
      setText(COLORS.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.4)
      doc.text(actionLines, margin + 5, y + 14)
      setText(COLORS.muted)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.4)
      doc.text(reasonLines, margin + 5, y + 14 + actionLines.length * 4.4)
      y += rowHeight
    }
    y += 3

    // 6. ¿Qué pasa si no actuamos?
    sectionTitle(6, 'Que pasa si no actuamos')
    bulletList(report.operationalConsequences)

    // 7. Indicadores afectados
    sectionTitle(7, 'Indicadores afectados')
    for (const indicator of report.operationalIndicators) {
      const explanationLines = doc.splitTextToSize(
        pdfText(indicator.explanation),
        contentWidth - 14,
      )
      const rowHeight = explanationLines.length * 4 + 12
      addPageIfNeeded(rowHeight)
      setDraw(COLORS.line)
      doc.line(margin, y + rowHeight - 3, margin + contentWidth, y + rowHeight - 3)
      setText(COLORS.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.2)
      doc.text(pdfText(indicator.name), margin + 2, y + 4)
      doc.text(
        pdfText(
          `${indicator.suggestedValue.toLocaleString('es-CO')} ${indicator.unit}  ·  ${TREND_LABEL[indicator.trend]}`,
        ),
        margin + contentWidth - 2,
        y + 4,
        { align: 'right' },
      )
      setText(COLORS.muted)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.4)
      doc.text(explanationLines, margin + 2, y + 9)
      y += rowHeight
    }
    y += 3

    // 8. Áreas responsables
    sectionTitle(8, 'Areas responsables')
    const responsibles = new Map<string, string>()
    for (const action of report.recommendedActions) {
      if (!responsibles.has(action.suggestedArea)) {
        responsibles.set(action.suggestedArea, action.action)
      }
    }
    bulletList(
      [...responsibles.entries()].map(
        ([area, mandate]) => `${area}: ${mandate}`,
      ),
    )

    // 9. Cronología sugerida
    sectionTitle(9, 'Cronologia sugerida')
    for (const milestone of report.timelineSuggestions) {
      const checkpointLines = doc.splitTextToSize(
        pdfText(milestone.checkpoint),
        contentWidth - 44,
      )
      const rowHeight = Math.max(11, checkpointLines.length * 4 + 6)
      addPageIfNeeded(rowHeight)
      setFill(accent)
      doc.circle(margin + 2.5, y + 3, 1.6, 'F')
      setDraw(COLORS.line)
      doc.line(margin + 2.5, y + 5, margin + 2.5, y + rowHeight - 1)
      setText(COLORS.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(pdfText(milestone.horizon), margin + 7, y + 4)
      setText(COLORS.muted)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.4)
      doc.text(checkpointLines, margin + 40, y + 4)
      y += rowHeight
    }
    y += 4

    // 10. Conclusión ejecutiva
    sectionTitle(10, 'Conclusion ejecutiva')
    paragraph(
      [
        `Gravedad: ${report.executiveConclusion.gravity}`,
        `Urgencia: ${URGENCY_LABEL[report.executiveConclusion.urgency]}`,
        `Recomendacion general: ${report.executiveConclusion.recommendation}`,
      ].join('\n'),
    )
    if (report.dataGaps.length > 0) {
      subLabel('Vacios de informacion declarados por la IA')
      bulletList(report.dataGaps, { muted: true })
    }
  } else {
    // Compatibilidad: interpretaciones sin reporte ejecutivo (contrato previo).
    sectionTitle(null, 'Resumen ejecutivo')
    paragraph(interpretation?.executiveSummary ?? event.description)
    if (interpretation) {
      sectionTitle(null, 'Narrativa y lectura tecnica')
      paragraph(interpretation.narrative)
    }
  }

  sectionTitle(null, 'Descripcion reportada')
  paragraph(event.description)

  sectionTitle(null, 'Registro del evento')
  const timeline = [...event.timeline.entries].sort((a, b) =>
    a.at.localeCompare(b.at),
  )
  if (timeline.length === 0) {
    paragraph('No existen movimientos registrados.', { muted: true })
  } else {
    for (const entry of timeline) {
      const descriptionLines = doc.splitTextToSize(
        pdfText(entry.description),
        contentWidth - 44,
      )
      const rowHeight = Math.max(14, descriptionLines.length * 4 + 8)
      addPageIfNeeded(rowHeight)
      setFill(accent)
      doc.circle(margin + 2.5, y + 5, 1.6, 'F')
      setDraw(COLORS.line)
      doc.line(margin + 2.5, y + 7, margin + 2.5, y + rowHeight)
      setText(COLORS.muted)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.text(formatDateTime(entry.at), margin + 7, y + 4)
      setText(COLORS.ink)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(
        pdfText(timelineTypeLabel(entry.type)).toUpperCase(),
        margin + 43,
        y + 4,
      )
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.text(descriptionLines, margin + 43, y + 9)
      y += rowHeight
    }
  }

  sectionTitle(null, 'Informacion complementaria')
  const complementary = [
    `Observaciones: ${event.observations?.trim() || 'Ninguna'}`,
    `Adjuntos: ${
      event.attachmentNames?.length
        ? event.attachmentNames.join(', ')
        : 'Ninguno'
    }`,
    `Modelo de analisis: ${interpretation?.modelLabel ?? '-'}`,
    `Ultima actualizacion: ${formatDateTime(event.lastUpdateAt ?? event.createdAt)}`,
  ]
  paragraph(complementary.join('\n'), { muted: true })

  // Pie institucional y numeración en todas las páginas.
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    setDraw(COLORS.line)
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12)
    setText(COLORS.muted)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(
      'Documento generado por OMEGA - Centro de Inteligencia Operacional',
      margin,
      pageHeight - 7,
    )
    doc.text(`Pagina ${page} de ${pages}`, pageWidth - margin, pageHeight - 7, {
      align: 'right',
    })
  }

  downloadPdfBlob(
    doc,
    `${safeFileName(reference)}-reporte-ejecutivo.pdf`,
  )
}
