// Capa: página de acceso de la plataforma Novex
// Responsabilidad: presentar acceso por Google y, en local, por correo.

import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleLandingPath } from '@/modules/auth/utils/roleExperience'
import { setPostLoginDestination } from '@/modules/auth/utils/postLoginDestination'
import {
  consumeSessionExpiryNotice,
  sanitizeReturnPath,
  type SessionExpiryNotice,
} from '@/modules/auth/utils/sessionExpiryNotice'
import { LoginStageSpotlight } from '@/pages/LoginStageSpotlight'
import type { NovexCharacterHandle } from '@/shared/character/NovexCharacterFigure'
import { POST_LOGIN_REACTION, reactionHoldMs } from '@/shared/transition/postLoginTransition'
import { usePostLoginTransitionCue } from '@/shared/transition/postLoginTransitionCue'

/** Solo en local: VITE_ENABLE_EMAIL_LOGIN=true. En deploy no se define → solo Google. */
const emailLoginEnabled = import.meta.env.VITE_ENABLE_EMAIL_LOGIN === 'true'

function resolvePostLoginPath(
  userId: string | undefined,
  notice: SessionExpiryNotice | null,
  locationFrom: unknown,
): string | null {
  const fromState = sanitizeReturnPath(
    locationFrom &&
      typeof locationFrom === 'object' &&
      'from' in locationFrom
      ? (locationFrom as { from?: unknown }).from
      : null,
  )
  if (notice?.returnPath && notice.userId && notice.userId === userId) {
    return notice.returnPath
  }
  // Sin aviso de caducidad ligado al usuario: no restaurar rutas ajenas.
  if (!notice && fromState) return fromState
  return null
}

export function LoginPage() {
  const {
    isAuthenticated,
    loading,
    error,
    user,
    bootSplashActive,
    beginBootSplash,
    loginWithEmail,
    loginWithGoogle,
  } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [expiryNotice, setExpiryNotice] = useState<SessionExpiryNotice | null>(
    null,
  )
  const loginAttemptedRef = useRef(false)
  const characterRef = useRef<NovexCharacterHandle>(null)
  const celebratedRef = useRef(false)
  const transitionCue = usePostLoginTransitionCue()
  const pendingNoticeRef = useRef<SessionExpiryNotice | null>(null)

  useEffect(() => {
    const notice = consumeSessionExpiryNotice()
    pendingNoticeRef.current = notice
    setExpiryNotice(notice)
  }, [])

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) return

    if (loginAttemptedRef.current) {
      // Inicio de la transición teatral: el personaje celebra y el host global
      // (PostLoginCurtainTransition) espera su reacción antes de cerrar cortinas.
      // Si el personaje aún no estaba listo, no hay reacción que esperar.
      if (!celebratedRef.current) {
        celebratedRef.current = true
        const accepted = characterRef.current?.playReaction(POST_LOGIN_REACTION) ?? false
        transitionCue.holdForReaction(reactionHoldMs(accepted))
      }
      beginBootSplash()
      return
    }

    const restored = resolvePostLoginPath(
      user?.id,
      pendingNoticeRef.current,
      location.state,
    )
    pendingNoticeRef.current = null
    navigate(restored ?? getRoleLandingPath(user), { replace: true })
  }, [
    beginBootSplash,
    isAuthenticated,
    loading,
    location.state,
    navigate,
    transitionCue,
    user,
  ])

  const captureReturnDestination = () => {
    const notice = pendingNoticeRef.current
    const path = resolvePostLoginPath(
      notice?.userId ?? undefined,
      notice,
      location.state,
    )
    if (!path) {
      setPostLoginDestination(null)
      return
    }
    setPostLoginDestination({
      path,
      // Con aviso de caducidad exigimos el mismo usuario al restaurar.
      userId: notice?.userId ?? null,
    })
  }

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginAttemptedRef.current = true
    captureReturnDestination()
    void loginWithEmail(email)
  }

  const handleGoogleSuccess = (credential?: string) => {
    if (!credential) return
    setGoogleError(null)
    loginAttemptedRef.current = true
    captureReturnDestination()
    void loginWithGoogle(credential)
  }

  const handleGoogleError = () => {
    setGoogleError(
      'No se pudo abrir el acceso con Google. Revise el origen autorizado o permita ventanas emergentes.',
    )
  }

  const isBusy = loading || bootSplashActive
  const canSubmitEmail = email.trim().length > 0 && !isBusy
  const authError = error || googleError

  return (
    <main className="novex-login-stage">
      {/* Capas escénicas. Las cortinas (fases siguientes) se montan entre overlay y contenido. */}
      <div className="novex-login-stage__background" aria-hidden="true" />
      <div className="novex-login-stage__overlay" aria-hidden="true" />

      <div className="novex-login-stage__content">
        <div className="novex-login-stage__identity">
        <header className="novex-login-stage__brand">
          <p className="novex-login-stage__eyebrow">
            <span aria-hidden="true" />
            Centro operacional
            <span aria-hidden="true" />
          </p>
          <div className="novex-login-stage__title"><h1>NOVEX</h1></div>
          <p className="novex-login-stage__tagline">Inteligencia para decidir</p>
        </header>

        {/* Zona del personaje: marquesina de luces + personaje Rive. */}
        <div className="novex-login-stage__character-slot">
          <LoginStageSpotlight characterRef={characterRef} />
        </div>
        </div>

        <section className="novex-login-stage__panel" aria-labelledby="access-title">
          <header className="novex-login-stage__panel-header">
            <h2 id="access-title">Accede a tu cuenta</h2>
            <p className="novex-login-stage__panel-lead">
              {emailLoginEnabled
                ? 'Ingresa con tu cuenta institucional para continuar en el Centro Operacional.'
                : 'Ingresa con tu cuenta de Google institucional para continuar en el Centro Operacional.'}
            </p>
          </header>

          <div
            className="novex-login-stage__status"
            data-occupied={authError || expiryNotice ? 'true' : 'false'}
            aria-live="polite"
          >
            {authError ? (
              <p className="novex-login-stage__error" role="alert">
                {authError}
              </p>
            ) : expiryNotice ? (
              <p className="novex-login-stage__error" role="status">
                {expiryNotice.message}
              </p>
            ) : null}
          </div>

          <div className="novex-login-stage__auth-stack">
            {/* Botón oficial de Google (visible): el overlay casi invisible falla en deploy/FedCM. */}
            <div
              className="novex-login-stage__google"
              data-loading={isBusy ? 'true' : 'false'}
            >
              <GoogleLogin
                onSuccess={(response) => handleGoogleSuccess(response.credential)}
                onError={handleGoogleError}
                useOneTap={false}
                ux_mode="popup"
                theme="outline"
                size="large"
                width="400"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
              />
            </div>

            {emailLoginEnabled && (
              <>
                <div className="novex-login-stage__separator" aria-hidden="true">
                  <span />
                  <b>o</b>
                  <span />
                </div>

                <form className="novex-login-stage__email-form" onSubmit={handleEmailSubmit}>
                  <label className="novex-login-stage__field-label" htmlFor="login-email">
                    Correo electrónico
                  </label>
                  <div className="novex-login-stage__input-wrap">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M4 6.5h16v11H4z" />
                      <path d="m5 7.5 7 5.5 7-5.5" />
                    </svg>
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="nombre@institucion.edu"
                      value={email}
                      disabled={isBusy}
                      onChange={(event) => setEmail(event.target.value)}
                      className="novex-login-stage__input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmitEmail}
                    aria-busy={loading}
                    className="novex-login-stage__primary-action"
                  >
                    <span>Continuar con correo</span>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M5 12h13M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </div>

          <footer
            className="novex-login-stage__panel-footer"
            aria-live="polite"
            data-state={isBusy ? 'loading' : 'ready'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 3.5 19 7v5c0 4.3-2.8 7.4-7 8.5C7.8 19.4 5 16.3 5 12V7l7-3.5Z" />
              <path d="m9.2 12 1.8 1.8 3.8-4" />
            </svg>
            <p className="novex-login-stage__security-copy">
              {bootSplashActive
                ? 'Abriendo plataforma…'
                : loading
                  ? 'Estableciendo conexión segura…'
                  : 'Conexión segura y protegida'}
            </p>
          </footer>
        </section>
      </div>

    </main>
  )
}
