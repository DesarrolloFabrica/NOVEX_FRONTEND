import { describe, expect, it } from 'vitest'
import {
  STATUS_BOARD_MIN_ZOOM,
  clampStatusBoardPan,
  getStatusBoardFitZoom,
} from '@/modules/impact-network/hooks/useStatusBoardViewport'

describe('status board viewport', () => {
  it('ajusta el lienzo completo al espacio disponible', () => {
    expect(
      getStatusBoardFitZoom(
        { width: 1_200, height: 620 },
        { width: 1_100, height: 700 },
      ),
    ).toBeCloseTo(596 / 700, 5)
  })

  it('conserva un mínimo legible cuando el contenido es muy ancho', () => {
    expect(
      getStatusBoardFitZoom(
        { width: 720, height: 480 },
        { width: 2_400, height: 500 },
      ),
    ).toBe(STATUS_BOARD_MIN_ZOOM)
  })

  it('conserva margen de desplazamiento aun con el contenido ajustado', () => {
    expect(
      clampStatusBoardPan(
        { x: 200, y: -200, zoom: 0.8 },
        { width: 1_000, height: 600 },
        { width: 1_000, height: 600 },
      ),
    ).toEqual({ x: 112, y: -72, zoom: 0.8 })

    expect(
      clampStatusBoardPan(
        { x: 900, y: -900, zoom: 1.4 },
        { width: 1_000, height: 600 },
        { width: 1_200, height: 800 },
      ),
    ).toEqual({ x: 452, y: -332, zoom: 1.4 })
  })
})
