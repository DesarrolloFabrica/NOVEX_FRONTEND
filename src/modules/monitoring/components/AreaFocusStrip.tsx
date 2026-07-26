// Componente: selector compacto de Módulos Operativos (Sprint 11.1–11.6).
// Solo cambio de contexto — la información vive en la Consola Central.

import type { AreaHealthEntry } from '@/modules/monitoring/selectors/areaHealth.selectors'
import { CRYSTAL_STATION_TITLE, FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { MODULE_STATION_TITLE } from '@/modules/monitoring/constants/visualHierarchy'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface AreaFocusStripProps {
  entries: AreaHealthEntry[]
  selectedAreaId: string
  onSelectArea: (areaId: string) => void
}

export function AreaFocusStrip({
  entries,
  selectedAreaId,
  onSelectArea,
}: AreaFocusStripProps) {
  const selectedEntry = entries.find(({ area }) => area.id === selectedAreaId)

  return (
    <section className="omega-module-strip">
      <div className="omega-module-strip__header px-4 sm:px-5 lg:px-6">
        <div className="min-w-0">
          <h2
            className={`mb-1 ${CRYSTAL_STATION_TITLE} ${MODULE_STATION_TITLE}`}
          >
            Áreas
          </h2>
          <p className="omega-section-hint mb-0">
            Seleccione el área operativa que va a revisar.
          </p>
        </div>
        <span className="omega-help-tip" tabIndex={0} aria-label="Ayuda sobre selección de área">
          <OmegaIcon name="help" size={15} />
          <span role="tooltip">
            Cambie de área para ver sus compromisos, validar pendientes y revisar su salud operativa.
          </span>
        </span>
      </div>

      <div className="omega-area-select-panel px-4 sm:px-5 lg:px-6">
        {selectedEntry ? (
          <label className="omega-area-select-panel__identity">
            <div className="min-w-0">
              <strong>{selectedEntry.area.name}</strong>
              <span>{selectedEntry.area.code} · Área operativa</span>
            </div>
            <OmegaIcon name="chevron-down" size={18} />
            <select
              value={selectedAreaId}
              aria-label="Área a revisar"
              onChange={(event) => onSelectArea(event.target.value)}
              className={FOCUS_VISIBLE}
            >
              {entries.map(({ area, health }) => (
                <option key={area.id} value={area.id}>
                  {area.code} · {area.name} · {health.environment}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </section>
  )
}
