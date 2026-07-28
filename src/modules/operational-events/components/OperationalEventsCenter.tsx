// Componente: orquestador del Centro de Situaciones.

// Objetivo único: encontrar y abrir una situación.



import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isValidUuid } from '@/shared/utils/uuid'

import { MonitoringLayout } from '@/modules/monitoring/components/MonitoringLayout'

import { ConnectedSituationDetailModal } from '@/modules/operational-events/components/ConnectedSituationDetailModal'

import {

  DEFAULT_SITUATION_REGISTRY_QUERY,

  SituationsRegistryConsole,

} from '@/modules/operational-events/components/registry/SituationsRegistryConsole'

import { useSituationRegistry } from '@/modules/operational-events/hooks/useSituationRegistry'

import type { SituationRegistryQuery } from '@/modules/operational-events/utils/situationRegistryQuery'

import type { OperationalEnvironmentStatus } from '@/modules/operational-events/types/operational-event.types'

import type { SituationRegistrySummary } from '@/modules/api/types/situation-registry.types'



interface OperationalEventsCenterProps {

  onEnvironmentChange?: (environment: OperationalEnvironmentStatus) => void

}



function resolveEnvironment(summary: SituationRegistrySummary): OperationalEnvironmentStatus {

  if (summary.openSituations === 0 && summary.closedSituations === 0) {

    return 'pending'

  }

  if (summary.criticalSituations > 0) return 'critical'

  if (summary.openSituations >= 4) return 'attention'

  if (summary.openSituations > 0) return 'attention'

  return 'healthy'

}



export function OperationalEventsCenter({

  onEnvironmentChange,

}: OperationalEventsCenterProps) {

  const {

    rows,

    summary,

    indicators,

    categories,

    coordinations,

    loading,

    error,

  } = useSituationRegistry()



  const [searchParams, setSearchParams] = useSearchParams()

  const [query, setQuery] = useState<SituationRegistryQuery>(

    DEFAULT_SITUATION_REGISTRY_QUERY,

  )

  const [selectedSituationId, setSelectedSituationId] = useState<string | null>(

    null,

  )



  useEffect(() => {
    const situationId = searchParams.get('situation')

    if (!situationId) {
      setSelectedSituationId(null)
      return
    }

    if (!isValidUuid(situationId)) {
      const next = new URLSearchParams(searchParams)
      next.delete('situation')
      setSearchParams(next, { replace: true })
      setSelectedSituationId(null)
      return
    }

    if (loading) return

    const exists = rows.some((row) => row.id === situationId)
    if (!exists) {
      const next = new URLSearchParams(searchParams)
      next.delete('situation')
      setSearchParams(next, { replace: true })
      setSelectedSituationId(null)
      return
    }

    setSelectedSituationId(situationId)
  }, [loading, rows, searchParams, setSearchParams])



  const environment = useMemo(() => resolveEnvironment(summary), [summary])



  useEffect(() => {

    onEnvironmentChange?.(environment)

  }, [environment, onEnvironmentChange])



  const handleSelectSituation = useCallback(

    (situationId: string) => {

      setSelectedSituationId(situationId)

      const next = new URLSearchParams(searchParams)

      next.set('situation', situationId)

      next.delete('event')

      setSearchParams(next, { replace: true })

    },

    [searchParams, setSearchParams],

  )



  const handleCloseDetail = useCallback(() => {

    setSelectedSituationId(null)

    const next = new URLSearchParams(searchParams)

    next.delete('situation')

    next.delete('event')

    setSearchParams(next, { replace: true })

  }, [searchParams, setSearchParams])



  return (

    <div className="cunmark-events-center cunmark-events-center--feed flex min-h-0 flex-1 flex-col overflow-hidden">

      <MonitoringLayout

        main={

          <SituationsRegistryConsole

            rows={rows}

            summary={summary}

            indicators={indicators}

            categories={categories}

            coordinations={coordinations}

            selectedSituationId={selectedSituationId}

            loading={loading}

            error={error}

            query={query}

            onQueryChange={setQuery}

            onSelectSituation={handleSelectSituation}

          />

        }

      />



      {selectedSituationId ? (

        <ConnectedSituationDetailModal

          situationId={selectedSituationId}

          onClose={handleCloseDetail}

        />

      ) : null}

    </div>

  )

}


