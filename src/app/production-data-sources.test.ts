import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * LA APP PUBLICADA SOLO MUESTRA DATOS REALES.
 *
 * Comprobación estática sobre el grafo de imports que parte de `src/main.tsx`
 * (estáticos y `import()` dinámicos): ningún módulo alcanzable puede ser un
 * mock, fixture, stub o demo, ni cargar MSW. Los mocks y fixtures siguen
 * existiendo para pruebas y para pantallas retiradas, pero si alguien los
 * vuelve a enlazar desde el flujo publicado, esta prueba falla.
 *
 * Los catálogos visuales (identidad de cartas, islas, personajes) no entran en
 * el patrón: son assets legítimos, no registros operativos.
 */

const SRC = join(__dirname, '..')
const ENTRY = join(SRC, 'main.tsx')
const EXTENSIONS = ['.ts', '.tsx', `${sep}index.ts`, `${sep}index.tsx`, '']
const IMPORT_RE =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g
const FICTITIOUS_DATA_FILE = /(mock|fixture|stub|fake|demo|dummy)/i

function resolveImport(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec)
  else return null
  for (const ext of EXTENSIONS) {
    const candidate = base + ext
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  return null
}

/** Módulo alcanzable → módulo que lo importó (para explicar el camino). */
function reachableGraph(): { parents: Map<string, string | null>; packages: Set<string> } {
  const parents = new Map<string, string | null>()
  const packages = new Set<string>()
  const pending: Array<[string, string | null]> = [[ENTRY, null]]
  while (pending.length > 0) {
    const [file, parent] = pending.pop()!
    if (parents.has(file)) continue
    parents.set(file, parent)
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2] ?? match[3]
      const target = resolveImport(file, spec)
      if (target && /\.(ts|tsx)$/.test(target)) pending.push([target, file])
      else if (!spec.startsWith('.') && !spec.startsWith('@/')) packages.add(spec)
    }
  }
  return { parents, packages }
}

const rel = (file: string) => relative(SRC, file).split(sep).join('/')

describe('Datos de la app publicada', () => {
  const { parents, packages } = reachableGraph()

  it('recorre el grafo real (la prueba no está vacía)', () => {
    expect(parents.size).toBeGreaterThan(100)
    expect([...parents.keys()].map(rel)).toContain(
      'modules/operational-cards/hooks/useOperationalOverview.ts',
    )
  })

  it('ningún mock, fixture, stub o demo es alcanzable desde main.tsx', () => {
    const offenders = [...parents.keys()]
      .map(rel)
      .filter((file) => FICTITIOUS_DATA_FILE.test(file))
      .map((file) => {
        const chain: string[] = []
        let current: string | null = join(SRC, file)
        while (current) {
          chain.push(rel(current))
          current = parents.get(current) ?? null
        }
        return chain.join(' ⇐ ')
      })
    expect(offenders).toEqual([])
  })

  it('no carga interceptores de API de pruebas (MSW)', () => {
    expect([...packages].filter((name) => name === 'msw' || name.startsWith('msw/'))).toEqual(
      [],
    )
  })

  it('la URL de la API solo cae al proxy local en desarrollo', () => {
    const http = readFileSync(join(SRC, 'shared/api/http.ts'), 'utf8')
    // El único retorno de la base local está protegido por import.meta.env.DEV.
    expect(http).toMatch(/if \(import\.meta\.env\.DEV\) return LOCAL_API_BASE/)
    expect(http).toMatch(/La URL del API no está configurada/)
  })
})
