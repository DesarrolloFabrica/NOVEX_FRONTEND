/**
 * TEMPORAL — Datos mock para la pestaña Red de impacto sin backend conectado.
 *
 * Para conectar el backend:
 * 1. Eliminar este archivo.
 * 2. Quitar el fallback en `ImpactNetworkExperience.tsx` (buscar IMPACT_NETWORK_MOCK_FALLBACK).
 */

import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'

/** Activa el fallback mock cuando la API no devuelve situaciones. */
/**
 * Fixture histórico de eventos. Ya no se usa como fallback de producción.
 */
export const IMPACT_NETWORK_MOCK_FALLBACK_ENABLED = false

/**
 * Catálogo operacional completo de demostración. El selector de la experiencia
 * se encarga de mostrar únicamente las situaciones de la coordinación activa.
 */
export const IMPACT_NETWORK_MOCK_EVENTS: readonly OperationalEvent[] =
  OPERATIONAL_EVENTS
