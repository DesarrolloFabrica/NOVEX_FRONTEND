// Capa: página Legacy — Centro de Monitoreo de compromisos.
// Conservada como referencia hasta finalizar la migración.
// Ruta: /legacy-monitoring (ya no es la experiencia principal).
// Responsabilidad: conectar auth + CommitmentsProvider con MonitoringCenter.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { useCommitments } from '@/modules/commitments/hooks/useCommitments'
import { canApplyAreaValidation } from '@/modules/commitments/utils/commitmentValidation.utils'
import {
  AREAS,
  GLOBAL_AREA,
  OPERATIONAL_AREAS,
} from '@/modules/areas/data/areas.mock'
import { findAreaById } from '@/modules/areas/utils/areas.utils'
import {
  selectAllAreasHealth,
  selectAllOperationalCommitments,
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
    updateCommitmentDraftStatus,
    applyAreaValidation,
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
  // Feedback local mientras se persiste una calificación o aplicación de área.
  const [isUpdating, setIsUpdating] = useState(false)
  const [isApplyingValidation, setIsApplyingValidation] = useState(false)

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

  // Compromiso enfocado: en vista global busca en todos los operativos.
  const selectedCommitment = useMemo(() => {
    if (!selectedCommitmentId) return null

    const pool = isGlobal
      ? selectAllOperationalCommitments(items)
      : areaCommitments

    return pool.find((commitment) => commitment.id === selectedCommitmentId) ?? null
  }, [selectedCommitmentId, isGlobal, items, areaCommitments])

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
      (c) =>
        c.status === 'Pendiente de validación' &&
        (c.draftStatus !== 'Cumplido' && c.draftStatus !== 'Incumplido'),
    )
    if (pending.length === 0) return null
    const [first] = [...pending].sort((a, b) =>
      b.operationalImpact !== a.operationalImpact
        ? b.operationalImpact - a.operationalImpact
        : a.dueDate.localeCompare(b.dueDate),
    )
    return first?.title ?? null
  }, [areaCommitments])

  const canApplyValidation = useMemo(
    () => !isGlobal && canApplyAreaValidation(areaCommitments),
    [isGlobal, areaCommitments],
  )

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

  // Califica el compromiso enfocado en borrador; el área no cambia hasta aplicar.
  const handleValidateCommitment = useCallback(
    async (status: 'Cumplido' | 'Incumplido') => {
      if (!selectedCommitment || !user || !canValidate) return
      const focusedCommitmentId = selectedCommitment.id
      setIsUpdating(true)
      try {
        await updateCommitmentDraftStatus(focusedCommitmentId, status)
        setSelectedCommitmentId(focusedCommitmentId)
      } finally {
        setIsUpdating(false)
      }
    },
    [selectedCommitment, user, canValidate, updateCommitmentDraftStatus],
  )

  const handleApplyAreaValidation = useCallback(async () => {
    if (!user || !canValidate || isGlobal || !canApplyValidation) return
    setIsApplyingValidation(true)
    try {
      await applyAreaValidation(selectedAreaId, {
        id: user.id,
        name: user.name,
      })
    } finally {
      setIsApplyingValidation(false)
    }
  }, [
    user,
    canValidate,
    isGlobal,
    canApplyValidation,
    applyAreaValidation,
    selectedAreaId,
  ])

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
            canApplyValidation={canApplyValidation}
            isApplyingValidation={isApplyingValidation}
            onSelectArea={handleSelectArea}
            onSelectCommitment={handleSelectCommitment}
            onValidateCommitment={handleValidateCommitment}
            onApplyAreaValidation={handleApplyAreaValidation}
            onLogout={() => void logout()}
            onReset={() => void resetCommitments()}
          />
        </MainScreen>
      </OmegaFrame>
    </OmegaRoom>
  )
}
