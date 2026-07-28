// Capa: página de acceso de la plataforma Cunmark
// Responsabilidad: presentar acceso por Google y correo.

import { GoogleLogin } from '@react-oauth/google'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/hooks/useAuth'

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
  const loginAttemptedRef = useRef(false)
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const [googleButtonWidth, setGoogleButtonWidth] = useState(360)
  const googleButtonReadyRef = useRef(false)

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
    if (!element || googleButtonReadyRef.current) return

    const width = element.offsetWidth
    if (width > 0) {
      setGoogleButtonWidth(width)
      googleButtonReadyRef.current = true
    }
  }, [])

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginAttemptedRef.current = true
    void loginWithEmail(email)
  }

  const handleGoogleSuccess = (credential?: string) => {
    if (!credential) return
    loginAttemptedRef.current = true
    void loginWithGoogle(credential)
  }

  const isBusy = loading || bootSplashActive
  const canSubmitEmail = email.trim().length > 0 && !isBusy

  return (
    <main className="cunmark-login">
      <div className="cunmark-login__atmosphere" aria-hidden="true">
        <div className="cunmark-login__grid" />
        <div className="cunmark-login__constellation" />
        <div className="cunmark-login__orbital cunmark-login__orbital--outer" />
        <div className="cunmark-login__orbital cunmark-login__orbital--inner" />
        <div className="cunmark-login__horizon" />
      </div>

      <div className="cunmark-login__shell">
        <section className="cunmark-login__intro" aria-labelledby="cunmark-login-title">
          <div className="cunmark-login__eyebrow">
            <span aria-hidden="true" />
            Equipo desarrollo de operaciones
          </div>

          <div className="cunmark-login__identity">
            <div className="cunmark-login__mark-stage" aria-hidden="true">
              <div className="cunmark-login__mark-halo" />
              <div className="cunmark-login__mark-orbit" />
              <img src="/cunmark-mark.png" alt="" draggable={false} />
            </div>

            <div className="cunmark-login__wordmark">
              <h1 id="cunmark-login-title">CUNMARK</h1>
              <div><span /> Inteligencia para decidir <span /></div>
            </div>
          </div>

          <p className="cunmark-login__intro-copy">
            Plataforma de monitoreo e inteligencia operacional para una gestión
            estratégica y decisiones oportunas.
          </p>

          <dl className="cunmark-login__capabilities" aria-label="Capacidades de la plataforma">
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

        <section className="cunmark-login__panel" aria-labelledby="access-title">
          <div className="cunmark-login__panel-glow" aria-hidden="true" />
          <header className="cunmark-login__panel-header">
            <p className="cunmark-login__panel-kicker"><span /> Bienvenido <span /></p>
            <h2 id="access-title">Accede a <strong>Cunmark</strong></h2>
            <p className="cunmark-login__panel-lead">
              Ingresa con Google o con tu correo institucional.
            </p>
          </header>

          {error && (
            <p className="cunmark-login__error" role="alert">
              {error}
            </p>
          )}

          <div className="cunmark-login__auth-stack">
            <div
              ref={googleButtonRef}
              className="cunmark-login__google-action"
              data-loading={isBusy ? 'true' : 'false'}
            >
              <span className="cunmark-login__google-action-main" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Entrar con Google
              </span>

              <div className="cunmark-login__google-action-trigger">
                <GoogleLogin
                  onSuccess={(response) => handleGoogleSuccess(response.credential)}
                  onError={() => undefined}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width={googleButtonWidth}
                />
              </div>
            </div>

            <div className="cunmark-login__separator" aria-hidden="true">
              <span />
              <b>o</b>
              <span />
            </div>

            <form className="cunmark-login__email-form" onSubmit={handleEmailSubmit}>
              <label className="cunmark-login__field-label" htmlFor="login-email">
                Correo electrónico
              </label>
              <div className="cunmark-login__input-wrap">
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
                  className="cunmark-login__input"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmitEmail}
                aria-busy={loading}
                className="cunmark-login__primary-action"
              >
                <span>Continuar con correo</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          </div>

          <footer
            className="cunmark-login__panel-footer"
            aria-live="polite"
            data-state={isBusy ? 'loading' : 'ready'}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 3.5 19 7v5c0 4.3-2.8 7.4-7 8.5C7.8 19.4 5 16.3 5 12V7l7-3.5Z" />
              <path d="m9.2 12 1.8 1.8 3.8-4" />
            </svg>
            <p className="cunmark-login__security-copy">
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
