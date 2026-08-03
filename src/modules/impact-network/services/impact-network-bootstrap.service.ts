import {

  fetchCoordinationGraph,

  fetchCoordinationNetworkStatus,

  type CoordinationNetworkStatusResponse,

} from '@/modules/api/coordinations.api'

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



export async function loadImpactNetworkGraph(): Promise<ImpactNetworkGraphModel> {

  const response = await fetchCoordinationGraph()

  return mapCoordinationGraphToImpactNetwork(response)

}



export async function loadImpactNetworkBootstrap(): Promise<ImpactNetworkBootstrap> {

  const [graphResult, statusResult] = await Promise.allSettled([

    fetchCoordinationGraph(),

    fetchCoordinationNetworkStatus(),

  ])



  if (graphResult.status === 'rejected') {

    throw graphResult.reason

  }



  const graph = mapCoordinationGraphToImpactNetwork(graphResult.value)

  const networkStatus =

    statusResult.status === 'fulfilled'

      ? statusResult.value

      : buildFallbackNetworkStatus(graph.coordinations.length)



  return {

    graph,

    networkStatus,

  }

}


