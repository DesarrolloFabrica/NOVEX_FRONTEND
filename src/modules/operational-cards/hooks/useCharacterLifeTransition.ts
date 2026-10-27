import { useState } from 'react'
import {
  advanceCharacterLifeSnapshot,
  initialCharacterLifeSnapshot,
  type CharacterLifeSnapshot,
} from '@/modules/operational-cards/data/characterLifeTransition'

/**
 * Recuerda la lectura anterior de las vidas de UN dueño y devuelve la
 * transición entre ella y la actual.
 *
 * Estado LOCAL de presentación: no va al reducer ni se persiste. Usa el patrón
 * de React para información de renders anteriores (actualizar estado durante
 * el render cuando cambian las props), de modo que la transición llega en el
 * MISMO render que el valor nuevo y nunca se pinta un fotograma intermedio con
 * el valor nuevo sin su animación.
 *
 * Montar el componente (aparecer las vidas, cambiar de rol…) empieza siempre
 * sin transición: lo que se ve al aparecer es el estado actual, no un delta.
 */
export function useCharacterLifeTransition(
  ownerKey: string | null | undefined,
  lifePoints: number | null,
): CharacterLifeSnapshot {
  const [snapshot, setSnapshot] = useState(() =>
    initialCharacterLifeSnapshot(ownerKey, lifePoints),
  )

  const next = advanceCharacterLifeSnapshot(snapshot, ownerKey, lifePoints)
  if (next !== snapshot) setSnapshot(next)
  return next
}
