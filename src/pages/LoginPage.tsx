// Capa: página de acceso de la plataforma Novex
// Responsabilidad: presentar acceso por Google y, en local, por correo.

import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

/** Solo en local: VITE_ENABLE_EMAIL_LOGIN=true. En deploy no se define → solo Google. */
const emailLoginEnabled = import.meta.env.VITE_ENABLE_EMAIL_LOGIN === 'true'

export function LoginPage() {
  const {
    isAuthenticated,
    loading,
    error,
    bootSplashActive,
    beginBootSplash,
    loginWithEmail,
    loginWithGoogle,
  } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [googleError, setGoogleError] = useState<string | null>(null)
  const loginAttemptedRef = useRef(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const [googleButtonWidth, setGoogleButtonWidth] = useState(360)

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) return

    if (loginAttemptedRef.current) {
      beginBootSplash()
      return
    }

    navigate('/red-impacto', { replace: true })
  }, [beginBootSplash, isAuthenticated, loading, navigate])

  useEffect(() => {
    const element = googleButtonRef.current
    if (!element) return

    const updateWidth = () => {
      const width = Math.floor(element.getBoundingClientRect().width)
      if (width > 0) setGoogleButtonWidth(width)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

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
    <main className="novex-login">
      <div className="novex-login__atmosphere" aria-hidden="true">
        <div className="novex-login__grid" />
        <div className="novex-login__constellation" />
        <div className="novex-login__orbital novex-login__orbital--outer" />
        <div className="novex-login__orbital novex-login__orbital--inner" />
        <div className="novex-login__horizon" />
      </div>

      <div className="novex-login__shell">
        <section className="novex-login__intro" aria-labelledby="novex-login-title">
          <div className="novex-login__eyebrow">
            <span aria-hidden="true" />
            Equipo desarrollo de operaciones
          </div>

          <div className="novex-login__identity">
            <div className="novex-login__mark-stage" aria-hidden="true">
              <div className="novex-login__mark-halo" />
              <div className="novex-login__mark-orbit" />
              <img src="/novex-mark.png" alt="" draggable={false} />
            </div>

            <div className="novex-login__wordmark">
              <h1 id="novex-login-title">NOVEX</h1>
              <div><span /> Inteligencia para decidir <span /></div>
            </div>
          </div>

          <p className="novex-login__intro-copy">
            Plataforma de monitoreo e inteligencia operacional para una gestión
            estratégica y decisiones oportunas.
          </p>

          <dl className="novex-login__capabilities" aria-label="Capacidades de la plataforma">
            <div>
              <dt>Monitoreo</dt>
              <dd>en tiempo real</dd>
            </div>
            <div>
              <dt>Análisis</dt>
              <dd>operacional</dd>
            </div>
            <div>
              <dt>Decisiones</dt>
              <dd>informadas</dd>
            </div>
          </dl>
        </section>

        <section className="novex-login__panel" aria-labelledby="access-title">
          <div className="novex-login__panel-glow" aria-hidden="true" />
          <header className="novex-login__panel-header">
            <p className="novex-login__panel-kicker"><span /> Bienvenido <span /></p>
            <h2 id="access-title">Accede a <strong>Novex</strong></h2>
            <p className="novex-login__panel-lead">
              {emailLoginEnabled
                ? 'Ingresa con Google o con tu correo institucional.'
                : 'Ingresa con tu cuenta de Google institucional.'}
            </p>
          </header>

          {authError && (
            <p className="novex-login__error" role="alert">
              {authError}
            </p>
          )}

          <div className="novex-login__auth-stack">
            {/* Botón oficial de Google (visible): el overlay casi invisible falla en deploy/FedCM. */}
            <div
              ref={googleButtonRef}
              className="novex-login__google-official"
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
                width={googleButtonWidth}
                logo_alignment="left"
              />
            </div>

            {emailLoginEnabled && (
              <>
                <div className="novex-login__separator" aria-hidden="true">
                  <span />
                  <b>o</b>
                  <span />
                </div>

                <form className="novex-login__email-form" onSubmit={handleEmailSubmit}>
                  <label className="novex-login__field-label" htmlFor="login-email">
                    Correo electrónico
                  </label>
                  <div className="novex-login__input-wrap">
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
                      className="novex-login__input"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!canSubmitEmail}
                    aria-busy={loading}
                    className="novex-login__primary-action"
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
            className="novex-login__panel-footer"
            aria-live="polite"
            data-state={isBusy ? 'loading' : 'ready'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 3.5 19 7v5c0 4.3-2.8 7.4-7 8.5C7.8 19.4 5 16.3 5 12V7l7-3.5Z" />
              <path d="m9.2 12 1.8 1.8 3.8-4" />
            </svg>
            <p className="novex-login__security-copy">
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
