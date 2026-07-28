// Punto de entrada del módulo `room`: arquitectura física de la Sala Cunmark
// Expone la estructura de escenario (Sala -> Marco -> Pantalla) y su tema.

export { CunmarkRoom } from '@/modules/room/components/CunmarkRoom'
export { CunmarkFrame } from '@/modules/room/components/CunmarkFrame'
export { MainScreen } from '@/modules/room/components/MainScreen'
/** Reservado para assets Blender futuros — no montado en la escena actual. */
export { RoomConsoleLayer } from '@/modules/room/components/RoomConsoleLayer'
export {
  deriveRoomStatus,
  type RoomStatus,
} from '@/modules/room/utils/deriveRoomStatus'
