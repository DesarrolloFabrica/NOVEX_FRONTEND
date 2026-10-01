// Capa: página de acceso de la plataforma Novex
// Responsabilidad: presentar acceso por Google y, en local, por correo.

import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { getRoleLandingPath } from '@/modules/auth/utils/roleExperience'
import {
  NOVEX_BETA_HINT,
  NOVEX_BETA_LABEL,
} from '@/shared/constants/platformStatus'

/** Solo en local: VITE_ENABLE_EMAIL_LOGIN=true. En deploy no se define → solo Google. */
const emailLoginEnabled = import.meta.env.VITE_ENABLE_EMAIL_LOGIN === 'true'

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
  const [email, setEmail] = useState('')
  const [googleError, setGoogleError] = useState<string | null>(null)
  const loginAttemptedRef = useRef(false)

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) return

    if (loginAttemptedRef.current) {
      beginBootSplash()
      return
    }

    navigate(getRoleLandingPath(user), { replace: true })
  }, [beginBootSplash, isAuthenticated, loading, navigate, user])

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginAttemptedRef.current = true
    void loginWithEmail(email)
  }

  const handleGoogleSuccess = (credential?: string) => {
    if (!credential) return
    setGoogleError(null)
    loginAttemptedRef.current = true
    void loginWithGoogle(credential)
  }

  const handleGoogleError = () => {
    setGoogleError(
      'No se pudo abrir el acceso con Google. Revisa el origen autorizado o permite ventanas emergentes.',
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
        <header className="novex-login-stage__brand">
          <p className="novex-login-stage__eyebrow">
            <span aria-hidden="true" />
            Centro operacional
            <span aria-hidden="true" />
          </p>
          <div className="novex-login-stage__title">
            <h1>NOVEX</h1>
            <span
              className="novex-beta-mark"
              title={NOVEX_BETA_HINT}
              aria-label={NOVEX_BETA_HINT}
            >
              {NOVEX_BETA_LABEL}
            </span>
          </div>
          <p className="novex-login-stage__tagline">Inteligencia para decidir</p>
        </header>

        {/* Zona del personaje: aquí entran el aro de luces y el Rive en la siguiente fase. */}
        <div className="novex-login-stage__character-slot" aria-hidden="true">
          <div className="novex-login-stage__character-placeholder" />
        </div>

        <section className="novex-login-stage__panel" aria-labelledby="access-title">
          <header className="novex-login-stage__panel-header">
            <h2 id="access-title">Accede a <strong>Novex</strong></h2>
            <p className="novex-login-stage__panel-lead">
              {emailLoginEnabled
                ? 'Ingresa con Google o con tu correo institucional.'
                : 'Ingresa con tu cuenta de Google institucional.'}
            </p>
          </header>

          {authError && (
            <p className="novex-login-stage__error" role="alert">
              {authError}
            </p>
          )}

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
                theme="filled_black"
                size="large"
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
