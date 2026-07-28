import { jsPDF } from 'jspdf'
import type {
  ActionPriority,
  CertaintyLevel,
  ExecutiveUrgency,
  IndicatorTrend,
  OperationalEvent,
  RecommendedAction,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'
import {
  EVENT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
  eventRef,
  timelineTypeLabel,
} from '@/modules/operational-events/components/eventPresentation'

type RGB = [number, number, number]

/** px @ 96dpi → mm (jsPDF unit) */
const PX = 0.264583
/** px @ 96dpi → pt (jsPDF font size) */
const PT = 0.75

const LAYOUT = {
  marginTop: 32 * PX,
  marginBottom: 32 * PX,
  marginLeft: 40 * PX,
  marginRight: 40 * PX,
  headerHeight: 120 * PX,
  continuationHeaderHeight: 14 * PX,
  footerHeight: 22 * PX,
  gapTitleContent: 16 * PX,
  gapBlocks: 24 * PX,
  gapSections: 24 * PX,
  cardRadius: 2.5,
  cardPadding: 12 * PX,
  cardGap: 10 * PX,
  cardShadowOffset: 0.4,
} as const

const FONT = {
  titleMain: 28 * PT,
  section: 16 * PT,
  subtitle: 13 * PT,
  body: 11 * PT,
  note: 9 * PT,
} as const

const COLORS = {
  ink: [25, 38, 58] as RGB,
  muted: [100, 116, 139] as RGB,
  subtle: [92, 109, 134] as RGB,
  line: [214, 222, 234] as RGB,
  panel: [246, 248, 252] as RGB,
  white: [255, 255, 255] as RGB,
  navy: [3, 7, 16] as RGB,
  navyMid: [7, 14, 28] as RGB,
  green: [47, 158, 58] as RGB,
  greenMid: [63, 194, 74] as RGB,
  greenBright: [163, 255, 92] as RGB,
  blue: [77, 125, 255] as RGB,
  cyan: [56, 217, 255] as RGB,
  danger: [255, 70, 91] as RGB,
  shadow: [228, 234, 242] as RGB,
}

const RISK_COLOR: Record<RiskLevel, RGB> = {
  critical: COLORS.danger,
  high: COLORS.blue,
  moderate: COLORS.cyan,
  low: COLORS.green,
}

const PRIORITY_LABEL: Record<ActionPriority, string> = {
  immediate: 'INMEDIATA',
  high: 'ALTA',
  medium: 'MEDIA',
  scheduled: 'PROGRAMADA',
}

const EFFORT_LABEL: Record<ActionPriority, string> = {
  immediate: 'Alto',
  high: 'Medio-alto',
  medium: 'Medio',
  scheduled: 'Bajo',
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

const PRIORITY_LEVEL_LABEL: Record<string, string> = {
  CRITICA: 'CRITICA',
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAJA: 'BAJA',
}

const LOGO_PATH = 'cunmark-mark.png'

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

function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return pdfText(iso)
  return pdfText(
    new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date),
  )
}

function formatReportDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}-${month}-${year}-${hours}${minutes}`
}

function buildReportFileName(_title: string, reportedAt: string): string {
  const stamp = formatReportDate(reportedAt)
  return stamp ? `reporte-ejecutivo-${stamp}.pdf` : 'reporte-ejecutivo.pdf'
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1500)
}

async function loadLogoAsset(): Promise<{
  dataUrl: string
  width: number
  height: number
} | null> {
  try {
    const base = import.meta.env.BASE_URL ?? '/'
    const url = `${base}${LOGO_PATH}`
    const response = await fetch(url)
    if (!response.ok) return null
    const blob = await response.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
    const bitmap = await createImageBitmap(blob)
    return { dataUrl, width: bitmap.width, height: bitmap.height }
  } catch {
    return null
  }
}

function lineHeightMm(fontSizePt: number, factor = 1.42): number {
  return fontSizePt * 0.352778 * factor
}

class PdfReportLayout {
  private readonly doc: jsPDF
  private readonly pageWidth: number
  private readonly pageHeight: number
  readonly contentWidth: number
  private y = 0
  private sectionStarted = false
  private readonly logo: { dataUrl: string; width: number; height: number } | null

  constructor(
    doc: jsPDF,
    logo: { dataUrl: string; width: number; height: number } | null,
  ) {
    this.doc = doc
    this.pageWidth = doc.internal.pageSize.getWidth()
    this.pageHeight = doc.internal.pageSize.getHeight()
    this.contentWidth =
      this.pageWidth - LAYOUT.marginLeft - LAYOUT.marginRight
    this.logo = logo
  }

  get cursorY(): number {
    return this.y
  }

  set cursorY(value: number) {
    this.y = value
  }

  private contentBottom(): number {
    return this.pageHeight - LAYOUT.marginBottom - LAYOUT.footerHeight
  }

  private setColor(
    kind: 'text' | 'fill' | 'draw',
    color: RGB,
  ): void {
    if (kind === 'text') this.doc.setTextColor(...color)
    else if (kind === 'fill') this.doc.setFillColor(...color)
    else this.doc.setDrawColor(...color)
  }

  private setFont(style: 'normal' | 'bold' | 'italic', sizePt: number): void {
    this.doc.setFont('helvetica', style)
    this.doc.setFontSize(sizePt)
  }

  /** Renderiza lineas envueltas sin el bug de espaciado de jsPDF con arrays. */
  private drawLines(
    lines: string[],
    x: number,
    y: number,
    fontSizePt: number,
  ): number {
    const lh = lineHeightMm(fontSizePt)
    let cy = y
    for (const line of lines) {
      if (line) this.doc.text(line, x, cy)
      cy += lh
    }
    return cy - y
  }

  splitText(text: string, maxWidth: number): string[] {
    return this.doc.splitTextToSize(pdfText(text), maxWidth) as string[]
  }

  textBlockHeight(
    text: string,
    maxWidth: number,
    fontSizePt: number,
  ): number {
    const lines = this.splitText(text, maxWidth)
    return lines.length * lineHeightMm(fontSizePt)
  }

  ensureSpace(requiredHeight: number): void {
    if (this.y + requiredHeight <= this.contentBottom()) return
    this.newPage()
  }

  /** Evita títulos huérfanos: mueve bloque completo si no cabe. */
  ensureSectionFits(sectionHeight: number): void {
    if (this.y + sectionHeight > this.contentBottom()) {
      this.newPage()
    }
  }

  advance(mm: number): void {
    this.y += mm
  }

  newPage(): void {
    this.doc.addPage()
    this.drawContinuationHeader()
    this.y = LAYOUT.marginTop + LAYOUT.continuationHeaderHeight + 2 * PX
  }

  private drawInstitutionalLine(y: number): void {
    this.setColor('fill', COLORS.green)
    this.doc.rect(0, y, this.pageWidth, 1.2, 'F')
  }

  drawCoverHeader(meta: {
    title: string
    status: string
    priority: string
    date: string
    reference: string
  }): void {
    const metaColW = 54
    const titleMaxW = this.contentWidth - metaColW - 2
    const titleFont = FONT.section
    const titleLines = this.splitText(meta.title, titleMaxW).slice(0, 3)
    const titleBlockH = titleLines.length * lineHeightMm(titleFont)
    const headerH = Math.max(LAYOUT.headerHeight, 22 + titleBlockH + 6)

    this.setColor('fill', COLORS.navy)
    this.doc.rect(0, 0, this.pageWidth, headerH, 'F')

    const logoBox = 9
    const logoX = LAYOUT.marginLeft
    const topY = 7
    if (this.logo) {
      const aspect = this.logo.width / this.logo.height
      const logoH = logoBox
      const logoW = logoH * aspect
      this.doc.addImage(
        this.logo.dataUrl,
        'PNG',
        logoX,
        topY,
        logoW,
        logoH,
        undefined,
        'FAST',
      )
    }

    const brandX = logoX + (this.logo ? logoBox + 3 : 0)
    this.setColor('text', COLORS.white)
    this.setFont('bold', 12)
    this.doc.text('CUNMARK', brandX, topY + 3.8)
    this.setFont('normal', FONT.note)
    this.setColor('text', [163, 180, 204])
    this.doc.text('Sistema de Inteligencia Operacional', brandX, topY + 7.5)

    const metaRight = this.pageWidth - LAYOUT.marginRight
    const metaLeft = metaRight - metaColW
    const metaRows: Array<[string, string]> = [
      ['Estado', meta.status],
      ['Prioridad', meta.priority],
      ['Fecha', meta.date],
      ['Codigo', meta.reference],
    ]
    metaRows.forEach(([label, value], index) => {
      const rowY = topY + 1.5 + index * 4.2
      this.setFont('bold', FONT.note - 0.5)
      this.setColor('text', [130, 150, 176])
      this.doc.text(pdfText(`${label}:`), metaLeft, rowY)
      this.setFont('normal', FONT.note)
      this.setColor('text', COLORS.white)
      const valueLines = this.splitText(value, metaColW - 16)
      this.doc.text(valueLines[0] ?? '', metaRight, rowY, { align: 'right' })
    })

    const titleY = topY + logoBox + 5
    this.setColor('text', COLORS.white)
    this.setFont('bold', titleFont)
    this.drawLines(titleLines, LAYOUT.marginLeft, titleY, titleFont)

    this.drawInstitutionalLine(headerH)
    this.y = headerH + LAYOUT.marginTop
  }

  private drawContinuationHeader(): void {
    const h = LAYOUT.continuationHeaderHeight
    this.setColor('fill', COLORS.navyMid)
    this.doc.rect(0, 0, this.pageWidth, h, 'F')
    this.setColor('text', COLORS.white)
    this.setFont('bold', FONT.subtitle)
    this.doc.text('CUNMARK', LAYOUT.marginLeft, h - 4.5)
    this.setFont('normal', FONT.note)
    this.setColor('text', [163, 180, 204])
    this.doc.text(
      'Sistema de Inteligencia Operacional',
      LAYOUT.marginLeft + 22,
      h - 4.5,
    )
    this.drawInstitutionalLine(h)
  }

  drawFooters(): void {
    const pages = this.doc.getNumberOfPages()
    for (let page = 1; page <= pages; page += 1) {
      this.doc.setPage(page)
      const footerTop = this.pageHeight - LAYOUT.footerHeight
      this.setColor('draw', COLORS.line)
      this.doc.setLineWidth(0.2)
      this.doc.line(
        LAYOUT.marginLeft,
        footerTop,
        this.pageWidth - LAYOUT.marginRight,
        footerTop,
      )

      const textY = footerTop + 5
      this.setColor('text', COLORS.ink)
      this.setFont('bold', FONT.note)
      this.doc.text('CUNMARK', LAYOUT.marginLeft, textY)
      this.setFont('normal', FONT.note)
      this.setColor('text', COLORS.muted)
      this.doc.text(
        'Sistema de Inteligencia Operacional',
        LAYOUT.marginLeft,
        textY + 3.2,
      )

      this.setColor('text', COLORS.muted)
      this.setFont('normal', FONT.note)
      const centerX = this.pageWidth / 2
      this.doc.text(
        'Analisis generado automaticamente mediante IA.',
        centerX,
        textY,
        { align: 'center' },
      )
      this.doc.text(
        'Documento de apoyo para la toma de decisiones.',
        centerX,
        textY + 3.2,
        { align: 'center' },
      )

      this.setFont('normal', FONT.note)
      this.doc.text(
        `Pagina ${page} de ${pages}`,
        this.pageWidth - LAYOUT.marginRight,
        textY + 1.6,
        { align: 'right' },
      )
    }
  }

  private drawCardShell(
    x: number,
    top: number,
    width: number,
    height: number,
    options?: { fill?: RGB; border?: RGB },
  ): void {
    const fill = options?.fill ?? COLORS.white
    const border = options?.border ?? COLORS.line
    this.setColor('fill', COLORS.shadow)
    this.doc.roundedRect(
      x + LAYOUT.cardShadowOffset,
      top + LAYOUT.cardShadowOffset,
      width,
      height,
      LAYOUT.cardRadius,
      LAYOUT.cardRadius,
      'F',
    )
    this.setColor('fill', fill)
    this.setColor('draw', border)
    this.doc.setLineWidth(0.25)
    this.doc.roundedRect(
      x,
      top,
      width,
      height,
      LAYOUT.cardRadius,
      LAYOUT.cardRadius,
      'FD',
    )
  }

  private renderSectionTitle(number: number | null, title: string): number {
    const titleH = 8
    this.setColor('text', COLORS.ink)
    this.setFont('bold', FONT.section)
    if (number !== null) {
      const badgeW = 7
      this.setColor('fill', COLORS.green)
      this.doc.roundedRect(
        LAYOUT.marginLeft,
        this.y,
        badgeW,
        5.5,
        1,
        1,
        'F',
      )
      this.setColor('text', COLORS.white)
      this.setFont('bold', FONT.note)
      this.doc.text(
        String(number).padStart(2, '0'),
        LAYOUT.marginLeft + badgeW / 2,
        this.y + 3.8,
        { align: 'center' },
      )
      this.setColor('text', COLORS.ink)
      this.setFont('bold', FONT.section)
      this.doc.text(
        pdfText(title).toUpperCase(),
        LAYOUT.marginLeft + badgeW + 3,
        this.y + 4.2,
      )
    } else {
      this.doc.text(pdfText(title).toUpperCase(), LAYOUT.marginLeft, this.y + 4.2)
    }
    return titleH + LAYOUT.gapTitleContent
  }

  section(
    number: number | null,
    title: string,
    followingHeight = 0,
  ): void {
    const titleBlockH = 8 + LAYOUT.gapTitleContent
    const gap = this.sectionStarted ? LAYOUT.gapSections : 0
    this.ensureSectionFits(gap + titleBlockH + followingHeight)
    this.y += gap
    this.y += this.renderSectionTitle(number, title)
    this.sectionStarted = true
  }

  measureParagraph(text: string): number {
    const innerW = this.contentWidth - LAYOUT.cardPadding * 2
    const lines = this.splitText(text || 'Sin informacion.', innerW)
    return (
      LAYOUT.cardPadding * 2 +
      lines.length * lineHeightMm(FONT.body) +
      LAYOUT.gapBlocks / 2
    )
  }

  measureBulletList(items: string[]): number {
    if (items.length === 0) return this.measureParagraph('Sin informacion declarada.')
    const innerW = this.contentWidth - LAYOUT.cardPadding - 4
    let h = 0
    for (const item of items) {
      const lines = this.splitText(item, innerW)
      h += lines.length * lineHeightMm(FONT.body) + 2
    }
    return h + LAYOUT.gapBlocks / 3
  }

  measureDecisionMatrixHeight(
    sections: Array<[string, RecommendedAction[]]>,
    firstRowOnly = true,
  ): number {
    const gap = LAYOUT.cardGap / 2
    const colW = (this.contentWidth - gap) / 2
    const activeSections = sections.filter(([, actions]) => actions.length > 0)
    if (activeSections.length === 0) return 0

    const rows: Array<typeof activeSections> = []
    for (let i = 0; i < activeSections.length; i += 2) {
      rows.push(activeSections.slice(i, i + 2))
    }

    const measureRow = (row: typeof activeSections): number =>
      Math.max(
        ...row.map(([, actions]) => {
          const innerW = colW - LAYOUT.cardPadding * 2
          const actionsH = actions.reduce(
            (sum, action) => sum + this.measureDecisionAction(action, innerW) + 4,
            0,
          )
          return (
            LAYOUT.cardPadding * 2 +
            lineHeightMm(FONT.subtitle) +
            actionsH +
            2
          )
        }),
      )

    if (firstRowOnly) return measureRow(rows[0]!) + LAYOUT.gapBlocks

    let total = 0
    for (const row of rows) {
      total += measureRow(row) + LAYOUT.gapBlocks
    }
    return total
  }

  measureIndicatorRows(
    indicators: Array<{
      name: string
      explanation: string
      unit: string
      suggestedValue: number
      trend: IndicatorTrend
    }>,
  ): number {
    if (indicators.length === 0) {
      return this.measureParagraph('No hay indicadores afectados identificados.')
    }
    const innerW = this.contentWidth - LAYOUT.cardPadding * 2
    const first = indicators[0]!
    const explanationLines = this.splitText(first.explanation, innerW)
    return (
      LAYOUT.cardPadding * 2 +
      lineHeightMm(FONT.subtitle) +
      explanationLines.length * lineHeightMm(FONT.body) +
      2 +
      LAYOUT.cardGap / 2
    )
  }

  subLabel(text: string): void {
    this.ensureSpace(8)
    this.setColor('text', COLORS.muted)
    this.setFont('bold', FONT.subtitle)
    this.doc.text(pdfText(text).toUpperCase(), LAYOUT.marginLeft, this.y + 3)
    this.y += 6 + LAYOUT.gapTitleContent / 2
  }

  paragraph(text: string, options?: { muted?: boolean; fill?: RGB }): void {
    const innerW = this.contentWidth - LAYOUT.cardPadding * 2
    const lines = this.splitText(text || 'Sin informacion.', innerW)
    const bodyH = lines.length * lineHeightMm(FONT.body)
    const cardH = LAYOUT.cardPadding * 2 + bodyH
    this.ensureSpace(cardH + LAYOUT.gapBlocks / 2)
    this.drawCardShell(
      LAYOUT.marginLeft,
      this.y,
      this.contentWidth,
      cardH,
      { fill: options?.fill ?? COLORS.panel },
    )
    this.setColor('text', options?.muted ? COLORS.muted : COLORS.ink)
    this.setFont('normal', FONT.body)
    this.drawLines(
      lines,
      LAYOUT.marginLeft + LAYOUT.cardPadding,
      this.y + LAYOUT.cardPadding + 3,
      FONT.body,
    )
    this.y += cardH + LAYOUT.gapBlocks / 2
  }

  bulletList(items: string[], options?: { muted?: boolean }): void {
    if (items.length === 0) {
      this.paragraph('Sin informacion declarada.', { muted: true })
      return
    }
    const innerW = this.contentWidth - LAYOUT.cardPadding - 4
    for (const item of items) {
      const lines = this.splitText(item, innerW)
      const rowH = lines.length * lineHeightMm(FONT.body) + 2
      this.ensureSpace(rowH)
      this.setColor('fill', COLORS.green)
      this.doc.circle(LAYOUT.marginLeft + 1.5, this.y + 2, 0.8, 'F')
      this.setColor('text', options?.muted ? COLORS.muted : COLORS.ink)
      this.setFont('normal', FONT.body)
      this.drawLines(
        lines,
        LAYOUT.marginLeft + LAYOUT.cardPadding,
        this.y + 2.8,
        FONT.body,
      )
      this.y += rowH
    }
    this.y += LAYOUT.gapBlocks / 3
  }

  drawProgressIndicator(
    label: string,
    percentage: number,
    options?: { accent?: RGB; showBar?: boolean },
  ): number {
    const accent = options?.accent ?? COLORS.green
    const barW = this.contentWidth - LAYOUT.cardPadding * 2
    const pct = Math.min(100, Math.max(0, percentage))
    const labelH = lineHeightMm(FONT.subtitle)
    const valueH = lineHeightMm(FONT.section)
    const barH = options?.showBar === false ? 0 : 3
    const cardH =
      LAYOUT.cardPadding * 2 + labelH + valueH + (barH ? barH + 2 : 0)

    this.ensureSpace(cardH + LAYOUT.cardGap / 2)
    this.drawCardShell(LAYOUT.marginLeft, this.y, this.contentWidth, cardH)
    const x = LAYOUT.marginLeft + LAYOUT.cardPadding
    let innerY = this.y + LAYOUT.cardPadding + 2

    this.setColor('text', COLORS.muted)
    this.setFont('bold', FONT.subtitle)
    this.doc.text(pdfText(label).toUpperCase(), x, innerY)
    innerY += labelH + 1

    this.setColor('text', COLORS.ink)
    this.setFont('bold', FONT.section)
    this.doc.text(`${Math.round(pct)}%`, x, innerY)
    innerY += valueH

    if (barH > 0) {
      this.setColor('fill', COLORS.line)
      this.doc.roundedRect(x, innerY, barW, barH, 0.8, 0.8, 'F')
      if (pct > 0) {
        this.setColor('fill', accent)
        this.doc.roundedRect(
          x,
          innerY,
          (barW * pct) / 100,
          barH,
          0.8,
          0.8,
          'F',
        )
      }
    }

    this.y += cardH + LAYOUT.cardGap / 2
    return cardH
  }

  drawSummaryIndicators(
    cards: Array<{ label: string; value: string; percentage?: number }>,
  ): void {
    const gap = LAYOUT.cardGap / 2
    const cardW = (this.contentWidth - gap * (cards.length - 1)) / cards.length
    let maxH = 0

    const measurements = cards.map((card) => {
      const innerW = cardW - LAYOUT.cardPadding * 2
      const labelH = lineHeightMm(FONT.note)
      const valueH = lineHeightMm(FONT.section)
      const barH = card.percentage !== undefined ? 3.5 : 0
      const h = LAYOUT.cardPadding * 2 + labelH + valueH + (barH ? barH + 2 : 0)
      maxH = Math.max(maxH, h)
      return { card, innerW, barH, h }
    })

    this.ensureSpace(maxH + LAYOUT.gapBlocks)
    const top = this.y

    measurements.forEach(({ card, innerW, barH }, index) => {
      const x = LAYOUT.marginLeft + index * (cardW + gap)
      this.drawCardShell(x, top, cardW, maxH, {
        fill: index === 0 ? COLORS.navyMid : COLORS.panel,
        border: index === 0 ? COLORS.green : COLORS.line,
      })
      const textX = x + LAYOUT.cardPadding
      let innerY = top + LAYOUT.cardPadding + 2
      this.setColor('text', index === 0 ? [180, 196, 216] : COLORS.muted)
      this.setFont('bold', FONT.note)
      this.doc.text(pdfText(card.label).toUpperCase(), textX, innerY)
      innerY += lineHeightMm(FONT.note) + 1
      this.setColor('text', index === 0 ? COLORS.white : COLORS.ink)
      this.setFont('bold', FONT.section)
      const valueLines = this.splitText(card.value, innerW)
      this.drawLines(valueLines, textX, innerY, FONT.section)
      innerY += valueLines.length * lineHeightMm(FONT.section)
      if (barH > 0 && card.percentage !== undefined) {
        const pct = Math.min(100, Math.max(0, card.percentage))
        this.setColor('fill', index === 0 ? [40, 70, 110] : COLORS.line)
        this.doc.roundedRect(textX, innerY, innerW, barH, 0.8, 0.8, 'F')
        this.setColor('fill', index === 0 ? COLORS.greenBright : COLORS.green)
        if (pct > 0) {
          this.doc.roundedRect(
            textX,
            innerY,
            (innerW * pct) / 100,
            barH,
            0.8,
            0.8,
            'F',
          )
        }
      }
    })

    this.y = top + maxH + LAYOUT.gapBlocks
  }

  drawMetadataStrip(rows: Array<[string, string]>): void {
    const cols = rows.length
    const gap = LAYOUT.cardGap / 2
    const colW = (this.contentWidth - gap * (cols - 1)) / cols
    let maxH = 0
    const measured = rows.map(([label, value]) => {
      const innerW = colW - LAYOUT.cardPadding * 2
      const h =
        LAYOUT.cardPadding * 2 +
        lineHeightMm(FONT.note) +
        this.textBlockHeight(value, innerW, FONT.body)
      maxH = Math.max(maxH, h)
      return { label, value, innerW }
    })

    this.ensureSpace(maxH + LAYOUT.gapBlocks)
    const top = this.y
    measured.forEach(({ label, value, innerW }, index) => {
      const x = LAYOUT.marginLeft + index * (colW + gap)
      this.drawCardShell(x, top, colW, maxH)
      const textX = x + LAYOUT.cardPadding
      this.setColor('text', COLORS.muted)
      this.setFont('bold', FONT.note)
      this.doc.text(pdfText(label).toUpperCase(), textX, top + LAYOUT.cardPadding + 2)
      this.setColor('text', COLORS.ink)
      this.setFont('normal', FONT.body)
      const lines = this.splitText(value, innerW)
      this.drawLines(
        lines,
        textX,
        top + LAYOUT.cardPadding + lineHeightMm(FONT.note) + 3,
        FONT.body,
      )
    })
    this.y = top + maxH + LAYOUT.gapBlocks
  }

  private measureDecisionAction(
    action: RecommendedAction,
    innerW: number,
  ): number {
    const fields: Array<[string, string]> = [
      ['Prioridad', PRIORITY_LABEL[action.priority]],
      ['Tiempo', action.recommendedTime],
      ['Impacto esperado', action.reason],
      ['Esfuerzo', EFFORT_LABEL[action.priority]],
      ['Accion', action.action],
    ]
    let h = 4
    for (const [, value] of fields) {
      h += lineHeightMm(FONT.note) + 0.8
      h += this.textBlockHeight(value, innerW, FONT.body)
      h += 2
    }
    return h
  }

  private renderDecisionAction(
    action: RecommendedAction,
    x: number,
    innerY: number,
    innerW: number,
  ): number {
    const fields: Array<[string, string]> = [
      ['Prioridad', PRIORITY_LABEL[action.priority]],
      ['Tiempo', action.recommendedTime],
      ['Impacto esperado', action.reason],
      ['Esfuerzo', EFFORT_LABEL[action.priority]],
      ['Accion', action.action],
    ]
    let cursor = innerY
    for (const [label, value] of fields) {
      this.setColor('text', COLORS.muted)
      this.setFont('bold', FONT.note)
      this.doc.text(pdfText(label).toUpperCase(), x, cursor)
      cursor += lineHeightMm(FONT.note) + 0.8
      this.setColor('text', COLORS.ink)
      this.setFont(label === 'Accion' ? 'bold' : 'normal', FONT.body)
      const lines = this.splitText(value, innerW)
      this.drawLines(lines, x, cursor, FONT.body)
      cursor += lines.length * lineHeightMm(FONT.body) + 2
    }
    return cursor - innerY
  }

  drawDecisionMatrix(
    sections: Array<[string, RecommendedAction[]]>,
  ): void {
    const gap = LAYOUT.cardGap / 2
    const colW = (this.contentWidth - gap) / 2
    const activeSections = sections.filter(([, actions]) => actions.length > 0)
    if (activeSections.length === 0) return

    const rows: Array<typeof activeSections> = []
    for (let i = 0; i < activeSections.length; i += 2) {
      rows.push(activeSections.slice(i, i + 2))
    }

    for (const row of rows) {
      const cellLayouts = row.map(([label, actions]) => {
        const innerW = colW - LAYOUT.cardPadding * 2
        const actionsH = actions.reduce(
          (sum, action) => sum + this.measureDecisionAction(action, innerW) + 4,
          0,
        )
        const totalH =
          LAYOUT.cardPadding * 2 +
          lineHeightMm(FONT.subtitle) +
          actionsH +
          2
        return { label, actions, innerW, totalH }
      })

      const rowH = Math.max(...cellLayouts.map((c) => c.totalH))
      this.ensureSpace(rowH + LAYOUT.gapBlocks)
      const top = this.y

      cellLayouts.forEach((cell, index) => {
        const x = LAYOUT.marginLeft + index * (colW + gap)
        this.drawCardShell(x, top, colW, rowH, { fill: COLORS.panel })
        const textX = x + LAYOUT.cardPadding
        this.setColor('text', COLORS.ink)
        this.setFont('bold', FONT.subtitle)
        this.doc.text(
          pdfText(cell.label).toUpperCase(),
          textX,
          top + LAYOUT.cardPadding + 2,
        )
        let actionY =
          top + LAYOUT.cardPadding + lineHeightMm(FONT.subtitle) + 5
        for (const action of cell.actions) {
          actionY += this.renderDecisionAction(action, textX, actionY, cell.innerW) + 4
        }
      })

      this.y = top + rowH + LAYOUT.gapBlocks
    }
  }

  drawRecommendationCard(action: RecommendedAction): void {
    const innerW = this.contentWidth - LAYOUT.cardPadding * 2
    const fields: Array<[string, string]> = [
      ['Prioridad', PRIORITY_LABEL[action.priority]],
      ['Responsable sugerido', action.suggestedArea],
      ['Tiempo estimado', action.recommendedTime],
      ['Beneficio esperado', action.reason],
    ]
    let contentH = this.textBlockHeight(action.action, innerW, FONT.body) + 4
    for (const [label, value] of fields) {
      contentH += lineHeightMm(FONT.note) + 0.8
      contentH += this.textBlockHeight(value, innerW, FONT.body)
      contentH += 2
      void label
    }
    const cardH = LAYOUT.cardPadding * 2 + contentH
    this.ensureSpace(cardH + LAYOUT.cardGap / 2)
    this.drawCardShell(LAYOUT.marginLeft, this.y, this.contentWidth, cardH)
    let innerY = this.y + LAYOUT.cardPadding + 2
    const x = LAYOUT.marginLeft + LAYOUT.cardPadding
    this.setColor('text', COLORS.ink)
    this.setFont('bold', FONT.body)
    const actionLines = this.splitText(action.action, innerW)
    this.drawLines(actionLines, x, innerY, FONT.body)
    innerY += actionLines.length * lineHeightMm(FONT.body) + 4
    for (const [label, value] of fields) {
      this.setColor('text', COLORS.muted)
      this.setFont('bold', FONT.note)
      this.doc.text(pdfText(label).toUpperCase(), x, innerY)
      innerY += lineHeightMm(FONT.note) + 0.8
      this.setColor('text', COLORS.ink)
      this.setFont('normal', FONT.body)
      const lines = this.splitText(value, innerW)
      this.drawLines(lines, x, innerY, FONT.body)
      innerY += lines.length * lineHeightMm(FONT.body) + 2
    }
    this.y += cardH + LAYOUT.cardGap / 2
  }

  drawAffectedAreasGrid(
    areas: Array<{ name: string; affectationLevel: RiskLevel; reason: string }>,
  ): void {
    const gap = LAYOUT.cardGap / 2
    const cardW = (this.contentWidth - gap) / 2

    for (let i = 0; i < areas.length; i += 2) {
      const pair = areas.slice(i, i + 2)
      const layouts = pair.map((area) => {
        const innerW = cardW - LAYOUT.cardPadding * 2
        const reasonH = this.textBlockHeight(area.reason, innerW, FONT.body)
        const h =
          LAYOUT.cardPadding * 2 +
          lineHeightMm(FONT.subtitle) +
          lineHeightMm(FONT.body) +
          reasonH +
          2
        return { area, innerW, h }
      })
      const rowH = Math.max(...layouts.map((l) => l.h))
      this.ensureSpace(rowH + LAYOUT.cardGap / 2)
      const top = this.y

      layouts.forEach(({ area, innerW }, index) => {
        const x = LAYOUT.marginLeft + index * (cardW + gap)
        this.drawCardShell(x, top, cardW, rowH)
        const textX = x + LAYOUT.cardPadding
        let innerY = top + LAYOUT.cardPadding + 2
        this.setColor('text', COLORS.ink)
        this.setFont('bold', FONT.subtitle)
        this.doc.text(pdfText(area.name), textX, innerY)
        innerY += lineHeightMm(FONT.subtitle) + 1
        this.setColor('text', RISK_COLOR[area.affectationLevel])
        this.setFont('bold', FONT.body)
        this.doc.text(
          pdfText(
            `Impacto ${RISK_LEVEL_LABEL[area.affectationLevel].toLowerCase()}`,
          ),
          textX,
          innerY,
        )
        innerY += lineHeightMm(FONT.body) + 1.5
        this.setColor('text', COLORS.muted)
        this.setFont('normal', FONT.body)
        const lines = this.splitText(area.reason, innerW)
        this.drawLines(lines, textX, innerY, FONT.body)
      })

      this.y = top + rowH + LAYOUT.cardGap / 2
    }
    this.y += LAYOUT.gapBlocks / 3
  }

  drawTimelineEvent(
    dateLabel: string,
    timeLabel: string,
    title: string,
    description: string,
    options?: { isLast?: boolean },
  ): number {
    const descW = this.contentWidth - 28
    const titleLines = this.splitText(title, descW)
    const descLines = this.splitText(description, descW)
    const hasDateRow = Boolean(dateLabel || timeLabel)
    const rowH =
      (hasDateRow ? lineHeightMm(FONT.note) + 2 : 0) +
      titleLines.length * lineHeightMm(FONT.subtitle) +
      descLines.length * lineHeightMm(FONT.body) +
      8

    this.ensureSpace(rowH + 2)
    const top = this.y
    const dotX = LAYOUT.marginLeft + 2
    const contentX = LAYOUT.marginLeft + 10

    this.setColor('fill', COLORS.green)
    this.doc.circle(dotX, top + 3, 1.2, 'F')
    if (!options?.isLast) {
      this.setColor('draw', COLORS.line)
      this.doc.setLineWidth(0.3)
      this.doc.line(dotX, top + 5, dotX, top + rowH - 1)
    }

    let innerY = top + 3
    if (dateLabel || timeLabel) {
      this.setColor('text', COLORS.muted)
      this.setFont('bold', FONT.note)
      if (dateLabel) this.doc.text(pdfText(dateLabel), contentX, innerY)
      if (timeLabel) this.doc.text(pdfText(timeLabel), contentX + 36, innerY)
      innerY += lineHeightMm(FONT.note) + 2
    }

    this.setColor('text', COLORS.ink)
    this.setFont('bold', FONT.subtitle)
    this.drawLines(titleLines, contentX, innerY, FONT.subtitle)
    innerY += titleLines.length * lineHeightMm(FONT.subtitle) + 1
    this.setColor('text', COLORS.muted)
    this.setFont('normal', FONT.body)
    this.drawLines(descLines, contentX, innerY, FONT.body)

    this.y = top + rowH
    return rowH
  }

  drawRiskBreakdownGrid(
    components: Array<{ name: string; score: number; explanation: string }>,
  ): void {
    const gap = LAYOUT.cardGap / 2
    const colW = (this.contentWidth - gap) / 2

    for (let i = 0; i < components.length; i += 2) {
      const pair = components.slice(i, i + 2)
      const layouts = pair.map((component) => {
        const innerW = colW - LAYOUT.cardPadding * 2
        const title = `${component.name} (${component.score})`
        const h =
          LAYOUT.cardPadding * 2 +
          lineHeightMm(FONT.subtitle) +
          this.textBlockHeight(component.explanation, innerW, FONT.body) +
          2
        return { component, innerW, title, h }
      })
      const rowH = Math.max(...layouts.map((l) => l.h), 18)
      this.ensureSpace(rowH + LAYOUT.cardGap / 2)
      const top = this.y
      layouts.forEach(({ component, innerW, title, h }, index) => {
        const x = LAYOUT.marginLeft + index * (colW + gap)
        this.drawCardShell(x, top, colW, rowH)
        const textX = x + LAYOUT.cardPadding
        this.setColor('text', COLORS.ink)
        this.setFont('bold', FONT.subtitle)
        this.doc.text(pdfText(title), textX, top + LAYOUT.cardPadding + 2)
        this.setColor('text', COLORS.muted)
        this.setFont('normal', FONT.body)
        const lines = this.splitText(component.explanation, innerW)
        this.drawLines(
          lines,
          textX,
          top + LAYOUT.cardPadding + lineHeightMm(FONT.subtitle) + 3,
          FONT.body,
        )
        void h
      })
      this.y = top + rowH + LAYOUT.cardGap / 2
    }
  }

  drawHypothesisCard(
    probability: number,
    hypothesis: string,
    justification: string,
  ): void {
    const innerW = this.contentWidth - LAYOUT.cardPadding * 2 - 14
    const text = `${hypothesis}: ${justification}`
    const lines = this.splitText(text, innerW)
    const cardH =
      LAYOUT.cardPadding * 2 + lineHeightMm(FONT.body) + lines.length * lineHeightMm(FONT.body)
    this.ensureSpace(cardH + LAYOUT.cardGap / 2)
    this.drawCardShell(LAYOUT.marginLeft, this.y, this.contentWidth, cardH)
    this.setColor('fill', COLORS.green)
    this.doc.roundedRect(
      LAYOUT.marginLeft + LAYOUT.cardPadding,
      this.y + LAYOUT.cardPadding,
      12,
      5,
      1,
      1,
      'F',
    )
    this.setColor('text', COLORS.white)
    this.setFont('bold', FONT.note)
    this.doc.text(
      `${probability}%`,
      LAYOUT.marginLeft + LAYOUT.cardPadding + 6,
      this.y + LAYOUT.cardPadding + 3.5,
      { align: 'center' },
    )
    this.setColor('text', COLORS.ink)
    this.setFont('normal', FONT.body)
    this.drawLines(
      lines,
      LAYOUT.marginLeft + LAYOUT.cardPadding + 14,
      this.y + LAYOUT.cardPadding + 3.5,
      FONT.body,
    )
    this.y += cardH + LAYOUT.cardGap / 2
  }

  drawExecutiveDecisionCard(decision: {
    decision: string
    urgencyLevel: ExecutiveUrgency
    recommendedActionTime: string
    initialResponsible: string
  }): void {
    const innerW = this.contentWidth - LAYOUT.cardPadding * 2
    const decisionLines = this.splitText(decision.decision, innerW)
    const meta = `Urgencia: ${URGENCY_LABEL[decision.urgencyLevel]}  |  Tiempo: ${decision.recommendedActionTime}  |  Responsable: ${decision.initialResponsible}`
    const metaLines = this.splitText(meta, innerW)
    const cardH =
      LAYOUT.cardPadding * 2 +
      decisionLines.length * lineHeightMm(FONT.subtitle) +
      metaLines.length * lineHeightMm(FONT.body) +
      4
    this.ensureSpace(cardH + LAYOUT.gapBlocks / 2)
    this.drawCardShell(LAYOUT.marginLeft, this.y, this.contentWidth, cardH, {
      fill: COLORS.panel,
      border: COLORS.green,
    })
    const x = LAYOUT.marginLeft + LAYOUT.cardPadding
    this.setColor('text', COLORS.ink)
    this.setFont('bold', FONT.subtitle)
    this.drawLines(
      decisionLines,
      x,
      this.y + LAYOUT.cardPadding + 3,
      FONT.subtitle,
    )
    this.setColor('text', COLORS.muted)
    this.setFont('normal', FONT.body)
    this.drawLines(
      metaLines,
      x,
      this.y +
        LAYOUT.cardPadding +
        3 +
        decisionLines.length * lineHeightMm(FONT.subtitle) +
        2,
      FONT.body,
    )
    this.y += cardH + LAYOUT.gapBlocks / 2
  }

  drawIndicatorRow(indicator: {
    name: string
    explanation: string
    unit: string
    suggestedValue: number
    trend: IndicatorTrend
  }): void {
    const innerW = this.contentWidth - LAYOUT.cardPadding * 2
    const explanationLines = this.splitText(indicator.explanation, innerW)
    const cardH =
      LAYOUT.cardPadding * 2 +
      lineHeightMm(FONT.subtitle) +
      explanationLines.length * lineHeightMm(FONT.body) +
      2
    this.ensureSpace(cardH + LAYOUT.cardGap / 2)
    this.drawCardShell(LAYOUT.marginLeft, this.y, this.contentWidth, cardH)
    const x = LAYOUT.marginLeft + LAYOUT.cardPadding
    this.setColor('text', COLORS.ink)
    this.setFont('bold', FONT.subtitle)
    this.doc.text(pdfText(indicator.name), x, this.y + LAYOUT.cardPadding + 2)
    this.setColor('text', COLORS.green)
    this.setFont('bold', FONT.body)
    this.doc.text(
      pdfText(
        `${indicator.suggestedValue.toLocaleString('es-CO')} ${indicator.unit}  ·  ${TREND_LABEL[indicator.trend]}`,
      ),
      this.pageWidth - LAYOUT.marginRight - LAYOUT.cardPadding,
      this.y + LAYOUT.cardPadding + 2,
      { align: 'right' },
    )
    this.setColor('text', COLORS.muted)
    this.setFont('normal', FONT.body)
    this.drawLines(
      explanationLines,
      x,
      this.y + LAYOUT.cardPadding + lineHeightMm(FONT.subtitle) + 3,
      FONT.body,
    )
    this.y += cardH + LAYOUT.cardGap / 2
  }

  measureTimelineEvents(
    events: Array<{
      dateLabel: string
      timeLabel: string
      title: string
      description: string
    }>,
    firstEventOnly = true,
  ): number {
    if (events.length === 0) {
      return this.measureParagraph('No existen movimientos registrados.')
    }
    const descW = this.contentWidth - 28
    const measureOne = (event: (typeof events)[number]): number => {
      const titleLines = this.splitText(event.title, descW)
      const descLines = this.splitText(event.description, descW)
      const hasDateRow = Boolean(event.dateLabel || event.timeLabel)
      return (
        (hasDateRow ? lineHeightMm(FONT.note) + 2 : 0) +
        titleLines.length * lineHeightMm(FONT.subtitle) +
        descLines.length * lineHeightMm(FONT.body) +
        10
      )
    }
    if (firstEventOnly) return measureOne(events[0]!) + LAYOUT.gapBlocks / 3
    let total = 0
    for (const event of events) total += measureOne(event)
    return total + LAYOUT.gapBlocks / 3
  }

  drawPropagationChain(
    chain: Array<{ stage: string; description: string }>,
  ): void {
    chain.forEach((step, index) => {
      const isLast = index === chain.length - 1
      this.drawTimelineEvent('', '', step.stage, step.description, { isLast })
    })
    this.y += LAYOUT.gapBlocks / 3
  }
}

function parseTimelineDateTime(iso: string): { date: string; time: string } {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return { date: pdfText(iso), time: '' }
  }
  const dateLabel = pdfText(
    new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date),
  )
  const timeLabel = pdfText(
    new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date),
  )
  return { date: dateLabel, time: timeLabel }
}

export async function exportSituationReportPdf(
  event: OperationalEvent,
): Promise<void> {
  const interpretation = event.interpretation
  const report = interpretation?.executiveReport ?? null
  const risk =
    report?.riskAssessment.riskLevel ?? interpretation?.riskLevel ?? 'moderate'
  const reference = eventRef(event.id)
  const reportTitle = report?.incidentSummary.executiveTitle ?? event.title
  const logo = await loadLogoAsset()

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const layout = new PdfReportLayout(doc, logo)

  doc.setProperties({
    title: pdfText(`Reporte ejecutivo ${reference} - ${reportTitle}`),
    subject: 'Analisis ejecutivo de inteligencia operacional',
    author: 'CUNMARK - Sistema de Inteligencia Operacional',
    creator: 'Plataforma CUNMARK',
  })

  const priorityLabel = report?.executivePriority?.level
    ? (PRIORITY_LEVEL_LABEL[report.executivePriority.level] ??
      report.executivePriority.level)
    : RISK_LEVEL_LABEL[risk].toUpperCase()

  layout.drawCoverHeader({
    title: reportTitle,
    status: EVENT_STATUS_LABEL[event.status],
    priority: priorityLabel,
    date: formatShortDate(event.reportedAt ?? event.createdAt),
    reference,
  })

  layout.drawMetadataStrip([
    ['Reportado', formatDateTime(event.reportedAt)],
    ['Area de origen', event.sourceAreaName],
    ['Responsable', event.reportedBy.name],
  ])

  const certaintyPct =
    report?.riskAssessment.certainty.percentage ??
    (interpretation?.confidence !== undefined
      ? Math.round(interpretation.confidence * 100)
      : undefined)

  layout.drawSummaryIndicators([
    {
      label: 'Riesgo',
      value: `${report?.riskAssessment.riskScore ?? interpretation?.riskScore ?? '-'} / 100`,
      percentage: report?.riskAssessment.riskScore ?? interpretation?.riskScore,
    },
    {
      label: 'Severidad',
      value: report
        ? `${report.riskAssessment.severity} / 5`
        : interpretation
          ? `${interpretation.impactSeverity} / 5`
          : '-',
      percentage: report
        ? (report.riskAssessment.severity / 5) * 100
        : interpretation
          ? (interpretation.impactSeverity / 5) * 100
          : undefined,
    },
    {
      label: 'Confianza IA',
      value: report
        ? `${report.riskAssessment.certainty.percentage}% (${CERTAINTY_LABEL[report.riskAssessment.certainty.level]})`
        : certaintyPct !== undefined
          ? `${certaintyPct}%`
          : '-',
      percentage: certaintyPct,
    },
    {
      label: 'Urgencia',
      value: report ? URGENCY_LABEL[report.executiveConclusion.urgency] : '-',
    },
  ])

  if (report) {
    if (report.executiveNarrative) {
      layout.section(null, 'Lectura ejecutiva CUNMARK')
      layout.paragraph(report.executiveNarrative)
    }

    if (report.executiveDecision) {
      layout.section(1, 'Decision ejecutiva')
      layout.drawExecutiveDecisionCard(report.executiveDecision)
    }

    if (report.executivePriority || report.criticalWindow) {
      layout.section(null, 'Prioridad y ventana critica')
      const priorityCards: Array<{ label: string; value: string }> = []
      if (report.executivePriority) {
        priorityCards.push({
          label: 'Prioridad',
          value:
            PRIORITY_LEVEL_LABEL[report.executivePriority.level] ??
            report.executivePriority.level,
        })
      }
      if (report.criticalWindow) {
        priorityCards.push({
          label: 'Ventana critica',
          value: report.criticalWindow.timeBeforeEscalation,
        })
      }
      if (priorityCards.length > 0) {
        layout.drawSummaryIndicators(priorityCards)
      }
      if (report.executivePriority?.justification) {
        layout.paragraph(report.executivePriority.justification, { muted: true })
      }
      if (report.criticalWindow?.explanation) {
        layout.paragraph(report.criticalWindow.explanation)
      }
    }

    if (report.riskBreakdown) {
      layout.section(null, 'Desglose de riesgo')
      layout.drawRiskBreakdownGrid(report.riskBreakdown.components)
    }

    layout.section(1, 'Que ocurrio')
    layout.paragraph(report.incidentSummary.executiveSummary)
    layout.subLabel('Causas detectadas (evidencia del relato)')
    layout.bulletList(report.rootCause.detectedCauses)
    layout.subLabel('Hipotesis de la IA')
    if (report.probableCauses?.length) {
      for (const cause of report.probableCauses) {
        layout.drawHypothesisCard(
          cause.probability,
          cause.hypothesis,
          cause.justification,
        )
      }
    } else {
      layout.bulletList(report.rootCause.hypotheses, { muted: true })
    }

    if (report.operationalPropagation?.chain.length) {
      layout.subLabel('Propagacion operacional')
      layout.drawPropagationChain(report.operationalPropagation.chain)
    } else {
      layout.subLabel('Dependencias involucradas')
      layout.bulletList(report.rootCause.dependencies)
    }

    layout.section(2, 'Que tan grave es')
    layout.paragraph(
      `Riesgo ${RISK_LEVEL_LABEL[report.riskAssessment.riskLevel]} (${report.riskAssessment.riskScore}/100) con severidad ${report.riskAssessment.severity}/5. ` +
        `Categoria: ${interpretation?.categoryName ?? 'Sin clasificar'}.`,
    )
    layout.subLabel(
      `Nivel de certeza: ${CERTAINTY_LABEL[report.riskAssessment.certainty.level]} (${report.riskAssessment.certainty.percentage}%)`,
    )
    layout.drawProgressIndicator(
      'Confianza del analisis',
      report.riskAssessment.certainty.percentage,
      { accent: COLORS.green },
    )
    layout.paragraph(report.riskAssessment.certainty.explanation, { muted: true })
    if (report.confidenceExplanation) {
      layout.bulletList(
        [
          ...report.confidenceExplanation.supportingFactors.map((f) => `+ ${f}`),
          ...report.confidenceExplanation.reducingFactors.map((f) => `- ${f}`),
        ],
        { muted: true },
      )
    }

    if (report.decisionMatrix) {
      const matrixSections = [
        ['Resolver ahora', report.decisionMatrix.resolveNow],
        ['Resolver hoy', report.decisionMatrix.resolveToday],
        ['Monitorear', report.decisionMatrix.monitor],
        ['Escalar', report.decisionMatrix.escalate],
      ] as const
      const matrixHeight = layout.measureDecisionMatrixHeight(
        matrixSections.map(([label, actions]) => [label, actions]),
      )
      layout.section(null, 'Matriz de decisiones', matrixHeight)
      layout.drawDecisionMatrix(
        matrixSections.map(([label, actions]) => [label, actions]),
      )
    }

    layout.section(3, 'Por que es grave')
    layout.bulletList(report.decisionFactors)

    layout.section(4, 'Quien esta siendo afectado')
    layout.drawSummaryIndicators([
      {
        label: 'Impacto interno',
        value: `${report.impactAnalysis.internalImpactPercentage}%`,
        percentage: report.impactAnalysis.internalImpactPercentage,
      },
      {
        label: 'Impacto externo',
        value: `${report.impactAnalysis.externalImpactPercentage}%`,
        percentage: report.impactAnalysis.externalImpactPercentage,
      },
      {
        label: 'Estudiantes',
        value: `${report.impactAnalysis.studentImpactPercentage}%`,
        percentage: report.impactAnalysis.studentImpactPercentage,
      },
    ])

    layout.paragraph(
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

    layout.subLabel('Areas afectadas y motivo')
    layout.drawAffectedAreasGrid(report.affectedAreas)

    layout.section(5, 'Que recomienda la IA')
    for (const action of report.recommendedActions) {
      layout.drawRecommendationCard(action)
    }

    layout.section(6, 'Que pasa si no actuamos')
    layout.bulletList(report.operationalConsequences)

    const indicatorsHeight = layout.measureIndicatorRows(
      report.operationalIndicators,
    )
    layout.section(7, 'Indicadores afectados', indicatorsHeight)
    if (report.operationalIndicators.length === 0) {
      layout.paragraph('No hay indicadores afectados identificados.', {
        muted: true,
      })
    } else {
      for (const indicator of report.operationalIndicators) {
        layout.drawIndicatorRow(indicator)
      }
    }

    layout.section(8, 'Areas responsables')
    const responsibles = new Map<string, string>()
    for (const action of report.recommendedActions) {
      if (!responsibles.has(action.suggestedArea)) {
        responsibles.set(action.suggestedArea, action.action)
      }
    }
    layout.bulletList(
      [...responsibles.entries()].map(
        ([area, mandate]) => `${area}: ${mandate}`,
      ),
    )

    layout.section(9, 'Cronologia sugerida')
    report.timelineSuggestions.forEach((milestone, index) => {
      const isLast = index === report.timelineSuggestions.length - 1
      layout.drawTimelineEvent(
        milestone.horizon,
        '',
        'Hito de seguimiento',
        milestone.checkpoint,
        { isLast },
      )
    })
    layout.advance(LAYOUT.gapBlocks / 3)

    layout.section(10, 'Conclusion ejecutiva')
    layout.paragraph(
      [
        `Gravedad: ${report.executiveConclusion.gravity}`,
        `Urgencia: ${URGENCY_LABEL[report.executiveConclusion.urgency]}`,
        `Recomendacion general: ${report.executiveConclusion.recommendation}`,
      ].join('\n'),
    )
    if (report.dataGaps.length > 0) {
      layout.subLabel('Vacios de informacion declarados por la IA')
      layout.bulletList(report.dataGaps, { muted: true })
    }
  } else {
    layout.section(null, 'Resumen ejecutivo')
    layout.paragraph(interpretation?.executiveSummary ?? event.description)
    if (interpretation) {
      layout.section(null, 'Narrativa y lectura tecnica')
      layout.paragraph(interpretation.narrative)
    }
  }

  layout.section(null, 'Descripcion reportada')
  layout.paragraph(event.description)

  const timeline = [...event.timeline.entries].sort((a, b) =>
    a.at.localeCompare(b.at),
  )
  const timelineEvents =
    timeline.length === 0
      ? []
      : timeline.map((entry) => {
          const { date, time } = parseTimelineDateTime(entry.at)
          return {
            dateLabel: date,
            timeLabel: time,
            title: timelineTypeLabel(entry.type),
            description: entry.description,
          }
        })
  layout.section(
    null,
    'Registro del evento',
    layout.measureTimelineEvents(timelineEvents),
  )
  if (timelineEvents.length === 0) {
    layout.paragraph('No existen movimientos registrados.', { muted: true })
  } else {
    timelineEvents.forEach((entry, index) => {
      layout.drawTimelineEvent(
        entry.dateLabel,
        entry.timeLabel,
        entry.title,
        entry.description,
        { isLast: index === timelineEvents.length - 1 },
      )
    })
    layout.advance(LAYOUT.gapBlocks / 3)
  }

  layout.section(null, 'Informacion complementaria')
  layout.paragraph(
    [
      `Observaciones: ${event.observations?.trim() || 'Ninguna'}`,
      `Adjuntos: ${
        event.attachmentNames?.length
          ? event.attachmentNames.join(', ')
          : 'Ninguno'
      }`,
      `Modelo de analisis: ${interpretation?.modelLabel ?? '-'}`,
      `Ultima actualizacion: ${formatDateTime(event.lastUpdateAt ?? event.createdAt)}`,
    ].join('\n'),
    { muted: true },
  )

  layout.drawFooters()

  downloadPdfBlob(
    doc,
    buildReportFileName(reportTitle, event.reportedAt ?? event.createdAt),
  )
}
