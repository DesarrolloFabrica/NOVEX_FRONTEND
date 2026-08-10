import { useEffect, useMemo, useState } from 'react'
import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'
import { useExecutiveOperations } from '@/modules/executive-operations-center/hooks/useExecutiveOperations'
import {
  DataState,
  MetricCard,
  OperationsPageHeader,
  OperationsPagination,
  OperationsPanel,
  PanelLink,
  SeverityPill,
  paginateItems,
} from '@/modules/executive-operations-center/components/shared/OperationalCenterUI'
import {
  formatConfidence,
  formatDateTime,
} from '@/modules/executive-operations-center/utils/operational-center.presentation'
import { NovexIcon } from '@/shared/components/NovexIcon'

function confidenceTone(confidence: number | null): string {
  if (confidence === null) return 'unavailable'
  if (confidence >= 0.8) return 'stable'
  if (confidence >= 0.65) return 'attention'
  return 'critical'
}

const ANALYSIS_PAGE_SIZE = 6

export function InteligenciaPage() {
  const { data, status, error, reload } = useExecutiveOperations()
  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(null)
  const [analysisPage, setAnalysisPage] = useState(1)

  const analyzed = useMemo(
    () =>
      (data?.situations ?? [])
        .filter((item) => item.ai.hasAnalysis)
        .sort(
          (left, right) =>
            new Date(right.ai.analyzedAt ?? right.updatedAt).getTime() -
            new Date(left.ai.analyzedAt ?? left.updatedAt).getTime(),
        ),
    [data],
  )

  const pagedAnalyzed = useMemo(
    () => paginateItems(analyzed, analysisPage, ANALYSIS_PAGE_SIZE),
    [analysisPage, analyzed],
  )

  useEffect(() => {
    setAnalysisPage(1)
  }, [analyzed.length])

  if (status !== 'ready' || !data) {
    return (
      <div className="eoc-view">
        <OperationsPageHeader
          title="Qué ha registrado la IA"
          description="Cobertura, confianza y brechas del análisis asistido."
          compact
        />
        <DataState
          status={status === 'ready' ? 'loading' : status}
          error={error}
          onRetry={() => void reload()}
        />
      </div>
    )
  }

  const { metrics } = data
  const withoutAnalysis = data.situations.filter((item) => !item.ai.hasAnalysis)
  const lowConfidence = analyzed.filter(
    (item) => item.ai.confidence !== null && item.ai.confidence < 0.65,
  )
  const classificationChanges = analyzed.filter(
    (item) =>
      item.ai.classifiedSeverity !== null &&
      item.ai.classifiedSeverity !== item.severity,
  )
  const missingInformation = analyzed.reduce(
    (total, item) => total + item.ai.missingInformationCount,
    0,
  )
  const providerCounts = new Map<string, number>()
  for (const item of analyzed) {
    const provider = [item.ai.provider, item.ai.model].filter(Boolean).join(' · ') || 'Proveedor no informado'
    providerCounts.set(provider, (providerCounts.get(provider) ?? 0) + 1)
  }

  return (
    <div className="eoc-view">
      <OperationsPageHeader
        title="Qué ha registrado la IA"
        description="Conclusiones, confianza y datos faltantes del análisis asistido."
        generatedAt={data.generatedAt}
        loading={false}
        onRefresh={() => void reload()}
        compact
      />

      <div className="eoc-metrics-grid eoc-metrics-grid--six">
        <MetricCard
          label="Cobertura IA"
          value={`${metrics.analysisCoverage}%`}
          hint={`${metrics.situationsWithAnalysis} de ${metrics.totalSituations} expedientes`}
          tone={metrics.analysisCoverage >= 80 ? 'stable' : 'ai'}
          icon="sparkles"
          help="Porcentaje de expedientes con al menos un análisis IA registrado respecto al total de situaciones en NOVEX."
        />
        <MetricCard
          label="Confianza promedio"
          value={formatConfidence(metrics.averageAiConfidence)}
          hint="Promedio de los análisis disponibles"
          tone={confidenceTone(metrics.averageAiConfidence)}
          icon="shield"
          help="Nivel medio de certeza que declara la IA en sus lecturas. Una cifra más alta indica conclusiones más consistentes."
        />
        <MetricCard
          label="Versiones generadas"
          value={metrics.totalAiVersions}
          hint={`${metrics.reanalyzedSituations} situaciones reanalizadas`}
          tone="ai"
          icon="activity"
          help="Número total de versiones de análisis conservadas en la plataforma, incluyendo reanálisis posteriores."
        />
        <MetricCard
          label="Acciones pendientes"
          value={metrics.pendingRecommendations}
          hint={`${metrics.completedRecommendations} completadas`}
          tone={metrics.pendingRecommendations > 0 ? 'attention' : 'stable'}
          icon="check"
          help="Recomendaciones sugeridas por la IA que aún no se han marcado como completadas en los expedientes."
        />
        <MetricCard
          label="Sin análisis"
          value={metrics.situationsWithoutAnalysis}
          hint="Expedientes sin lectura asistida"
          tone={metrics.situationsWithoutAnalysis > 0 ? 'critical' : 'stable'}
          icon="alert"
          help="Expedientes que aún no cuentan con lectura o análisis asistido por inteligencia artificial."
        />
        <MetricCard
          label="Preguntas abiertas"
          value={missingInformation}
          hint="Datos faltantes identificados por IA"
          tone={missingInformation > 0 ? 'attention' : 'stable'}
          icon="help"
          help="Total de datos faltantes identificados por la IA en los análisis disponibles; indican brechas informativas a completar."
        />
      </div>

      <div className="eoc-ai-overview">
        <OperationsPanel
          eyebrow="Gobierno del análisis"
          title="Cobertura y confiabilidad"
          description="La cobertura mide expedientes analizados; la confianza mide certeza declarada por la IA."
          help="Compara cuántos expedientes tienen análisis frente al nivel medio de confianza declarado. Incluye señales de reanálisis, reclasificación y lecturas de baja certeza."
        >
          <div className="eoc-ai-gauges">
            <div
              className="eoc-ai-gauge"
              style={{ '--eoc-gauge-value': `${metrics.analysisCoverage * 3.6}deg` } as React.CSSProperties}
            >
              <div>
                <strong>{metrics.analysisCoverage}%</strong>
                <span>Cobertura</span>
              </div>
            </div>
            <div
              className="eoc-ai-gauge eoc-ai-gauge--confidence"
              style={{
                '--eoc-gauge-value': `${(metrics.averageAiConfidence ?? 0) * 360}deg`,
              } as React.CSSProperties}
            >
              <div>
                <strong>{formatConfidence(metrics.averageAiConfidence)}</strong>
                <span>Confianza</span>
              </div>
            </div>
            <dl className="eoc-ai-gauges__facts">
              <div>
                <dt>Reanálisis</dt>
                <dd>{metrics.reanalyzedSituations}</dd>
              </div>
              <div>
                <dt>Cambios de clasificación</dt>
                <dd>{classificationChanges.length}</dd>
              </div>
              <div>
                <dt>Baja confianza</dt>
                <dd>{lowConfidence.length}</dd>
              </div>
            </dl>
          </div>
        </OperationsPanel>

        <OperationsPanel
          eyebrow="Trazabilidad técnica"
          title="Motores y versiones"
          description="Proveedor/modelo reportado por la versión más reciente de cada análisis."
          help="Proveedor y modelo reportados por la versión más reciente de cada análisis. Permite auditar qué motor generó cada lectura."
          helpAlign="end"
        >
          {providerCounts.size > 0 ? (
            <ul className="eoc-provider-list">
              {[...providerCounts.entries()].map(([provider, count]) => (
                <li key={provider}>
                  <span><NovexIcon name="sparkles" /> {provider}</span>
                  <strong>{count} {count === 1 ? 'análisis' : 'análisis'}</strong>
                </li>
              ))}
              <li>
                <span><NovexIcon name="activity" /> Total de versiones conservadas</span>
                <strong>{metrics.totalAiVersions}</strong>
              </li>
            </ul>
          ) : (
            <div className="eoc-inline-empty">Todavía no hay motores de IA registrados.</div>
          )}
        </OperationsPanel>
      </div>

      <OperationsPanel
        eyebrow="Conclusiones por expediente"
        title="Lecturas más recientes de la IA"
        description="Cada tarjeta diferencia lo declarado por el usuario de la clasificación y recomendación generada por IA."
        help="Expedientes ordenados por fecha de análisis. Cada tarjeta contrasta lo declarado por el usuario con la clasificación y recomendación generada por IA."
      >
        {analyzed.length > 0 ? (
          <>
            <div className="eoc-ai-analysis-list">
              {pagedAnalyzed.map((situation) => (
              <article key={situation.id} data-confidence={confidenceTone(situation.ai.confidence)}>
                <div className="eoc-ai-analysis-list__header">
                  <div className="eoc-ai-analysis-list__identity">
                    <span className="eoc-ai-analysis-list__code">{situation.code}</span>
                    <h4>{situation.title}</h4>
                  </div>
                  <div className="eoc-ai-analysis-list__version">
                    <span>IA v{situation.ai.version}</span>
                    <strong>{formatConfidence(situation.ai.confidence)}</strong>
                  </div>
                </div>
                <dl className="eoc-ai-analysis-list__context">
                  <div>
                    <dt>Coordinación</dt>
                    <dd title={situation.coordinationName}>{situation.coordinationName}</dd>
                  </div>
                  <div>
                    <dt>Responsable</dt>
                    <dd title={situation.createdByUserName}>{situation.createdByUserName}</dd>
                  </div>
                  <div>
                    <dt>Análisis IA</dt>
                    <dd title={formatDateTime(situation.ai.analyzedAt)}>
                      {formatDateTime(situation.ai.analyzedAt)}
                    </dd>
                  </div>
                </dl>
                <div className="eoc-ai-analysis-list__classification">
                  <span>Declarada <SeverityPill severity={situation.severity} /></span>
                  <NovexIcon name="chevron-right" />
                  <span>
                    Clasificada{' '}
                    {situation.ai.classifiedSeverity ? (
                      <SeverityPill severity={situation.ai.classifiedSeverity} />
                    ) : (
                      'Sin dato'
                    )}
                  </span>
                </div>
                <div className="eoc-ai-analysis-list__body">
                  <div>
                    <span>Conclusión IA</span>
                    <strong>{situation.ai.headline || 'Sin titular ejecutivo'}</strong>
                    <p>{situation.ai.summary || 'El análisis no incluyó un resumen narrativo.'}</p>
                  </div>
                  <div>
                    <span>Siguiente paso recomendado</span>
                    <p>{situation.ai.recommendedNextStep || situation.ai.decision || 'Sin siguiente paso registrado.'}</p>
                  </div>
                </div>
                <footer>
                  <span>
                    {situation.ai.versionsCount}{' '}
                    {situation.ai.versionsCount === 1 ? 'versión' : 'versiones'} conservadas
                  </span>
                  <span>
                    {situation.ai.immediateRisksCount} riesgos inmediatos ·{' '}
                    {situation.ai.missingInformationCount} datos faltantes
                  </span>
                  <PanelLink onClick={() => setSelectedSituationId(situation.id)}>
                    Ver análisis completo
                  </PanelLink>
                </footer>
              </article>
              ))}
            </div>
            <OperationsPagination
              page={analysisPage}
              pageSize={ANALYSIS_PAGE_SIZE}
              total={analyzed.length}
              onPageChange={setAnalysisPage}
              label="lecturas"
            />
          </>
        ) : (
          <div className="eoc-inline-empty">No hay análisis IA disponibles todavía.</div>
        )}
      </OperationsPanel>

      {(withoutAnalysis.length > 0 || lowConfidence.length > 0) ? (
        <OperationsPanel
          eyebrow="Control de calidad"
          title="Brechas que requieren revisión humana"
          description="Casos sin análisis o con confianza inferior al 65 %."
          className="eoc-panel--gaps"
          help="Casos sin análisis IA o con confianza inferior al 65 % que conviene revisar manualmente antes de decidir."
        >
          <div className="eoc-gap-list">
            {withoutAnalysis.map((situation) => (
              <button
                key={`without-${situation.id}`}
                type="button"
                onClick={() => setSelectedSituationId(situation.id)}
              >
                <NovexIcon name="alert" />
                <span>
                  <strong>{situation.title}</strong>
                  <small>{situation.code} · {situation.coordinationName}</small>
                </span>
                <em>Sin análisis IA</em>
              </button>
            ))}
            {lowConfidence.map((situation) => (
              <button
                key={`confidence-${situation.id}`}
                type="button"
                onClick={() => setSelectedSituationId(situation.id)}
              >
                <NovexIcon name="help" />
                <span>
                  <strong>{situation.title}</strong>
                  <small>{situation.code} · {situation.coordinationName}</small>
                </span>
                <em>{formatConfidence(situation.ai.confidence)} de confianza</em>
              </button>
            ))}
          </div>
        </OperationsPanel>
      ) : null}

      {selectedSituationId ? (
        <ConnectedSituationDetailModal
          situationId={selectedSituationId}
          title={data.situations.find((item) => item.id === selectedSituationId)?.title}
          onClose={() => setSelectedSituationId(null)}
        />
      ) : null}
    </div>
  )
}
