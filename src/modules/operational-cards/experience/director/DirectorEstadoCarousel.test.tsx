// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DirectorEstadoCarousel,
  type EstadoCarouselPage,
} from "@/modules/operational-cards/experience/director/DirectorEstadoCarousel";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const page = (id: string, label: string): EstadoCarouselPage => ({
  id,
  label,
  content: <p data-testid={`content-${id}`}>{label}</p>,
});

function Harness({ pages }: { pages: EstadoCarouselPage[] }) {
  const [current, setCurrent] = useState(0);
  return (
    <DirectorEstadoCarousel
      pages={pages}
      page={current}
      onPageChange={setCurrent}
    />
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const q = (testId: string) =>
  container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)!;
const carousel = () => q("director-estado-carousel");
const prev = () => q("director-estado-carousel-prev") as HTMLButtonElement;
const next = () => q("director-estado-carousel-next") as HTMLButtonElement;
const click = (el: HTMLElement) =>
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
const key = (target: HTMLElement, value: string) =>
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: value, bubbles: true }),
    );
  });

const TWO = [
  page("operacion", "Carga y movimiento"),
  page("composicion", "Severidad y atención"),
];

describe("DirectorEstadoCarousel", () => {
  it("página 0 por defecto; ‹ deshabilitado y › habilitado", () => {
    act(() => root.render(<Harness pages={TWO} />));
    expect(carousel().dataset.page).toBe("0");
    expect(prev().disabled).toBe(true);
    expect(next().disabled).toBe(false);
  });

  it("› lleva a la página 1 (› deshabilitado); ‹ vuelve a la 0", () => {
    act(() => root.render(<Harness pages={TWO} />));
    click(next());
    expect(carousel().dataset.page).toBe("1");
    expect(next().disabled).toBe(true);
    expect(prev().disabled).toBe(false);
    click(prev());
    expect(carousel().dataset.page).toBe("0");
  });

  it("todas las láminas montadas con su contenido; las no visibles inertes", () => {
    act(() => root.render(<Harness pages={TWO} />));
    // Montadas siempre: ECharts conserva sus dimensiones reales.
    expect(q("content-operacion")).not.toBeNull();
    expect(q("content-composicion")).not.toBeNull();
    const hidden = q("director-estado-page-composicion");
    expect(hidden.hasAttribute("inert")).toBe(true);
    expect(hidden.getAttribute("aria-hidden")).toBe("true");
    expect(q("director-estado-page-operacion").hasAttribute("inert")).toBe(
      false,
    );
  });

  it("desplaza el track con transform (sin display:none ni scroll)", () => {
    act(() => root.render(<Harness pages={TWO} />));
    const track = container.querySelector<HTMLElement>(
      ".director-estado-carousel__track",
    )!;
    expect(track.style.transform).toBe("translateX(-0%)");
    click(next());
    expect(track.style.transform).toBe("translateX(-100%)");
  });

  it("botones reales con aria-label; indicadores con aria-current", () => {
    act(() => root.render(<Harness pages={TWO} />));
    expect(prev().getAttribute("aria-label")).toBe("Gráficas anteriores");
    expect(next().getAttribute("aria-label")).toBe("Gráficas siguientes");
    expect(
      q("director-estado-carousel-dot-0").getAttribute("aria-current"),
    ).toBe("true");
    click(q("director-estado-carousel-dot-1"));
    expect(carousel().dataset.page).toBe("1");
    expect(
      q("director-estado-carousel-dot-1").getAttribute("aria-current"),
    ).toBe("true");
  });

  it("flechas con foco dentro del carrusel; nunca pasa de los extremos", () => {
    act(() => root.render(<Harness pages={TWO} />));
    key(next(), "ArrowLeft");
    expect(carousel().dataset.page).toBe("0");
    key(next(), "ArrowRight");
    expect(carousel().dataset.page).toBe("1");
    key(prev(), "ArrowRight");
    expect(carousel().dataset.page).toBe("1");
  });

  it("escala a N páginas sin lógica fija de dos", () => {
    const three = [...TWO, page("antiguedad", "Antigüedad y relaciones")];
    act(() => root.render(<Harness pages={three} />));
    click(next());
    click(next());
    expect(carousel().dataset.page).toBe("2");
    expect(carousel().dataset.pages).toBe("3");
    expect(next().disabled).toBe(true);
    expect(
      container.querySelectorAll(".director-estado-carousel__dot"),
    ).toHaveLength(3);
  });

  it("una página fuera de rango se acota a la última existente", () => {
    act(() =>
      root.render(
        <DirectorEstadoCarousel
          pages={TWO}
          page={5}
          onPageChange={() => undefined}
        />,
      ),
    );
    expect(carousel().dataset.page).toBe("1");
  });
});
