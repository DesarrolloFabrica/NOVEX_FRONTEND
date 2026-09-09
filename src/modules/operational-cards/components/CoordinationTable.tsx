import type { CSSProperties } from 'react'
import { CoordinationDeckStack } from '@/modules/operational-cards/components/CoordinationDeckStack'
import {
  resolveTableYield,
  type TableLayout,
} from '@/modules/operational-cards/data/tableLayout'
import type { ProductTableNode } from '@/modules/operational-cards/data/productHierarchy'

/**
 * Mesa operacional en reposo: los nueve nodos de producto, en un solo arco.
 *
 * Cada nodo es un mazo (`CoordinationDeckStack`), tenga o no subordinaciones:
 * uno plano es sencillamente un mazo de cero hijas. Las subordinaciones NO
 * aparecen como nodos principales; solo existen asomando dentro de su padre.
 *
 * Este componente NO calcula geometría: solo traduce el layout a variables CSS.
 * Toda la posición viene de `buildTableLayout`, y el único transform de
 * posición del nodo es el de `.operational-table__slot`. El mazo y la carta
 * aplican los suyos en nodos interiores, así que las capas no compiten.
 *
 * El orden del DOM es el orden de PRODUCTO aunque la geometría sea curva: el
 * tabulador recorre los nueve nodos como los enumera el organigrama.
 */

export interface CoordinationTableProps {
  layout: TableLayout
  /** Nodos de producto, indexados por el `code` de su fila técnica. */
  nodesByCode: Readonly<Record<string, ProductTableNode>>
  /**
   * Coordinación bajo el puntero o el foco. Solo se usa para que la mesa CEDA
   * cuando la señalada tiene subordinaciones: la apertura de la subbaraja en sí
   * la resuelve el CSS, sin estado.
   */
  hoveredCode?: string | null
  onSelect: (code: string) => void
  onHoverChange: (code: string | null) => void
}

export function CoordinationTable({
  layout,
  nodesByCode,
  hoveredCode,
  onSelect,
  onHoverChange,
}: CoordinationTableProps) {
  /*
   * La mesa solo cede ante un mazo que se abre. Señalar una coordinación plana
   * —B2B, Saber Pro, Servicio— no mueve nada: no hay nada que necesite sitio.
   */
  const openIndex =
    hoveredCode && (nodesByCode[hoveredCode]?.children.length ?? 0) > 0
      ? layout.slots.findIndex((slot) => slot.coordination.code === hoveredCode)
      : -1

  return (
    <div
      className="operational-table"
      data-testid="coordination-table"
      data-count={layout.slots.length}
      data-overlap={layout.overlap}
      style={
        {
          '--table-stage-h': layout.stageHeight,
          '--table-stage-w': layout.stageWidth,
        } as CSSProperties
      }
    >
      {layout.slots.map((slot, index) => {
        const node = nodesByCode[slot.coordination.code]
        if (!node) return null

        // Cesión contextual: solo eje Y, y solo mientras dura el hover. Ni la
        // x, ni la rotación, ni el orden se tocan nunca.
        const yieldPx =
          openIndex >= 0 && index !== openIndex
            ? resolveTableYield(Math.abs(index - openIndex))
            : 0

        return (
          <div
            key={slot.coordination.code}
            className="operational-table__slot"
            data-testid="coordination-table-slot"
            data-arc={slot.arc}
            data-arc-index={slot.indexInArc}
            // El z va como variable, no como `zIndex` en línea: un estilo en
            // línea gana siempre a la hoja, y la regla que eleva la carta
            // enfocada no podría sobrescribirlo sin recurrir a `!important`.
            style={
              {
                '--x': slot.x,
                '--y': slot.y,
                '--rot': slot.rotation,
                '--z': slot.zIndex,
                '--yield': yieldPx,
              } as CSSProperties
            }
            data-yield={yieldPx}
          >
            <CoordinationDeckStack
              coordination={node.coordination}
              label={node.label}
              artCode={node.artCode}
              subordinations={node.children}
              onSelect={onSelect}
              onHoverChange={onHoverChange}
            />
          </div>
        )
      })}
    </div>
  )
}
