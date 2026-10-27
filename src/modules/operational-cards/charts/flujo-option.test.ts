import { describe, expect, it } from "vitest";
import {
  buildFlujoOption,
  buildMovimientoOption,
  flujoAxisTick,
  flujoLabeledIndexes,
  flujoScale,
  temporalAxes,
} from "@/modules/operational-cards/charts/flujo-option";
import {
  flujoTooltipHtml,
  movimientoTooltipHtml,
  topRows,
} from "@/modules/operational-cards/charts/flujo-tooltip";
import type { OperationalKpiFlowBucket } from "@/modules/operational-cards/types/operational-kpi.types";

type SeriesLike = {
  name: string;
  stack?: string;
  xAxisIndex?: number;
  data: Array<number | null | { value: number | null }>;
  itemStyle?: { decal?: unknown };
  label?: {
    formatter?: (p: { dataIndex: number; value?: number | null }) => string;
  };
};

function bucket(
  start: string,
  overrides: Partial<OperationalKpiFlowBucket> = {},
): OperationalKpiFlowBucket {
  return {
    start,
    end: start,
    dataEnd: start,
    calendarStart: start,
    calendarEnd: start,
    label: start,
    current: false,
    future: false,
    created: 0,
    closed: 0,
    backlog: 0,
    active: {
      total: 12,
      internal: 7,
      external: 5,
      internalBreakdown: [
        {
          categoryId: "c1",
          categoryCode: "internet",
          categoryName: "Internet",
          selectable: true,
          count: 3,
        },
        {
          categoryId: "c2",
          categoryCode: "acas",
          categoryName: "ACAS",
          selectable: true,
          count: 2,
        },
        {
          categoryId: "c3",
          categoryCode: "apps",
          categoryName: "Aplicativos",
          selectable: true,
          count: 1,
        },
        {
          categoryId: "c4",
          categoryCode: "infra",
          categoryName: "Infraestructura",
          selectable: true,
          count: 1,
        },
      ],
      externalBreakdown: [
        {
          coordinationId: "k1",
          coordinationCode: "coord-saber-pro",
          coordinationName: "Saber Pro",
          count: 2,
        },
        {
          coordinationId: "k2",
          coordinationCode: "coord-servicios",
          coordinationName: "Servicios",
          count: 2,
        },
        {
          coordinationId: "k3",
          coordinationCode: "coord-esp",
          coordinationName: "Especializaciones",
          count: 1,
        },
      ],
    },
    solved: { total: 4 },
    ...overrides,
  };
}

const FUTURE = bucket("2026-11-01", {
  future: true,
  dataEnd: null,
  active: null,
  solved: null,
  created: null,
  closed: null,
  backlog: null,
});

function series(buckets: OperationalKpiFlowBucket[], build = buildFlujoOption) {
  const option = build(buckets, "month") as { series: SeriesLike[] };
  const byName = (name: string) => option.series.find((s) => s.name === name)!;
  const values = (s: SeriesLike) =>
    s.data.map((d) => (d !== null && typeof d === "object" ? d.value : d));
  return { option, byName, values };
}

describe("buildFlujoOption · CARGA = LÍNEA del total de activos (stock)", () => {
  type LinePoint = {
    value: number;
    symbolSize?: number;
    label?: { show?: boolean };
  } | null;
  const line = (buckets: OperationalKpiFlowBucket[]) =>
    series(buckets).byName("Activos") as unknown as {
      type: string;
      smooth: boolean;
      connectNulls: boolean;
      areaStyle?: unknown;
      data: LinePoint[];
    };

  it("banda (serie 0) + una sola línea «Activos»: sin internos/externos como series", () => {
    const { option } = series([bucket("2026-10-01")]);
    expect(option.series.map((s) => s.name)).toEqual(["__banda", "Activos"]);
    const activos = line([bucket("2026-10-01")]);
    expect(activos.type).toBe("line");
    // Snapshots discretos: tramos rectos, sin spline.
    expect(activos.smooth).toBe(false);
    expect(activos.areaStyle).toBeTruthy();
  });

  it("valor = active.total; futuro null (la línea termina, nunca baja a 0)", () => {
    const activos = line([
      bucket("2026-09-01", { active: { ...bucket("x").active!, total: 9 } }),
      bucket("2026-10-01"),
      FUTURE,
    ]);
    expect(activos.data.map((p) => p?.value ?? null)).toEqual([9, 12, null]);
    expect(activos.connectNulls).toBe(false);
  });

  it("eje Y desde 0 (cantidad absoluta, sin truncar)", () => {
    const { option } = series([bucket("2026-10-01")]);
    const y = (option as unknown as { yAxis: { min: number } }).yAxis;
    expect(y.min).toBe(0);
  });

  it("punto actual con más presencia; con ≤ 8 puntos TODOS llevan su cifra (futuro no)", () => {
    const peak = bucket("2026-08-01", {
      active: { ...bucket("x").active!, total: 20 },
    });
    const mid = bucket("2026-09-01", {
      active: { ...bucket("x").active!, total: 15 },
    });
    const now = bucket("2026-10-01", { current: true });
    const activos = line([
      bucket("2026-07-01", { active: { ...bucket("x").active!, total: 8 } }),
      peak,
      mid,
      now,
      FUTURE,
    ]);
    expect(activos.data[3]?.symbolSize).toBe(10);
    expect(activos.data[0]?.symbolSize).toBeUndefined();
    expect(activos.data.map((p) => Boolean(p?.label?.show))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
  });

  it("con más de 8 puntos vuelve a rotular solo último y máximo", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      bucket(`2026-10-${String(i + 1).padStart(2, "0")}`, {
        active: { ...bucket("x").active!, total: i === 2 ? 30 : 5 },
      }),
    );
    const activos = line(many);
    const shown = activos.data.flatMap((p, i) => (p?.label?.show ? [i] : []));
    expect(shown).toEqual([2, 8]);
  });

  it("flujoLabeledIndexes: último con dato + máximo; vacío sin datos", () => {
    expect([...flujoLabeledIndexes([3, 7, 5, null])].sort()).toEqual([1, 2]);
    expect([...flujoLabeledIndexes([null, null])]).toEqual([]);
  });

  it("la banda vive en un eje X gemelo oculto (interacción por columna)", () => {
    const { option, byName, values } = series([bucket("2026-10-01"), FUTURE]);
    expect(byName("__banda").xAxisIndex).toBe(1);
    expect(values(byName("__banda"))[1]).toBeNull();
    const axes = (option as unknown as { xAxis: Array<{ show?: boolean }> })
      .xAxis;
    expect(axes[1].show).toBe(false);
  });
});

describe("buildMovimientoOption · REPORTADOS vs CERRADOS agrupados", () => {
  const oct = bucket("2026-10-01", { created: 6 });

  it("banda índice 0 + dos barras agrupadas (sin stack), cerrados con trama", () => {
    const { option, byName } = series([oct], buildMovimientoOption);
    expect(option.series.map((s) => s.name)).toEqual([
      "__banda",
      "Reportados",
      "Cerrados",
    ]);
    expect(byName("Reportados").stack).toBeUndefined();
    expect(byName("Cerrados").stack).toBeUndefined();
    expect(byName("Cerrados").itemStyle?.decal).toBeTruthy();
    expect(byName("__banda").xAxisIndex).toBe(1);
  });

  it("valores = eventos del bucket (created / solved.total) y futuro null", () => {
    const { byName, values } = series([oct, FUTURE], buildMovimientoOption);
    expect(values(byName("Reportados"))).toEqual([6, null]);
    expect(values(byName("Cerrados"))).toEqual([4, null]);
    expect(values(byName("__banda"))[1]).toBeNull();
  });

  it("un 0 real lleva su «0» atenuado; un valor > 0 su cifra normal", () => {
    const zero = bucket("2026-09-01", { created: 0, solved: { total: 3 } });
    const { byName } = series([zero], buildMovimientoOption);
    const reported = byName("Reportados") as unknown as {
      data: Array<{ value: number; label?: { color?: string } }>;
      label: { formatter: (p: { dataIndex: number; value?: number }) => string };
    };
    expect(reported.data[0].value).toBe(0);
    expect(reported.data[0].label?.color).toMatch(/0\.5\)/);
    expect(reported.label.formatter({ dataIndex: 0, value: 0 })).toBe("0");
    const closed = byName("Cerrados") as unknown as { data: Array<{ label?: unknown }> };
    expect(closed.data[0].label).toBeUndefined();
  });

  it("Carga y Movimiento comparten área de trazado fija (columnas alineadas)", () => {
    const buckets = [bucket("2026-09-01"), bucket("2026-10-01", { current: true })];
    const grid = (build: typeof buildFlujoOption) =>
      (build(buckets, "month") as unknown as { grid: unknown }).grid;
    expect(grid(buildMovimientoOption)).toEqual(grid(buildFlujoOption));
    expect(grid(buildFlujoOption)).toMatchObject({ containLabel: false });
  });

  it("mismo eje temporal que la Carga (categorías idénticas)", () => {
    const buckets = [bucket("2026-09-01"), { ...oct, current: true }, FUTURE];
    const axes = (build: typeof buildFlujoOption) =>
      (
        build(buckets, "month") as unknown as {
          xAxis: Array<{ data: string[] }>;
        }
      ).xAxis.map((a) => a.data);
    expect(axes(buildMovimientoOption)).toEqual(axes(buildFlujoOption));
  });

  it("tooltip: reportados y cerrados del bucket; futuro sin cifras", () => {
    const html = movimientoTooltipHtml(oct, "Octubre 2026");
    expect(html).toMatch(/Reportados.*6/);
    expect(html).toMatch(/Cerrados.*4/);
    expect(html).not.toContain("Solucionados");
    expect(movimientoTooltipHtml(FUTURE, "Noviembre 2026")).toContain("Futuro");
  });

  it("tooltip: tramo en curso y semana recortada lo dicen (cifras reales)", () => {
    const inProgress = bucket("2026-10-01", {
      end: "2026-10-31",
      calendarEnd: "2026-10-31",
      dataEnd: "2026-10-15",
      current: true,
      created: 6,
    });
    expect(movimientoTooltipHtml(inProgress, "Octubre 2026")).toContain(
      "datos hasta el 15 oct",
    );
    const clipped = bucket("2026-10-01", {
      end: "2026-10-04",
      dataEnd: "2026-10-04",
      calendarStart: "2026-09-28",
      calendarEnd: "2026-10-04",
    });
    expect(flujoTooltipHtml(clipped, "1–4 oct")).toContain(
      "semana del 28 sep al 4 oct, recortada al mes",
    );
  });
});

describe("flujoTooltipHtml · una sola interacción explica la composición", () => {
  const oct = bucket("2026-10-01");

  it("total + bloque INTERNOS (categorías) + bloque EXTERNOS (afectadas)", () => {
    const html = flujoTooltipHtml(oct, "Octubre 2026");
    expect(html).toContain("Octubre 2026");
    expect(html).toMatch(/Activos al corte · 1 oct.*12/);
    expect(html).toMatch(/Internos.*7/);
    expect(html).toContain("Externos · coordinaciones afectadas");
    expect(html.indexOf("Internet")).toBeLessThan(html.indexOf("Externos"));
    expect(html.indexOf("Saber Pro")).toBeGreaterThan(html.indexOf("Externos"));
    expect(html.toLowerCase()).not.toContain("reportado por");
    // Los solucionados se leen en el Movimiento: sin número repetido.
    expect(html).not.toContain("Solucionados");
  });

  it("top 3 por bloque en orden del backend + «+ N más»", () => {
    const html = flujoTooltipHtml(oct, "Octubre 2026");
    const order = ["Internet", "ACAS", "Aplicativos"].map((n) =>
      html.indexOf(n),
    );
    expect(order.every((i, k) => i > 0 && (k === 0 || i > order[k - 1]))).toBe(
      true,
    );
    expect(html).not.toContain("Infraestructura");
    expect(html).toContain("+ 1 más");
  });

  it("bucket actual: el corte con su fecha, nunca «ahora» ni «hoy»", () => {
    const html = flujoTooltipHtml(
      { ...oct, end: "2026-10-31", calendarEnd: "2026-10-31", dataEnd: "2026-10-15", current: true },
      "Octubre 2026",
    );
    expect(html).toContain("Activos al corte · 15 oct");
    expect(html).not.toMatch(/ahora|hoy/i);
    expect(html).toContain("· actual");
  });

  it("eje: solo «Carga y movimiento» marca EN CURSO / PARCIAL; el eje compartido conserva ACTUAL", () => {
    const current = bucket("2026-10-01", {
      end: "2026-10-31",
      calendarEnd: "2026-10-31",
      dataEnd: "2026-10-15",
      current: true,
    });
    const flujoAxis = (buildFlujoOption([current], "month") as unknown as {
      xAxis: Array<{ data: string[] }>;
    }).xAxis[0].data[0];
    expect(flujoAxis).toContain("EN CURSO");
    expect(temporalAxes([current], "month")[0].data?.[0]).toContain("ACTUAL");
    expect(temporalAxes([current], "month")[0].data?.[0]).not.toContain("EN CURSO");
  });

  it("futuro: sin cifras", () => {
    const html = flujoTooltipHtml(FUTURE, "Noviembre 2026");
    expect(html).toContain("Futuro");
    expect(html).not.toContain("Activos");
  });

  it("topRows: corta en 3 y cuenta el resto", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      label: `C${i}`,
      count: 8 - i,
    }));
    const top = topRows(many);
    expect(top.rows).toHaveLength(3);
    expect(top.hidden).toBe(5);
  });

  it("escapa nombres del catálogo (sin inyección HTML)", () => {
    const html = flujoTooltipHtml(
      bucket("2026-10-01", {
        active: {
          ...oct.active!,
          internalBreakdown: [
            {
              categoryId: "x",
              categoryCode: "x",
              categoryName: "<img onerror=1>",
              selectable: true,
              count: 1,
            },
          ],
        },
      }),
      "Octubre 2026",
    );
    expect(html).toContain("&lt;img onerror=1&gt;");
    expect(html).not.toContain("<img");
  });
});

describe("eje compartido · escala y etiquetas compactas", () => {
  it("máximo = múltiplo exacto del intervalo, ≤ 5 divisiones", () => {
    expect(flujoScale([10])).toEqual({ max: 15, interval: 3 });
    expect(flujoScale([12])).toEqual({ max: 15, interval: 3 });
    expect(flujoScale([6])).toEqual({ max: 8, interval: 2 });
    expect(flujoScale([0, null])).toEqual({ max: 2, interval: 1 });
    for (const peak of [1, 3, 7, 13, 26, 41, 99, 240]) {
      const { max, interval } = flujoScale([peak]);
      expect(max % interval).toBe(0);
      expect(max / interval).toBeLessThanOrEqual(5);
      expect(max).toBeGreaterThan(peak);
    }
  });

  it("semanas del mes: solo el rango de días; meses y días sin cambio", () => {
    const week = bucket("2026-10-05", { end: "2026-10-11" });
    expect(flujoAxisTick(week, "week")).toBe("5–11");
    expect(
      flujoAxisTick(bucket("2026-10-01", { end: "2026-10-04" }), "week"),
    ).toBe("1–4");
    expect(flujoAxisTick(bucket("2026-10-01"), "month")).toBe("OCT");
    expect(flujoAxisTick(bucket("2026-10-05"), "day")).toBe("LUN 5");
  });
});
