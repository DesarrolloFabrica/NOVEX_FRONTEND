import { useMemo } from 'react'
import { resolveCoordinationVisualIdentity } from '@/modules/operational-cards/data/coordinationVisualIdentity'
import { useOperationalOverview } from '@/modules/operational-cards/hooks/useOperationalOverview'
import type { OperationalIntegrityStatus } from '@/modules/operational-cards/types/operational-status.types'

/**
 * ANDAMIO DE FASE 4 — no es el diseño final.
 *
 * Verifica de extremo a extremo la cadena ruta -> API -> estado -> contrato ->
 * 15 coordinaciones con datos reales. La lista técnica de coordinaciones que
 * se renderiza aquí es el precursor de `CoordinationCardArc` (fase 5) y está
 * pensada para ser SUSTITUIDA, no ampliada: sin cartas, sin arco, sin aura,
 * sin personaje, sin animación y sin CSS propio.
 */

const STATUS_LABEL: Record<OperationalIntegrityStatus, string> = {
  ESTABLE: 'Estable',
  ALERTA: 'Alerta',
  CRITICO: 'Crítico',
  DESCONOCIDO: 'Desconocido',
}

export function OperationalCardExperience() {
  const { level0, overview, errorMessage } = useOperationalOverview()

  // La identidad visual se compone desde la propia fila del overview, por
  // `code` y nunca por UUID. No se muta el catálogo runtime global ni se pide
  // nada más: LEVEL 0 es la autoridad sobre qué coordinaciones existen.
  const rows = useMemo(() => {
    if (!overview) return []

    return overview.coordinations.map((coordination) => ({
      coordination,
      identity: resolveCoordinationVisualIdentity(coordination),
    }))
  }, [overview])

  // Guarda de coherencia del join: el code debe sobrevivir la composición y
  // ningún asset puede quedar vacío. No se fabrica identidad para taparlo.
  const inconsistentRows = rows.filter(
    ({ coordination, identity }) =>
      identity.code !== coordination.code ||
      identity.uuid !== coordination.id ||
      identity.iconAsset === '' ||
      identity.islandAsset === '',
  )

  // Un fallo de red, HTTP, parseo o contrato se comunica como DESCONOCIDO.
  // Nunca como ESTABLE, y nunca con totales sintéticos en cero.
  const directionStatus: OperationalIntegrityStatus =
    level0 === 'ready' && overview ? overview.directionStatus : 'DESCONOCIDO'

  return (
    <section
      className="operational-cards-scaffold"
      data-testid="operational-cards-experience"
      aria-labelledby="operational-cards-title"
    >
      <header>
        <p>Dirección de Operaciones</p>
        <h1 id="operational-cards-title">Estado operacional</h1>
      </header>

      {level0 === 'loading' && (
        <p data-testid="operational-cards-loading">Cargando estado operacional…</p>
      )}

      {level0 === 'error' && (
        <p data-testid="operational-cards-error" role="alert">
          No se pudo obtener el estado operacional. Estado:{' '}
          {STATUS_LABEL.DESCONOCIDO}. {errorMessage}
        </p>
      )}

      <p>
        Estado global:{' '}
        <strong data-testid="direction-status" data-status={directionStatus}>
          {STATUS_LABEL[directionStatus]}
        </strong>
      </p>

      {level0 === 'ready' && overview && (
        <>
          <p data-testid="coordinations-count">
            Coordinaciones recibidas: {overview.coordinations.length}
          </p>
          <p data-testid="overview-totals">
            Críticas {overview.totals.critical} · En alerta{' '}
            {overview.totals.alert} · Estables {overview.totals.stable}
          </p>
          <p data-testid="overview-generated-at">
            Generado: {overview.generatedAt}
          </p>

          {/* Precursor de CoordinationCardArc (fase 5). Sustituir, no ampliar. */}
          <ul data-testid="coordination-scaffold-list">
            {rows.map(({ coordination, identity }) => (
              <li
                key={coordination.code}
                data-testid="coordination-scaffold-item"
                data-code={coordination.code}
                data-status={coordination.status}
                data-identity={
                  identity.code === coordination.code ? 'resolved' : 'unresolved'
                }
                data-icon={identity.iconAsset}
              >
                {coordination.shortName} — {STATUS_LABEL[coordination.status]}
              </li>
            ))}
          </ul>

          {inconsistentRows.length > 0 && (
            <p data-testid="identity-inconsistency" role="alert">
              Inconsistencia de identidad: {inconsistentRows.length}{' '}
              coordinaciones con identidad visual incoherente (
              {inconsistentRows.map((row) => row.coordination.code).join(', ')}
              ).
            </p>
          )}

          {/* Registro de analista: sin problemas activos no se muestra nada.
              Con problemas, marcador textual PROVISIONAL. No es carta ni
              coordinación 16; el control definitivo llega en otra fase. */}
          {overview.analystRegistry.activeProblemsCount > 0 && (
            <p data-testid="analyst-registry-placeholder">
              Registro de analista —{' '}
              {overview.analystRegistry.activeProblemsCount} problemas activos
              (provisional)
            </p>
          )}
        </>
      )}
    </section>
  )
}
