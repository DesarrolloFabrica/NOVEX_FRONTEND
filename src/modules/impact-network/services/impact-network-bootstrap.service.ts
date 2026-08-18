import {

  fetchCoordinationGraph,

  fetchCoordinationNetworkStatus,

  fetchCoordinations,

  type CoordinationNetworkStatusResponse,

} from '@/modules/api/coordinations.api'

import type { CoordinationSummary } from '@/modules/situations/types/situation.types'

import {

  mapCoordinationGraphToImpactNetwork,

  type ImpactNetworkGraphModel,

} from '@/modules/impact-network/services/impact-network-graph.mapper'



export interface ImpactNetworkBootstrap {

  graph: ImpactNetworkGraphModel

  networkStatus: CoordinationNetworkStatusResponse

}



function buildFallbackNetworkStatus(

  coordinationsCount: number,

): CoordinationNetworkStatusResponse {

  return {

    networkStatus: 'stable',

    globalRiskScore: 0,

    activeIncidentsCount: 0,

    coordinationsCount,

    synchronizedCoordinationsCount: coordinationsCount,

    lastSynchronizedAt: new Date().toISOString(),

  }

}



async function loadInstitutionalCatalog(): Promise<CoordinationSummary[]> {

  try {

    return await fetchCoordinations(false, { catalog: true })

  } catch {

    return []

  }

}



export async function loadImpactNetworkGraph(): Promise<ImpactNetworkGraphModel> {

  const [response, catalog] = await Promise.all([

    fetchCoordinationGraph(),

    loadInstitutionalCatalog(),

  ])

  return mapCoordinationGraphToImpactNetwork(response, catalog)

}



export async function loadImpactNetworkBootstrap(
  catalogPromise?: Promise<readonly CoordinationSummary[]>,
): Promise<ImpactNetworkBootstrap> {

  const [graphResult, statusResult, catalogResult] = await Promise.allSettled([

    fetchCoordinationGraph(),

    fetchCoordinationNetworkStatus(),

    catalogPromise ?? fetchCoordinations(false, { catalog: true }),

  ])



  if (graphResult.status === 'rejected') {

    throw graphResult.reason

  }



  const graph = mapCoordinationGraphToImpactNetwork(

    graphResult.value,

    catalogResult.status === 'fulfilled' ? catalogResult.value : [],

  )

  const networkStatus =

    statusResult.status === 'fulfilled'

      ? statusResult.value

      : buildFallbackNetworkStatus(graph.coordinations.length)



  return {

    graph,

    networkStatus,

  }

}


