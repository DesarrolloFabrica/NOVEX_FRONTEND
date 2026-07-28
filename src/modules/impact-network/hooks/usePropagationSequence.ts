import { useCallback, useEffect, useRef, useState } from 'react'
import type { StarPropagationFrame } from '@/modules/impact-network/types/impact-network.types'

export type PropagationPlaybackState =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'complete'

export interface UsePropagationSequenceOptions {
  frames: readonly StarPropagationFrame[]
  reducedMotion?: boolean
  onComplete?: () => void
}

export interface UsePropagationSequenceResult {
  playbackState: PropagationPlaybackState
  currentFrame: StarPropagationFrame | null
  currentFrameIndex: number
  play: () => void
  pause: () => void
  reset: () => void
  skipToEnd: () => void
}

const DEFAULT_STEP_MS = 1250

export function usePropagationSequence({
  frames,
  reducedMotion = false,
  onComplete,
}: UsePropagationSequenceOptions): UsePropagationSequenceResult {
  const [playbackState, setPlaybackState] =
    useState<PropagationPlaybackState>('idle')
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1)
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const elapsedRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const currentFrame =
    currentFrameIndex >= 0 ? (frames[currentFrameIndex] ?? null) : null

  const advanceToElapsed = useCallback(
    (elapsedMs: number) => {
      if (frames.length === 0) {
        setCurrentFrameIndex(-1)
        setPlaybackState('idle')
        return
      }

      const index = [...frames]
        .map((frame, frameIndex) => ({ frame, frameIndex }))
        .reverse()
        .find((item) => item.frame.playbackAtMs <= elapsedMs)?.frameIndex

      const nextIndex = index ?? 0
      setCurrentFrameIndex(nextIndex)
      const frame = frames[nextIndex]
      if (frame?.complete) {
        setPlaybackState('complete')
        onComplete?.()
      }
    },
    [frames, onComplete],
  )

  const reset = useCallback(() => {
    clearTimer()
    elapsedRef.current = 0
    setCurrentFrameIndex(-1)
    setPlaybackState('idle')
  }, [clearTimer])

  const skipToEnd = useCallback(() => {
    clearTimer()
    if (frames.length === 0) {
      reset()
      return
    }
    const lastIndex = frames.length - 1
    setCurrentFrameIndex(lastIndex)
    setPlaybackState('complete')
    onComplete?.()
  }, [clearTimer, frames.length, onComplete, reset])

  const play = useCallback(() => {
    if (frames.length === 0) return
    clearTimer()

    if (reducedMotion) {
      skipToEnd()
      return
    }

    if (playbackState === 'complete') {
      elapsedRef.current = 0
      setCurrentFrameIndex(0)
    }

    setPlaybackState('playing')
    startedAtRef.current = performance.now() - elapsedRef.current

    timerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAtRef.current
      elapsedRef.current = elapsed
      advanceToElapsed(elapsed)

      const lastFrame = frames.at(-1)
      if (lastFrame && elapsed >= lastFrame.playbackAtMs) {
        clearTimer()
        setPlaybackState('complete')
        onComplete?.()
      }
    }, DEFAULT_STEP_MS / 4)
  }, [
    advanceToElapsed,
    clearTimer,
    frames,
    onComplete,
    playbackState,
    reducedMotion,
    skipToEnd,
  ])

  const pause = useCallback(() => {
    if (playbackState !== 'playing') return
    clearTimer()
    setPlaybackState('paused')
  }, [clearTimer, playbackState])

  useEffect(() => () => clearTimer(), [clearTimer])

  useEffect(() => {
    reset()
  }, [frames, reset])

  return {
    playbackState,
    currentFrame,
    currentFrameIndex,
    play,
    pause,
    reset,
    skipToEnd,
  }
}
