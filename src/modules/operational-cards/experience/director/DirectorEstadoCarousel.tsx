import type { KeyboardEvent, ReactNode } from "react";
import "@/styles/director-kpi-panel.css";

export type EstadoCarouselPage = {
  id: string;
  /** Nombre accesible de la lámina («Carga y movimiento»…). */
  label: string;
  content: ReactNode;
};

/**
 * Láminas analíticas de ESTADO, una al lado de otra en un track horizontal.
 * Es NAVEGACIÓN ANALÍTICA, no un filtro: no toca el AnalysisPeriod (la
 * navegación temporal vive dentro de las gráficas).
 *
 * - Todas las páginas están montadas y con ancho real (`flex: 0 0 100%`):
 *   ECharts nunca mide un contenedor oculto ni de ancho 0. El track se
 *   desplaza con `transform`, que no cambia el tamaño de nadie.
 * - Las láminas no visibles son `inert`: ni foco ni lector de pantalla.
 * - N páginas: nada asume que sean dos.
 * - La página la controla el padre (persiste entre periodo, coordinación y tab).
 * - `testIdPrefix` / `ariaLabel`: otra lectura (INTERNOS) reutiliza el
 *   carrusel sin chocar con los testids de ESTADO; los defaults son los de
 *   ESTADO.
 */
export function DirectorEstadoCarousel({
  pages,
  page,
  onPageChange,
  testIdPrefix = "director-estado",
  ariaLabel = "Gráficas de estado",
}: {
  pages: readonly EstadoCarouselPage[];
  page: number;
  onPageChange: (page: number) => void;
  testIdPrefix?: string;
  ariaLabel?: string;
}) {
  const last = Math.max(0, pages.length - 1);
  const current = Math.min(Math.max(page, 0), last);
  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 0), last);
    if (clamped !== current) onPageChange(clamped);
  };

  // Flechas solo con el foco DENTRO del carrusel y fuera de controles que
  // puedan usarlas; nunca captura global.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const target = event.target as HTMLElement;
    if (target.closest('input, select, textarea, [role="slider"]')) return;
    event.preventDefault();
    go(current + (event.key === "ArrowRight" ? 1 : -1));
  };

  return (
    <div
      className="director-estado-carousel"
      data-testid={`${testIdPrefix}-carousel`}
      data-page={current}
      data-pages={pages.length}
      role="region"
      aria-roledescription="carrusel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="director-estado-carousel__nav"
        data-side="prev"
        data-testid={`${testIdPrefix}-carousel-prev`}
        aria-label="Gráficas anteriores"
        disabled={current === 0}
        onClick={() => go(current - 1)}
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div className="director-estado-carousel__viewport">
        <div
          className="director-estado-carousel__track"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {pages.map((item, index) => (
            <section
              key={item.id}
              className="director-estado-carousel__page"
              data-testid={`${testIdPrefix}-page-${item.id}`}
              data-active={index === current ? "true" : "false"}
              aria-roledescription="lámina"
              aria-label={`${item.label} (${index + 1} de ${pages.length})`}
              aria-hidden={index === current ? undefined : true}
              inert={index !== current}
            >
              {item.content}
            </section>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="director-estado-carousel__nav"
        data-side="next"
        data-testid={`${testIdPrefix}-carousel-next`}
        aria-label="Gráficas siguientes"
        disabled={current === last}
        onClick={() => go(current + 1)}
      >
        <span aria-hidden="true">›</span>
      </button>

      {pages.length > 1 ? (
        <div className="director-estado-carousel__dots">
          {pages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="director-estado-carousel__dot"
              data-testid={`${testIdPrefix}-carousel-dot-${index}`}
              data-active={index === current ? "true" : "false"}
              aria-label={`Ver ${item.label.toLowerCase()}`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => go(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
