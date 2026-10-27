// Capa: componente compartido (host de la transición post-login).
// Responsabilidad: orquestar las cortinas a nivel de router para que sobrevivan
// al desmontaje de LoginPage. Sustituye la presentación de PostLoginBootSplash
// y conserva su contrato con AuthContext (bootSplashActive / endBootSplash).

import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleLandingPath } from '@/modules/auth/utils/roleExperience'
import { LoginCurtains } from '@/shared/components/LoginCurtains'
import {
  CURTAIN_SETTLE_FALLBACK_MS,
  DESTINATION_MOUNT_FALLBACK_MS,
  curtainStateForPhase,
  postLoginTransitionReducer,
} from '@/shared/transition/postLoginTransition'
import type { LoginCurtainsState } from '@/shared/transition/postLoginTransition'
import { usePostLoginTransitionCue } from '@/shared/transition/postLoginTransitionCue'

const LOGIN_PATH = '/login'

/**
 * Secuencia (ver `postLoginTransition`):
 *   reacting  el personaje reproduce happy_1 (lo pide LoginPage); se espera su
 *             duración solo si la aceptó (si Rive no estaba listo, 0 ms)
 *   closing   las cortinas se cierran
 *   covered   pantalla tapada → se navega a la ruta del rol
 *   opening   el destino ya montó → las cortinas se retiran
 *   idle      endBootSplash(): libera onboarding y loaders, como hacía el splash
 *
 * `bootSplashActive` sigue siendo la señal de "transición post-login en curso"
 * para el resto de la app; su ciclo de vida no cambia.
 */
export function PostLoginCurtainTransition() {
  const { bootSplashActive, endBootSplash, user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [phase, dispatch] = useReducer(postLoginTransitionReducer, 'idle')
  const cue = usePostLoginTransitionCue()

  const userRef = useRef(user)
  userRef.current = user
  /** Ruta desde la que se navegó; null mientras no se haya navegado. */
  const navigatedFromRef = useRef<string | null>(null)

  // Arranque y aborto por FLANCOS de bootSplashActive: al terminar, la fase vuelve
  // a idle un render antes de que endBootSplash() apague la señal; mirar el valor
  // (y no el cambio) relanzaría la transición sobre la pantalla destino.
  const wasActiveRef = useRef(false)
  useEffect(() => {
    if (bootSplashActive && !wasActiveRef.current) dispatch('start')
    if (!bootSplashActive && wasActiveRef.current) dispatch('abort')
    wasActiveRef.current = bootSplashActive
  }, [bootSplashActive])

  useEffect(() => {
    if (phase === 'idle') navigatedFromRef.current = null
  }, [phase])

  // reacting: espera lo que LoginPage anotó (la reacción aceptada, o nada).
  // La anotación se lee una vez al entrar en la fase.
  const reactionHoldRef = useRef<number | null>(null)
  useEffect(() => {
    if (phase !== 'reacting') {
      reactionHoldRef.current = null
      return
    }
    if (reactionHoldRef.current === null) reactionHoldRef.current = cue.takeReactionHold()
    const holdMs = reactionHoldRef.current
    if (holdMs <= 0) {
      dispatch('reaction-done')
      return
    }
    const timer = window.setTimeout(() => dispatch('reaction-done'), holdMs)
    return () => window.clearTimeout(timer)
  }, [phase, cue])

  // closing / opening: el avance real lo da `onSettled`; esto es solo red de seguridad.
  useEffect(() => {
    if (phase !== 'closing' && phase !== 'opening') return
    const event = phase === 'closing' ? 'curtains-closed' : 'curtains-opened'
    const timer = window.setTimeout(() => dispatch(event), CURTAIN_SETTLE_FALLBACK_MS)
    return () => window.clearTimeout(timer)
  }, [phase])

  // covered: navegar UNA vez, con la pantalla ya tapada.
  useEffect(() => {
    if (phase !== 'covered' || navigatedFromRef.current !== null) return
    navigatedFromRef.current = pathname
    navigate(getRoleLandingPath(userRef.current), { replace: true })
  }, [phase, pathname, navigate])

  // covered → opening: cuando la ruta cambió (el destino se montó en este commit)
  // y ya se pintó; dos frames garantizan que el destino está en pantalla.
  useEffect(() => {
    if (phase !== 'covered' || navigatedFromRef.current === null) return

    const fallback = window.setTimeout(
      () => dispatch('destination-mounted'),
      DESTINATION_MOUNT_FALLBACK_MS,
    )
    if (pathname === navigatedFromRef.current) return () => window.clearTimeout(fallback)

    let second = 0
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => dispatch('destination-mounted'))
    })
    return () => {
      window.clearTimeout(fallback)
      window.cancelAnimationFrame(first)
      window.cancelAnimationFrame(second)
    }
  }, [phase, pathname])

  const handleSettled = useCallback((state: LoginCurtainsState) => {
    if (state === 'closed') dispatch('curtains-closed')
    if (state === 'retracted') dispatch('curtains-opened')
  }, [])

  // opening → idle: fin de la transición; mismo cierre que tenía el splash
  // (libera onboarding y loaders). Llega igual por onSettled o por el fallback.
  const previousPhase = useRef(phase)
  useEffect(() => {
    if (previousPhase.current === 'opening' && phase === 'idle' && bootSplashActive) endBootSplash()
    previousPhase.current = phase
  }, [phase, bootSplashActive, endBootSplash])

  const curtainState = curtainStateForPhase(phase, pathname === LOGIN_PATH)
  if (!curtainState) return null

  return (
    <LoginCurtains
      state={curtainState}
      blockInput={phase !== 'idle'}
      onSettled={handleSettled}
    />
  )
}
