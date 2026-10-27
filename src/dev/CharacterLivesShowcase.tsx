import { useState } from 'react'
import { CharacterLives } from '@/modules/operational-cards/components/CharacterLives'
import type { CharacterLivesSize } from '@/modules/operational-cards/components/CharacterLives'

/**
 * SHOWCASE DE DESARROLLO de `CharacterLives`. No pertenece a la aplicación:
 * no está en el router, no lo importa `main.tsx` y no entra en `vite build`
 * (la única entrada del build es `index.html`). Se abre solo con el servidor
 * de Vite en `/dev/character-lives.html`.
 *
 * Muestra la tabla completa 10..0 + null sobre los dos fondos reales del
 * Centro Operacional: el oscuro del shell y el crema del marco ticket.
 */

const VALUES: readonly (number | null)[] = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, null]
const SIZES: readonly CharacterLivesSize[] = ['sm', 'md', 'lg']

const SURFACES = [
  { id: 'dark', label: 'Fondo oscuro (shell)', background: '#0e182a', color: '#e8eefc' },
  { id: 'cream', label: 'Fondo crema (ticket)', background: '#fffaee', color: '#3a2a1e' },
] as const

function Surface({
  label,
  background,
  color,
}: {
  label: string
  background: string
  color: string
}) {
  return (
    <section style={{ background, color, padding: 24, borderRadius: 14 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>{label}</h2>

      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={cellStyle}>lifePoints</th>
            {SIZES.map((size) => (
              <th key={size} style={cellStyle}>
                {size}
              </th>
            ))}
            <th style={cellStyle}>sin valor</th>
          </tr>
        </thead>
        <tbody>
          {VALUES.map((value) => (
            <tr key={String(value)}>
              <td style={{ ...cellStyle, fontFamily: 'IBM Plex Mono, monospace' }}>
                {value === null ? 'null' : value}
              </td>
              {SIZES.map((size) => (
                <td key={size} style={cellStyle}>
                  <CharacterLives lifePoints={value} size={size} />
                </td>
              ))}
              <td style={cellStyle}>
                <CharacterLives lifePoints={value} showValue={false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

const cellStyle = {
  padding: '8px 18px 8px 0',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 500,
} as const

/**
 * Banco de pruebas de TRANSICIONES: cambia el valor del mismo dueño (anima) o
 * cambia de dueño (reemplaza sin animar), sobre los dos fondos.
 */
function TransitionBench() {
  const [owner, setOwner] = useState<'A' | 'B'>('A')
  const [lifePoints, setLifePoints] = useState<number | null>(8)

  const shift = (delta: number) =>
    setLifePoints((current) =>
      current === null ? 5 : Math.min(10, Math.max(0, current + delta)),
    )

  const buttons: [string, () => void][] = [
    ['−1', () => shift(-1)],
    ['+1', () => shift(1)],
    ['−3', () => shift(-3)],
    ['+3', () => shift(3)],
    ['null', () => setLifePoints(null)],
    [`dueño ${owner === 'A' ? 'B' : 'A'}`, () => setOwner(owner === 'A' ? 'B' : 'A')],
  ]

  return (
    <section
      data-testid="lives-transition-bench"
      style={{ display: 'grid', gap: 12, padding: 24, borderRadius: 14, background: '#0e182a' }}
    >
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
        Transiciones · dueño {owner} · {lifePoints === null ? 'null' : lifePoints}
      </h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {buttons.map(([label, onClick]) => (
          <button key={label} type="button" data-bench={label} onClick={onClick}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        {SURFACES.map((surface) => (
          <div
            key={surface.id}
            data-surface={surface.id}
            style={{ background: surface.background, color: surface.color, padding: 16, borderRadius: 10 }}
          >
            <CharacterLives lifePoints={lifePoints} ownerKey={owner} size="lg" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function CharacterLivesShowcase() {
  return (
    <main
      style={{
        display: 'grid',
        gap: 24,
        padding: 24,
        fontFamily: 'IBM Plex Sans, system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18 }}>CharacterLives · showcase (solo desarrollo)</h1>
      <TransitionBench />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {SURFACES.map((surface) => (
          <Surface key={surface.id} {...surface} />
        ))}
      </div>
    </main>
  )
}
