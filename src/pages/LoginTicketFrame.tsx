// Capa: marco decorativo del panel de acceso (ticket crema).
// Responsabilidad: papel, doble filete y remates. Sin lógica ni contenido.

const CORNERS = ['tl', 'tr', 'bl', 'br'] as const

/**
 * Mismo lenguaje que el ticket del Centro Operacional (papel crema, desgaste de
 * tinta, remates en curva), pero propio del login: no depende de los temas
 * operacionales y es más ligero (filetes finos, sin marca de agua ni adornos).
 */
export function LoginTicketFrame() {
  return (
    <div className="novex-login-ticket" aria-hidden="true">
      <div className="novex-login-ticket__paper" />
      <div className="novex-login-ticket__frame" />
      {CORNERS.map((corner) => (
        <svg
          key={corner}
          className={`novex-login-ticket__corner novex-login-ticket__corner--${corner}`}
          viewBox="0 0 18 18"
          focusable="false"
        >
          <path d="M 4 11 C 4 6.5 6.2 4 11 4" strokeWidth="1.35" />
          <path d="M 7 9.5 C 7 7.2 8.2 6 10.5 6" strokeWidth="1" opacity="0.85" />
        </svg>
      ))}
    </div>
  )
}
