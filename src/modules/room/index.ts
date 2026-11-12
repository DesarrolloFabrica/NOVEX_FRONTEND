// Punto de entrada del módulo `room`: arquitectura física de la Sala Novex
// Expone la estructura de escenario (Sala -> Marco -> Pantalla) y su tema.

export { NovexRoom } from '@/modules/room/components/NovexRoom'
export { NovexFrame } from '@/modules/room/components/NovexFrame'
export { MainScreen } from '@/modules/room/components/MainScreen'
export {
  deriveRoomStatus,
  type RoomStatus,
} from '@/modules/room/utils/deriveRoomStatus'
