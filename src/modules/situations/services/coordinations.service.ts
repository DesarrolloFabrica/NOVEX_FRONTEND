import { fetchCoordinations } from '@/modules/api/coordinations.api'

export async function fetchCoordinationsRequest(catalog = false) {
  return fetchCoordinations(false, { catalog })
}
