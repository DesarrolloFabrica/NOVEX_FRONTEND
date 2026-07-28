import { loginWithCredentialsRequest } from '@/modules/auth/services/auth-session.service'
import type { User } from '@/modules/auth/types/user.types'

/** Inicia sesión con la credencial (ID Token) devuelta por Google. */
export async function loginWithGoogleRequest(credential: string): Promise<User> {
  return loginWithCredentialsRequest('/auth/google', { credential })
}

/** Inicia sesión con correo institucional registrado en la plataforma. */
export async function loginWithEmailRequest(email: string): Promise<User> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    throw new Error('Ingresa un correo para continuar.')
  }
  if (
    !normalized.includes('@') ||
    normalized.startsWith('@') ||
    normalized.endsWith('@')
  ) {
    throw new Error('Ingresa un correo válido.')
  }

  return loginWithCredentialsRequest('/auth/email', { email: normalized })
}
