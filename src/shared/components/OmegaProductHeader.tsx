// Cabecera institucional del Centro de Inteligencia Operacional.
// Solo presentación — no altera rutas ni autenticación.

import { OmegaProductNav } from '@/shared/components/OmegaProductNav'

interface OmegaProductHeaderProps {
  title: string
}

export function OmegaProductHeader({ title }: OmegaProductHeaderProps) {
  return (
    <header className="omega-product-chrome">
      <div className="omega-product-chrome__brand">
        <span className="omega-product-chrome__mark" aria-hidden="true">
          <img src="/capas/Logoprovisional.png" alt="" draggable={false} />
        </span>
        <div className="omega-product-chrome__identity">
          <p className="omega-product-chrome__name">O.M.E.G.A.</p>
          <p className="omega-product-chrome__station">{title}</p>
        </div>
      </div>
      <OmegaProductNav />
    </header>
  )
}
