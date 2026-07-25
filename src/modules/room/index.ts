// Punto de entrada del módulo `room`: arquitectura física de la Sala O.M.E.G.A.
// Expone la estructura de escenario (Sala -> Marco -> Pantalla) y su tema.

export { OmegaRoom } from '@/modules/room/components/OmegaRoom'
export { OmegaFrame } from '@/modules/room/components/OmegaFrame'
export { MainScreen } from '@/modules/room/components/MainScreen'
/** Reservado para assets Blender futuros — no montado en la escena actual. */
export { RoomConsoleLayer } from '@/modules/room/components/RoomConsoleLayer'
export {
  deriveRoomStatus,
  type RoomStatus,
} from '@/modules/room/utils/deriveRoomStatus'
