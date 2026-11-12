// Capa: app (enrutado).
// Responsabilidad: un chunk por destino y su precarga. Sin lógica de negocio.
//
// Antes toda la app viajaba en un único JS (~1,6 MB): el login descargaba el
// Centro Operacional, la consola de administración y los cuatro shells de rol.
// Cada destino es ahora su propio chunk, y para que dividir no añada esperas:
//   · con sesión guardada, el Centro y el shell del rol se piden EN PARALELO a
//     la validación de sesión (`/auth/me`), no después;
//   · en el login, el Centro se precarga en tiempo ocioso: tras autenticarse ya
//     está en caché y la transición de telón no espera a la red.

import { readAuthSession } from '@/modules/auth/utils/authSessionStorage'
import { preloadOperationalShellForRole } from '@/modules/operational-cards/experience/shells/operationalShellChunks'

function memo<T>(loader: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null
  return () => {
    if (!promise) {
      promise = loader()
      promise.catch(() => {
        promise = null
      })
    }
    return promise
  }
}

export const loadLoginPage = memo(() => import('@/pages/LoginPage'))
export const loadAdminConsolePage = memo(() => import('@/pages/AdminConsolePage'))
export const loadOperationalCenter = memo(() => import('@/app/operationalCenterRoute'))

/**
 * Consola de Administración: chunk + datos. Se llama al señalar su enlace
 * (hover/foco) y en tiempo ocioso para el ADMIN, de modo que al hacer clic la
 * transición no espera ni al código ni a la red.
 */
export function preloadAdminConsole(): void {
  void loadAdminConsolePage().catch(() => undefined)
  void import('@/modules/admin-console/adminConsoleData')
    .then((module) => module.prefetchAdminConsoleData())
    .catch(() => undefined)
}

function whenIdle(task: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number })
    .requestIdleCallback
  if (idle) idle(task, { timeout: 2500 })
  else setTimeout(task, 1200)
}

/**
 * Arranca las descargas probables según dónde aterriza el usuario. Se llama una
 * vez al iniciar la app; nunca bloquea el primer render.
 */
export function warmRouteChunks(pathname: string): void {
  const session = readAuthSession()

  if (pathname.startsWith('/login') || !session) {
    void loadLoginPage().catch(() => undefined)
    whenIdle(() => {
      void loadOperationalCenter().catch(() => undefined)
    })
    return
  }

  if (pathname.startsWith('/admin')) {
    // Solo el ADMIN entra a la consola: precargar sus datos para otro rol
    // terminaba en cuatro 403 antes de que la guarda lo devolviera al Centro.
    if (session.roleCode?.toUpperCase() === 'ADMIN') preloadAdminConsole()
    // El regreso al Centro tampoco debe esperar al código.
    whenIdle(() => {
      void loadOperationalCenter().catch(() => undefined)
      preloadOperationalShellForRole(session.roleCode)
    })
    return
  }

  void loadOperationalCenter().catch(() => undefined)
  preloadOperationalShellForRole(session.roleCode)
  // El ADMIN suele ir del Centro a la consola: su código llega en tiempo ocioso.
  if (session.roleCode?.toUpperCase() === 'ADMIN') {
    whenIdle(() => {
      void loadAdminConsolePage().catch(() => undefined)
    })
  }
}
