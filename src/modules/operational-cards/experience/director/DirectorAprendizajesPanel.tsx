import { useEffect, useId, useState, type ReactNode } from 'react'
import { DirectorAprendizajesChart } from '@/modules/operational-cards/charts/DirectorAprendizajesChart'
import { formatDossierFolio } from '@/modules/operational-cards/data/problemDossier'
import type { AnalysisPeriod } from '@/modules/operational-cards/domain/analysis-period'
import {
  learningsKey,
  useDirectorLearningItems,
  useDirectorLearningsSummary,
  type DirectorLearningsLoadStatus,
} from '@/modules/operational-cards/hooks/useDirectorLearnings'
import type {
  LearningCategory,
  LearningItem,
  LearningsSummary,
} from '@/modules/operational-cards/types/learnings.types'
import '@/styles/director-kpi-panel.css'

/**
 * APRENDIZAJES de la coordinación seleccionada sobre el AnalysisPeriod GLOBAL
 * del DirectorReadingPanel. Tres bloques verticales:
 *
 *   A. Indicadores   aprendizajes registrados · cobertura (cierres con aprendizaje).
 *   B. Categorías    distribución del periodo COMPLETO (no la filtra nada).
 *   C. Lo que aprendimos  fichas paginadas, filtrables por categoría.
 *
 * Universo: coordinación RESPONSABLE + closedAt en el periodo. Solo lectura:
 * «Ver expediente» abre el detalle existente por `onOpenProblem`.
 */

function formatClosedDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Bogota',
  })
}

function BlockTitle({ children, count }: { children: string; count?: string }) {
  return (
    <p className="director-estado__section-title director-aprendizajes__title">
      <span className="director-estado__section-mark" aria-hidden="true">
        ✦
      </span>
      <span>{children}</span>
      {count ? <span className="director-aprendizajes__count">{count}</span> : null}
    </p>
  )
}

function LoadingRows({ testId, rows }: { testId: string; rows: number }) {
  return (
    <div className="director-aprendizajes__skeleton" data-testid={testId} aria-busy="true">
      <span className="director-aprendizajes__sr">Leyendo aprendizajes…</span>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="director-aprendizajes__skeleton-row" aria-hidden="true" />
      ))}
    </div>
  )
}

function Indicators({ summary }: { summary: LearningsSummary }) {
  const coverage = summary.coverage
  return (
    <div className="director-aprendizajes__indicators" data-testid="director-aprendizajes-indicators">
      <div className="director-aprendizajes__indicator">
        <strong className="director-aprendizajes__value" data-testid="director-aprendizajes-count">
          {summary.learningCount}
        </strong>
        <span className="director-aprendizajes__label">
          {summary.learningCount === 1 ? 'Aprendizaje' : 'Aprendizajes'}
        </span>
      </div>
      <div
        className="director-aprendizajes__indicator"
        title="Completitud del registro, no calidad del aprendizaje."
      >
        <strong
          className="director-aprendizajes__value"
          data-testid="director-aprendizajes-coverage"
          data-empty={coverage === null ? 'true' : undefined}
        >
          {coverage === null ? '—' : `${coverage} %`}
        </strong>
        <span className="director-aprendizajes__label">
          {coverage === null
            ? 'Sin cierres en el periodo'
            : `Cierres con aprendizaje · ${summary.learningCount} de ${summary.closedCount}`}
        </span>
      </div>
    </div>
  )
}

function LearningCard({
  item,
  selected,
  onOpenProblem,
}: {
  item: LearningItem
  selected: boolean
  onOpenProblem: ((problemId: string) => void) | null
}) {
  return (
    <li>
      <article
        className="director-aprendizaje-card"
        data-testid="director-aprendizaje-card"
        data-problem-id={item.situationId}
        data-selected={selected ? 'true' : undefined}
        aria-label={`Aprendizaje: ${item.title}`}
      >
        <header className="director-aprendizaje-card__meta">
          <span className="director-aprendizaje-card__category" data-testid="director-aprendizaje-card-category">
            {item.category.name}
          </span>
          <span className="director-aprendizaje-card__folio">{formatDossierFolio(item.situationId)}</span>
          {item.reportKind === 'INTER_COORDINATION' ? (
            <span className="director-aprendizaje-card__kind">Dependencia</span>
          ) : null}
          <time className="director-aprendizaje-card__date" dateTime={item.closedAt}>
            Cerrado {formatClosedDay(item.closedAt)}
          </time>
        </header>
        <div className="director-aprendizaje-card__head">
          <p className="director-aprendizaje-card__problem" title={item.title}>
            {item.title}
          </p>
          <button
            type="button"
            className="director-aprendizaje-card__open"
            data-testid="director-aprendizaje-open"
            onClick={() => onOpenProblem?.(item.situationId)}
            disabled={!onOpenProblem}
            aria-label={`Ver expediente: ${item.title}`}
          >
            Ver expediente
          </button>
        </div>
        <p className="director-aprendizaje-card__learning" data-testid="director-aprendizaje-card-learning">
          {item.learningExcerpt}
        </p>
      </article>
    </li>
  )
}

export function DirectorAprendizajesPanelView({
  hasCoordination,
  coordinationId,
  period,
  summaryStatus,
  summary,
  summaryError,
  onRetrySummary,
  categoryId,
  onCategoryChange,
  itemsStatus,
  items,
  itemsTotal,
  hasMore,
  loadingMore,
  itemsError,
  moreError,
  onLoadMore,
  onRetryItems,
  openProblemId,
  onOpenProblem,
}: {
  hasCoordination: boolean
  coordinationId: string | null
  period: Pick<AnalysisPeriod, 'kind' | 'from' | 'to'>
  summaryStatus: DirectorLearningsLoadStatus
  summary: LearningsSummary | null
  summaryError: string | null
  onRetrySummary: () => void
  categoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
  itemsStatus: DirectorLearningsLoadStatus
  items: readonly LearningItem[]
  itemsTotal: number
  hasMore: boolean
  loadingMore: boolean
  itemsError: string | null
  moreError: string | null
  onLoadMore: () => void
  onRetryItems: () => void
  openProblemId: string | null
  onOpenProblem: ((problemId: string) => void) | null
}) {
  const filterId = useId()

  /** Raíz común: la lectura (coordinación + periodo) viaja en todos los estados. */
  const root = (state: string, children: ReactNode) => (
    <div
      className="director-aprendizajes"
      data-testid="director-reading-aprendizajes"
      data-state={state}
      data-coordination={coordinationId ?? ''}
      data-period-kind={period.kind}
      data-period-from={period.from}
      data-period-to={period.to}
    >
      {children}
    </div>
  )

  if (!hasCoordination) {
    return root(
      'no-coordination',
      <p className="director-history__empty" data-testid="director-aprendizajes-no-coordination">
        Seleccione una carta para leer lo que aprendió esa coordinación.
      </p>,
    )
  }

  if (summaryStatus === 'error') {
    return root(
      'error',
      <p className="director-kpi-panel__error" role="alert" data-testid="director-aprendizajes-error">
        No se pudieron leer los aprendizajes.{summaryError ? ` ${summaryError}` : ''}
        <button type="button" className="director-aprendizajes__retry" onClick={onRetrySummary}>
          Reintentar
        </button>
      </p>,
    )
  }

  if (!summary) {
    return root('loading', <LoadingRows testId="director-aprendizajes-loading" rows={4} />)
  }

  const categories: readonly LearningCategory[] = summary.categories
  const activeCategory = categoryId ? categories.find((c) => c.id === categoryId) ?? null : null
  const noClosures = summary.closedCount === 0
  const closuresWithoutLearning = !noClosures && summary.learningCount === 0

  return root(
    'ready',
    <>
      <Indicators summary={summary} />

      {noClosures ? (
        <p className="director-history__empty" data-testid="director-aprendizajes-no-closures">
          No hubo problemas cerrados en este periodo.
        </p>
      ) : null}

      {closuresWithoutLearning ? (
        <p className="director-history__empty" data-testid="director-aprendizajes-without-learning">
          {summary.closedCount === 1
            ? 'El único cierre del periodo no tiene aprendizaje registrado.'
            : `Los ${summary.closedCount} cierres del periodo no tienen aprendizaje registrado.`}
        </p>
      ) : null}

      {summary.learningCount > 0 ? (
        <>
          <section className="director-aprendizajes__block" aria-label="Aprendizajes por categoría">
            <BlockTitle>Aprendizajes por categoría</BlockTitle>
            <DirectorAprendizajesChart categories={categories} />
          </section>

          <section
            className="director-aprendizajes__block director-aprendizajes__block--cards"
            aria-label="Lo que aprendimos"
            data-testid="director-aprendizajes-cards"
          >
            <div className="director-aprendizajes__cards-head">
              <BlockTitle
                count={itemsStatus === 'success' ? String(itemsTotal) : undefined}
              >
                Lo que aprendimos
              </BlockTitle>
              <label className="director-aprendizajes__filter" htmlFor={filterId}>
                <span className="director-aprendizajes__sr">Filtrar por categoría</span>
                <select
                  id={filterId}
                  data-testid="director-aprendizajes-filter"
                  value={activeCategory?.id ?? ''}
                  onChange={(event) => onCategoryChange(event.target.value || null)}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {`${category.name} (${category.count})`}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {itemsStatus === 'loading' ? <LoadingRows testId="director-aprendizajes-cards-loading" rows={3} /> : null}

            {itemsStatus === 'error' ? (
              <p className="director-kpi-panel__error" role="alert" data-testid="director-aprendizajes-cards-error">
                No se pudieron leer las fichas.{itemsError ? ` ${itemsError}` : ''}
                <button type="button" className="director-aprendizajes__retry" onClick={onRetryItems}>
                  Reintentar
                </button>
              </p>
            ) : null}

            {itemsStatus === 'success' && items.length === 0 ? (
              <p className="director-history__empty" data-testid="director-aprendizajes-category-empty">
                Sin aprendizajes de esta categoría en el periodo.{' '}
                <button
                  type="button"
                  className="director-aprendizajes__link"
                  onClick={() => onCategoryChange(null)}
                >
                  Ver todas
                </button>
              </p>
            ) : null}

            {itemsStatus === 'success' && items.length > 0 ? (
              <>
                <ol className="director-aprendizajes__list" data-testid="director-aprendizajes-list">
                  {items.map((item) => (
                    <LearningCard
                      key={item.situationId}
                      item={item}
                      selected={item.situationId === openProblemId}
                      onOpenProblem={onOpenProblem}
                    />
                  ))}
                </ol>
                {moreError ? (
                  <p className="director-kpi-panel__error" role="alert" data-testid="director-aprendizajes-more-error">
                    No se pudieron cargar más fichas. {moreError}
                  </p>
                ) : null}
                {hasMore ? (
                  <button
                    type="button"
                    className="director-aprendizajes__more"
                    data-testid="director-aprendizajes-more"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Cargando…' : `Cargar más · ${items.length} de ${itemsTotal}`}
                  </button>
                ) : null}
              </>
            ) : null}
          </section>
        </>
      ) : null}
    </>,
  )
}

export function DirectorAprendizajesPanel({
  coordinationId,
  analysisPeriod,
  openProblemId = null,
  onOpenProblem = null,
}: {
  coordinationId: string | null
  analysisPeriod: AnalysisPeriod
  openProblemId?: string | null
  onOpenProblem?: ((problemId: string) => void) | null
}) {
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const readingKey = learningsKey(coordinationId, analysisPeriod)

  // Otra coordinación u otro periodo = otro universo: la categoría elegida
  // puede no existir en él. Se vuelve a «Todas».
  useEffect(() => {
    setCategoryId(null)
  }, [readingKey])

  const summary = useDirectorLearningsSummary(coordinationId, analysisPeriod)
  // La categoría solo se aplica si existe en el resumen vigente.
  const effectiveCategory =
    categoryId && summary.data?.categories.some((c) => c.id === categoryId) ? categoryId : null
  const cards = useDirectorLearningItems(
    summary.data && summary.data.learningCount > 0 ? coordinationId : null,
    analysisPeriod,
    effectiveCategory,
  )

  return (
    <DirectorAprendizajesPanelView
      hasCoordination={coordinationId !== null}
      coordinationId={coordinationId}
      period={analysisPeriod}
      summaryStatus={summary.status}
      summary={summary.data}
      summaryError={summary.error}
      onRetrySummary={summary.retry}
      categoryId={effectiveCategory}
      onCategoryChange={setCategoryId}
      itemsStatus={cards.status}
      items={cards.items}
      itemsTotal={cards.total}
      hasMore={cards.hasMore}
      loadingMore={cards.loadingMore}
      itemsError={cards.error}
      moreError={cards.moreError}
      onLoadMore={cards.loadMore}
      onRetryItems={cards.retry}
      openProblemId={openProblemId}
      onOpenProblem={onOpenProblem}
    />
  )
}

