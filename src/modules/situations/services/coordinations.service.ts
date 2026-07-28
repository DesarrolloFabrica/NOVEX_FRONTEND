import { fetchCoordinations } from '@/modules/api/coordinations.api'

export async function fetchCoordinationsRequest() {
  return fetchCoordinations()
}
