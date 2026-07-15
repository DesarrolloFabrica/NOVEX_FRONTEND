// Capa: página del Centro de Monitoreo.
// Responsabilidad: ser el "contenedor" que conecta el estado global (auth y
// compromisos) con la presentación (MonitoringCenter). Aquí vive el estado
// LOCAL de la UI (área y compromiso seleccionados) y la DERIVACIÓN de datos
// mediante los selectores. Los componentes hijos solo reciben props ya listas.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useCommitments } from '@/modules/commitments/hooks/useCommitments'
import {
  AREAS,
  GLOBAL_AREA,
  OPERATIONAL_AREAS,
} from '@/modules/areas/data/areas.mock'
import { findAreaById } from '@/modules/areas/utils/areas.utils'
import {
  selectAllAreasHealth,
  selectAreaHealth,
  selectFocusedAreaCommitments,
  selectGlobalAreaHealth,
} from '@/modules/monitoring/selectors/areaHealth.selectors'
import { MonitoringCenter } from '@/modules/monitoring/components/MonitoringCenter'
import { MainScreen, OmegaFrame, OmegaRoom } from '@/modules/room'

export function MonitoringPage() {
  const { user, logout } = useAuth()
  const {
    items,
    loading,
    error,
    loadCommitments,
    resetCommitments,
    updateCommitmentStatus,
  } = useCommitments()

  const isEjecutor = user?.role === 'ejecutor'
  // Caso límite de presentación: un ejecutor sin área operativa asignada.
  const executorWithoutArea = isEjecutor && !user?.selectedAreaId
  // Solo el supervisor valida compromisos; el ejecutor únicamente consulta.
  const canValidate = user?.role === 'supervisor'

  // Estado local de la UI: el supervisor arranca en la Vista General (global);
  // el ejecutor arranca (y queda fijado) en su propia área operativa.
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (isEjecutor && user?.selectedAreaId) return user.selectedAreaId
    return GLOBAL_AREA?.id ?? OPERATIONAL_AREAS[0]?.id ?? ''
  })
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(
    null,
  )
  // Feedback local mientras se persiste una validación (no requiere reducer).
  const [isUpdating, setIsUpdating] = useState(false)

  // Carga inicial de compromisos al entrar a la pantalla.
  useEffect(() => {
    void loadCommitments()
  }, [loadCommitments])

  // Áreas visibles en la franja superior: el ejecutor solo ve su área.
  const visibleAreas = useMemo(
    () =>
      isEjecutor
        ? OPERATIONAL_AREAS.filter((area) => area.id === user?.selectedAreaId)
        : AREAS,
    [isEjecutor, user?.selectedAreaId],
  )

  const selectedArea = useMemo(
    () => findAreaById(AREAS, selectedAreaId),
    [selectedAreaId],
  )
  const isGlobal = selectedArea?.isGlobal === true

  // Salud de cada área visible (para los focos superiores).
  const areaEntries = useMemo(
    () => selectAllAreasHealth(items, visibleAreas),
    [items, visibleAreas],
  )

  // Salud del área enfocada: si es global, agrega todos los compromisos.
  const areaHealth = useMemo(
    () =>
      isGlobal
        ? selectGlobalAreaHealth(items)
        : selectAreaHealth(items, selectedAreaId),
    [isGlobal, items, selectedAreaId],
  )

  // Compromisos a mostrar: global => todas las áreas operativas; si no, filtrado por área.
  const areaCommitments = useMemo(
    () => selectFocusedAreaCommitments(items, selectedArea),
    [items, selectedArea],
  )

  // Compromiso enfocado, derivado del id seleccionado (selección = UI local).
  const selectedCommitment = useMemo(
    () => areaCommitments.find((c) => c.id === selectedCommitmentId) ?? null,
    [areaCommitments, selectedCommitmentId],
  )

  // Inteligencia mínima: conteo de incumplimientos críticos (impacto 5).
  const criticalCount = useMemo(
    () =>
      areaCommitments.filter(
        (c) => c.status === 'Incumplido' && c.operationalImpact === 5,
      ).length,
    [areaCommitments],
  )

  // Compromiso "proyectado": el pendiente de mayor impacto y vencimiento más
  // próximo. Es un dato derivado de presentación (no altera el dominio).
  const projectedTitle = useMemo(() => {
    const pending = areaCommitments.filter(
      (c) => c.status === 'Pendiente de validación',
    )
    if (pending.length === 0) return null
    const [first] = [...pending].sort((a, b) =>
      b.operationalImpact !== a.operationalImpact
        ? b.operationalImpact - a.operationalImpact
        : a.dueDate.localeCompare(b.dueDate),
    )
    return first?.title ?? null
  }, [areaCommitments])

  const handleSelectArea = useCallback(
    (areaId: string) => {
      // El ejecutor no puede enfocar la Vista General (global).
      const target = findAreaById(AREAS, areaId)
      if (isEjecutor && target?.isGlobal) return
      setSelectedAreaId(areaId)
      // Al cambiar de área se limpia el compromiso seleccionado.
      setSelectedCommitmentId(null)
    },
    [isEjecutor],
  )

  const handleSelectCommitment = useCallback((commitmentId: string) => {
    setSelectedCommitmentId(commitmentId)
  }, [])

  // Valida el compromiso enfocado. Se conserva selectedCommitmentId para que el
  // detalle integrado siga mostrando la misma tarea hasta una nueva selección.
  const handleValidateCommitment = useCallback(
    async (status: 'Cumplido' | 'Incumplido') => {
      if (!selectedCommitment || !user) return
      const focusedCommitmentId = selectedCommitment.id
      setIsUpdating(true)
      try {
        await updateCommitmentStatus(focusedCommitmentId, status, {
          id: user.id,
          name: user.name,
        })
        setSelectedCommitmentId(focusedCommitmentId)
      } finally {
        setIsUpdating(false)
      }
    },
    [selectedCommitment, user, updateCommitmentStatus],
  )

  return (
    <OmegaRoom environment={areaHealth.environment}>
      <OmegaFrame environment={areaHealth.environment}>
        <MainScreen environment={areaHealth.environment}>
          <MonitoringCenter
            user={user}
            areaEntries={areaEntries}
            selectedArea={selectedArea}
            selectedAreaId={selectedAreaId}
            areaHealth={areaHealth}
            isGlobal={isGlobal}
            areaCommitments={areaCommitments}
            selectedCommitment={selectedCommitment}
            selectedCommitmentId={selectedCommitmentId}
            loading={loading}
            error={error}
            executorWithoutArea={executorWithoutArea}
            criticalCount={criticalCount}
            projectedTitle={projectedTitle}
            canValidate={canValidate}
            isUpdating={isUpdating}
            onSelectArea={handleSelectArea}
            onSelectCommitment={handleSelectCommitment}
            onValidateCommitment={handleValidateCommitment}
            onLogout={() => void logout()}
            onReset={() => void resetCommitments()}
          />
        </MainScreen>
      </OmegaFrame>
    </OmegaRoom>
  )
}
