import { useCallback, useEffect, useState } from 'react'
import {
  clearReasonDraft,
  readReasonDraft,
  writeReasonDraft,
  type ReasonDraftKind,
} from '@/modules/operational-cards/services/reason-draft-persistence'

/**
 * Motivo administrativo / de retiro con respaldo temporal por usuario.
 * Se restaura al reabrir el modal tras una caducidad de sesión del mismo usuario.
 */
export function useReasonDraft(options: {
  scope: string | null | undefined
  kind: ReasonDraftKind
  targetId: string
  isOpen: boolean
}): {
  reason: string
  setReason: (value: string) => void
  clearDraft: () => void
} {
  const scope = options.scope ?? null
  const [reason, setReasonState] = useState('')

  useEffect(() => {
    if (!options.isOpen) return
    setReasonState(readReasonDraft(scope, options.kind, options.targetId))
  }, [options.isOpen, options.kind, options.targetId, scope])

  const setReason = useCallback(
    (value: string) => {
      setReasonState(value)
      writeReasonDraft(scope, options.kind, options.targetId, value)
    },
    [options.kind, options.targetId, scope],
  )

  const clearDraft = useCallback(() => {
    clearReasonDraft(scope, options.kind, options.targetId)
    setReasonState('')
  }, [options.kind, options.targetId, scope])

  return { reason, setReason, clearDraft }
}
