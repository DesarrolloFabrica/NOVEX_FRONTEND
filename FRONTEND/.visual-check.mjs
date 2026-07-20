import { writeFile } from 'node:fs/promises'

const target = await fetch(
  'http://127.0.0.1:9222/json/new?http://localhost:5173',
  { method: 'PUT' },
).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve) =>
  socket.addEventListener('open', resolve, { once: true }),
)
let commandId = 0
const pending = new Map()
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  const resolve = pending.get(message.id)
  if (!resolve) return
  pending.delete(message.id)
  resolve(message)
})
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++commandId
    pending.set(id, resolve)
    socket.send(JSON.stringify({ id, method, params }))
  })
await send('Emulation.setDeviceMetricsOverride', {
  width: 1024,
  height: 576,
  deviceScaleFactor: 1,
  mobile: false,
})
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://localhost:5173' })
await new Promise((resolve) => setTimeout(resolve, 1000))
await send('Runtime.evaluate', {
  expression:
    '[...document.querySelectorAll("button")].find((button) => button.textContent.includes("Ingresar como Supervisor"))?.click()',
})
await new Promise((resolve) => setTimeout(resolve, 2600))
const screenshot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
})
await writeFile(
  'omega-validation.png',
  Buffer.from(screenshot.result.data, 'base64'),
)
socket.close()
