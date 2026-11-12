/**
 * Respuesta simulada de `GET /auth/me` con el contrato vigente.
 *
 * La app toma los permisos SOLO de `permissions[]` en la raíz de la respuesta
 * (commit 688830f). Muchas simulaciones seguían enviándolos dentro de `user`
 * (formato anterior) y los usuarios de prueba entraban sin ningún permiso: sin
 * «Registrar situación», sin avance de estado… Este ayudante publica los
 * permisos en los dos sitios.
 */
export function authMeBody<T extends { permissions?: readonly string[] }>(user: T) {
  const codes = user.permissions ?? []
  return {
    user,
    permissions: codes.map((code) => ({
      id: code,
      code,
      name: code,
      module: 'e2e',
      description: null,
    })),
  }
}
