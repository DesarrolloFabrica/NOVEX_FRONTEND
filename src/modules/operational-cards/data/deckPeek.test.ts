import { describe, expect, it } from 'vitest'
import { buildDeckPeeks } from '@/modules/operational-cards/data/deckPeek'

/**
 * Geometría del mazo cerrado.
 *
 * Lo que se vigila aquí es que las subordinaciones se comporten como CARTAS
 * desalineadas y no como una escalera de franjas: desvíos distintos entre sí,
 * giros distintos entre sí, y todo determinístico.
 */

describe('buildDeckPeeks · cantidad y orden', () => {
  it('produce una entrada por subordinación', () => {
    expect(buildDeckPeeks(5)).toHaveLength(5)
    expect(buildDeckPeeks(0)).toHaveLength(0)
  })

  it('la profundidad empieza en 1, junto al padre', () => {
    expect(buildDeckPeeks(5).map((peek) => peek.depth)).toEqual([1, 2, 3, 4, 5])
  })

  it('todas quedan DETRÁS del padre', () => {
    // El padre vive en z 1 dentro del mazo; estas son negativas.
    for (const peek of buildDeckPeeks(5)) {
      expect(peek.zIndex).toBeLessThan(0)
    }
  })

  it('y en orden: cuanto más profunda, más al fondo', () => {
    const zs = buildDeckPeeks(5).map((peek) => peek.zIndex)
    for (let index = 1; index < zs.length; index += 1) {
      expect(zs[index]).toBeLessThan(zs[index - 1])
    }
  })
})

describe('buildDeckPeeks · se leen como cartas, no como franjas', () => {
  const peeks = buildDeckPeeks(5)

  it('la baraja engorda hacia abajo de forma monótona', () => {
    for (let index = 1; index < peeks.length; index += 1) {
      expect(peeks[index].y).toBeGreaterThan(peeks[index - 1].y)
    }
  })

  it('cada una cae en un sitio distinto: ningún desvío lateral se repite', () => {
    expect(new Set(peeks.map((peek) => peek.x)).size).toBe(peeks.length)
  })

  it('cada una gira distinto: ninguna rotación se repite', () => {
    expect(new Set(peeks.map((peek) => peek.rotation)).size).toBe(peeks.length)
  })

  it('el desvío lateral NO es una escalera: cambia de signo', () => {
    // Un desvío monótono produciría una diagonal, tan artificial como la
    // vertical. La baraja tiene que verse cerrada y desalineada.
    const signs = new Set(peeks.map((peek) => Math.sign(peek.x)))
    expect(signs.size).toBeGreaterThan(1)
  })

  it('las de atrás se estrechan un poco: da profundidad', () => {
    for (let index = 1; index < peeks.length; index += 1) {
      expect(peeks[index].scale).toBeLessThan(peeks[index - 1].scale)
    }
    expect(peeks.at(-1)!.scale).toBeGreaterThan(0.9)
  })
})

describe('buildDeckPeeks · magnitudes contenidas', () => {
  const peeks = buildDeckPeeks(5)

  it('sigue siendo una baraja CERRADA, no un abanico', () => {
    // En unidades de carta. A 1440 la carta mide 189 x 250 px, así que esto son
    // unos ±3-6 px de lado, hasta 2° de giro y ~7,5 px por escalón. Las cotas
    // existen para que un ajuste futuro no convierta el mazo en un despliegue:
    // eso es R7 y tiene que ser una decisión, no un descuido.
    for (const peek of peeks) {
      expect(Math.abs(peek.x)).toBeLessThan(0.04)
      expect(Math.abs(peek.rotation)).toBeLessThan(2.5)
    }
    expect(peeks.at(-1)!.y).toBeLessThan(0.18)
  })

  it('el desvío lateral se queda dentro de la banda que solapa la vecina', () => {
    // Con 25 % de solape, la vecina cubre un cuarto de carta. Mientras el
    // desvío no lo supere, un peek no puede asomar sobre la carta de al lado.
    for (const peek of peeks) {
      expect(Math.abs(peek.x)).toBeLessThan(0.25)
    }
  })
})

describe('buildDeckPeeks · determinismo', () => {
  it('dos llamadas dan exactamente el mismo mazo', () => {
    expect(buildDeckPeeks(5)).toEqual(buildDeckPeeks(5))
  })

  it('en REPOSO, añadir una hija no mueve a las anteriores', () => {
    const five = buildDeckPeeks(5)
    const six = buildDeckPeeks(6)

    for (let index = 0; index < 5; index += 1) {
      expect({
        x: six[index].x,
        y: six[index].y,
        rotation: six[index].rotation,
        scale: six[index].scale,
        zIndex: six[index].zIndex,
      }).toEqual({
        x: five[index].x,
        y: five[index].y,
        rotation: five[index].rotation,
        scale: five[index].scale,
        zIndex: five[index].zIndex,
      })
    }
  })

  it('pero el ABANICO sí se recentra: depende de cuántas hijas haya', () => {
    // No es un descuido: el abanico se abre centrado en el padre, así que con
    // seis hijas las posiciones tienen que repartirse de nuevo. Si no
    // dependiera del total, la subbaraja quedaría descentrada.
    const five = buildDeckPeeks(5)
    const six = buildDeckPeeks(6)
    expect(six[0].preview.x).not.toBe(five[0].preview.x)
  })
})

describe('buildDeckPeeks · apertura de preview', () => {
  const peeks = buildDeckPeeks(5)

  it('el abanico está centrado en el padre', () => {
    const xs = peeks.map((peek) => peek.preview.x)
    const sum = xs.reduce((total, value) => total + value, 0)
    expect(Math.abs(sum)).toBeLessThan(0.0001)
  })

  it('se abre hacia los lados de forma monótona, sin cruces', () => {
    const xs = peeks.map((peek) => peek.preview.x)
    for (let index = 1; index < xs.length; index += 1) {
      expect(xs[index]).toBeGreaterThan(xs[index - 1])
    }
  })

  it('las hijas son MINI cartas: entre el 50 % y el 60 % del padre', () => {
    // A 1440 esto son ~102 px de ancho frente a los 189 del padre.
    for (const peek of peeks) {
      expect(peek.preview.scale).toBeGreaterThanOrEqual(0.5)
      expect(peek.preview.scale).toBeLessThanOrEqual(0.6)
    }
  })

  it('el abanico se abre HACIA ARRIBA: ninguna hija baja', () => {
    // El gesto es sacar el mazo de la mesa y abrirlo hacia el observador. Si
    // una sola hija tuviera desplazamiento positivo, el abanico se leería
    // partido en dos direcciones.
    for (const peek of peeks) {
      expect(peek.preview.y).toBeLessThan(0)
    }
  })

  it('la subida está acotada: el abanico no llega al resumen institucional', () => {
    // Sobre la mesa vive la lectura institucional de la Dirección, y taparla
    // está prohibido. Medido en navegador, el aire entre el pie de ese bloque y
    // el borde alto del mazo elevado es de 56 px en 1440x900 —el caso más
    // estrecho— sobre cartas de 250 px de alto, o sea 0,22 altos de carta. La
    // cota se queda por debajo con margen; superarla vuelve a tapar el resumen.
    for (const peek of peeks) {
      expect(peek.preview.y).toBeGreaterThan(-0.2)
    }
  })

  it('el pie de cada hija queda DETRÁS del cuerpo del padre', () => {
    // Lo que sujeta la lectura de «cartas que salen de un mazo»: si el borde
    // inferior de una hija subiera por encima del borde superior del padre, la
    // fila se leería flotando por su cuenta, desprendida del mazo.
    for (const peek of peeks) {
      expect(peek.preview.y + peek.preview.scale).toBeGreaterThan(0)
    }
  })

  it('cada hija deja perceptible entre el 40 % y el 55 % de su carta', () => {
    // La fracción visible la produce el solape ENTRE hijas, no el recorte
    // contra el padre: cada una tapa a la siguiente algo más de la mitad.
    const pitch = peeks[1].preview.x - peeks[0].preview.x
    const visible = pitch / peeks[0].preview.scale

    expect(visible).toBeGreaterThanOrEqual(0.4)
    expect(visible).toBeLessThanOrEqual(0.55)
  })

  it('el centro queda más alto y los extremos caen, como una mano sostenida', () => {
    // Abriéndose hacia arriba la curvatura se invierte respecto de R4.1: la
    // carta central es la que más sube. Es la forma de una mano de cartas
    // sujeta por el pie, y es lo que impide que el abanico se lea como una
    // fila recta.
    const ys = peeks.map((peek) => peek.preview.y)
    const centre = ys[Math.floor(ys.length / 2)]

    expect(ys[0]).toBeGreaterThan(centre)
    expect(ys[ys.length - 1]).toBeGreaterThan(centre)
  })

  it('los extremos giran hacia fuera, en abanico', () => {
    const rotations = peeks.map((peek) => peek.preview.rotation)

    expect(rotations[0]).toBeLessThan(-8)
    expect(rotations[rotations.length - 1]).toBeGreaterThan(8)
    // Monótono: ninguna hija se cruza con otra.
    for (let index = 1; index < rotations.length; index += 1) {
      expect(rotations[index]).toBeGreaterThan(rotations[index - 1])
    }
    // Y el centro se queda recto.
    expect(Math.abs(rotations[Math.floor(rotations.length / 2)])).toBeLessThan(
      0.001,
    )
  })

  it('abrirse aleja a las hijas del reposo: es un cambio perceptible', () => {
    // En reposo la baraja engorda hacia abajo; al abrirse todas cruzan el
    // borde alto del padre. El recorrido es de signo contrario, así que la
    // apertura no puede confundirse con el estado cerrado.
    for (const peek of peeks) {
      expect(peek.preview.y).toBeLessThan(peek.y)
      expect(peek.y - peek.preview.y).toBeGreaterThan(0.1)
      expect(peek.preview.scale).toBeLessThan(peek.scale)
    }
  })

  it('la apertura es determinística', () => {
    expect(buildDeckPeeks(5).map((peek) => peek.preview)).toEqual(
      buildDeckPeeks(5).map((peek) => peek.preview),
    )
  })
})
