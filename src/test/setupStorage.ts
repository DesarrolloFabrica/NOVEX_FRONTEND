/**
 * Almacenamiento web para las pruebas.
 *
 * Node 22+ expone su propio `localStorage` global (Web Storage experimental).
 * Sin `--localstorage-file` ese global queda inutilizable (`undefined` o sin
 * métodos) y tapa el de jsdom: todas las pruebas que leen o escriben
 * borradores, sesión o progreso fallaban con «Cannot read properties of
 * undefined (reading 'clear')». Si el global no funciona, se instala uno en
 * memoria con la misma interfaz. Una prueba que lo sustituya con
 * `vi.stubGlobal` sigue teniendo prioridad.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

function usable(storage: unknown): boolean {
  try {
    return (
      typeof storage === 'object' &&
      storage !== null &&
      typeof (storage as Storage).getItem === 'function' &&
      typeof (storage as Storage).clear === 'function'
    )
  } catch {
    return false
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  let current: unknown
  try {
    current = (globalThis as Record<string, unknown>)[name]
  } catch {
    current = undefined
  }
  if (!usable(current)) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: new MemoryStorage(),
    })
  }
}
