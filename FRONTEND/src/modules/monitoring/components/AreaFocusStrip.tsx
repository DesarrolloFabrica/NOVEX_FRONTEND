// Componente: selector compacto de Módulos Operativos (Sprint 11.1–11.6).
// Solo cambio de contexto — la información vive en la Consola Central.

import type { AreaHealthEntry } from '@/modules/monitoring/selectors/areaHealth.selectors'
import { AreaModuleMonogram } from '@/modules/monitoring/components/AreaModuleIdentity'
import {
  CrystalStationHeaderBracket,
  CrystalStructuralRule,
} from '@/modules/monitoring/components/CrystalStructure'
import { getAreaModuleIdentity } from '@/modules/monitoring/constants/areaIdentity'
import {
  getModuleSelectorActive,
  MODULE_SELECTOR_BUTTON,
  MODULE_SELECTOR_IDLE_ICON,
  MODULE_SELECTOR_IDLE_ICON_GLOBAL,
  MODULE_SELECTOR_IDLE_NAME,
  MODULE_SELECTOR_IDLE_SURFACE,
  MODULE_SELECTOR_ROW,
  MODULE_SELECTOR_STRIP,
} from '@/modules/monitoring/constants/moduleSelectorTheme'
import { CRYSTAL_STATION_TITLE, FOCUS_VISIBLE } from '@/modules/monitoring/constants/monitoringTheme'
import { MODULE_STATION_TITLE } from '@/modules/monitoring/constants/visualHierarchy'

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
  return (
    <section className={`omega-module-strip ${MODULE_SELECTOR_STRIP}`}>
      <h2
        className={`mb-1 flex items-center gap-2 px-4 sm:px-5 lg:px-6 ${CRYSTAL_STATION_TITLE} ${MODULE_STATION_TITLE}`}
      >
        <CrystalStationHeaderBracket />
        Módulos operativos
      </h2>

      <CrystalStructuralRule />

      <div className={`omega-module-row ${MODULE_SELECTOR_ROW} overflow-x-auto`}>
        {entries.map(({ area, health }) => {
          const isSelected = area.id === selectedAreaId
          const isGlobal = area.isGlobal === true
          const identity = getAreaModuleIdentity(area.id, area.code)
          const active = getModuleSelectorActive(health.environment)

          const surfaceClass = isSelected
            ? `${active.surface} ${active.glow}`
            : MODULE_SELECTOR_IDLE_SURFACE

          const iconClass = isSelected
            ? isGlobal
              ? active.iconGlobal
              : active.icon
            : isGlobal
              ? MODULE_SELECTOR_IDLE_ICON_GLOBAL
              : MODULE_SELECTOR_IDLE_ICON

          const nameClass = isSelected ? active.name : MODULE_SELECTOR_IDLE_NAME

          return (
            <button
              key={area.id}
              type="button"
              onClick={() => onSelectArea(area.id)}
              aria-pressed={isSelected}
              aria-label={area.name}
              className={`omega-module-button omega-operation-station ${MODULE_SELECTOR_BUTTON} ${FOCUS_VISIBLE} ${surfaceClass}`}
            >
              <AreaModuleMonogram
                monogram={identity.monogram}
                glyph={identity.glyph}
                isGlobal={isGlobal}
                size="selector"
                className={`omega-operation-station__identifier ${iconClass}`}
              />

              <p className={`omega-operation-station__name ${nameClass}`}>
                {area.name}
              </p>
              <span
                className="omega-operation-station__signal"
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </section>
  )
}
