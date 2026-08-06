import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backendDirectory = resolve(frontendDirectory, '..', 'NOVEX_BACKEND')
const backendPackage = resolve(backendDirectory, 'package.json')
const backendNestCli = resolve(
  backendDirectory,
  'node_modules',
  '@nestjs',
  'cli',
  'bin',
  'nest.js',
)
const frontendViteCli = resolve(
  frontendDirectory,
  'node_modules',
  'vite',
  'bin',
  'vite.js',
)
const forwardedViteArguments = process.argv.slice(2)

let backendProcess
let frontendProcess
let shuttingDown = false

async function requestBackend(path) {
  try {
    const response = await fetch(`http://127.0.0.1:3001${path}`, {
      signal: AbortSignal.timeout(1_500),
    })
    return { status: response.status, body: await response.text() }
  } catch {
    return null
  }
}

function start(command, args, cwd) {
  return spawn(command, args, {
    cwd,
    stdio: 'inherit',
    windowsHide: false,
  })
}

async function waitForBackendReady(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (backendProcess?.exitCode != null) {
      throw new Error(
        `NOVEX_BACKEND terminó durante el arranque (código ${backendProcess.exitCode}).`,
      )
    }

    const readiness = await requestBackend('/health/ready')
    if (readiness?.status === 200) return
    if (readiness?.body.includes('"failure"')) {
      throw new Error(
        'NOVEX_BACKEND no pudo inicializarse. Revise su consola, PostgreSQL y el archivo .env.',
      )
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500))
  }

  throw new Error(
    'NOVEX_BACKEND no estuvo listo en 90 segundos. Revise PostgreSQL y su configuración local.',
  )
}

async function stopChild(child) {
  if (!child || child.exitCode != null || child.killed) return

  if (process.platform === 'win32') {
    await new Promise((resolveStop) => {
      const killer = spawn(
        'taskkill',
        ['/pid', String(child.pid), '/T', '/F'],
        { stdio: 'ignore', windowsHide: true },
      )
      killer.once('exit', resolveStop)
      killer.once('error', resolveStop)
    })
    return
  }

  child.kill('SIGTERM')
}

async function shutdown(exitCode) {
  if (shuttingDown) return
  shuttingDown = true
  await stopChild(frontendProcess)
  await stopChild(backendProcess)
  process.exit(exitCode)
}

async function main() {
  if (existsSync(backendPackage)) {
    if (!existsSync(backendNestCli)) {
      throw new Error(
        'Faltan dependencias de NOVEX_BACKEND. Ejecute npm install en ese directorio.',
      )
    }

    const liveness = await requestBackend('/health')
    if (!liveness) {
      console.log('Iniciando NOVEX_BACKEND en http://localhost:3001 ...')
      backendProcess = start(
        process.execPath,
        [backendNestCli, 'start', '--watch'],
        backendDirectory,
      )
      backendProcess.once('error', (error) => {
        console.error(`No se pudo iniciar NOVEX_BACKEND: ${error.message}`)
        void shutdown(1)
      })
      backendProcess.once('exit', (code) => {
        if (!shuttingDown && frontendProcess) {
          console.error(
            `NOVEX_BACKEND se detuvo inesperadamente (código ${code ?? 1}).`,
          )
          void shutdown(code ?? 1)
        }
      })
    } else {
      console.log('NOVEX_BACKEND ya está activo; se reutilizará el proceso existente.')
    }

    console.log('Esperando a que API y PostgreSQL estén listos ...')
    await waitForBackendReady()
    console.log('API lista. Iniciando NOVEX_FRONTEND ...')
  } else {
    console.warn(
      'No se encontró ../NOVEX_BACKEND; se iniciará únicamente el frontend.',
    )
  }

  if (!existsSync(frontendViteCli)) {
    throw new Error(
      'Faltan dependencias de NOVEX_FRONTEND. Ejecute npm install en este directorio.',
    )
  }

  frontendProcess = start(
    process.execPath,
    [frontendViteCli, ...forwardedViteArguments],
    frontendDirectory,
  )
  frontendProcess.once('exit', (code) => void shutdown(code ?? 1))
  frontendProcess.once('error', (error) => {
    console.error(`No se pudo iniciar Vite: ${error.message}`)
    void shutdown(1)
  })
}

process.once('SIGINT', () => void shutdown(130))
process.once('SIGTERM', () => void shutdown(143))

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  void shutdown(1)
})
