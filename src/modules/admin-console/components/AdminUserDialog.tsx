import { useMemo, useState } from 'react'
import type {
  AdminCoordination,
  AdminRole,
  AdminUser,
  AdminUserInput,
} from '@/modules/api/admin.api'
import { AdminDialog, AdminField } from '@/modules/admin-console/components/AdminDialog'

const COORDINATOR_ROLE = 'COORDINADOR'

/**
 * Alta y edición de usuarios (`POST /users`, `PATCH /users/:id`).
 *
 * Un COORDINADOR necesita coordinación (lo valida también el backend); el
 * resto puede tener alcance global. El correo no se edita: identifica la
 * cuenta para el inicio de sesión con Google.
 */
export function AdminUserDialog({
  user,
  roles,
  coordinations,
  isSelf,
  onSubmit,
  onClose,
}: {
  /** `null` = alta. */
  user: AdminUser | null
  roles: AdminRole[]
  coordinations: AdminCoordination[]
  /** El admin editándose a sí mismo: rol y estado bloqueados. */
  isSelf: boolean
  onSubmit: (input: AdminUserInput) => Promise<void>
  onClose: () => void
}) {
  const activeRoles = useMemo(
    () => roles.filter((role) => role.isActive || role.code === user?.roleCode),
    [roles, user],
  )
  const activeCoordinations = useMemo(
    () =>
      coordinations
        .filter((item) => item.isActive || item.id === user?.coordinationId)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [coordinations, user],
  )

  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [roleCode, setRoleCode] = useState(
    user?.roleCode ?? activeRoles.find((role) => role.code === COORDINATOR_ROLE)?.code ?? activeRoles[0]?.code ?? '',
  )
  const [coordinationId, setCoordinationId] = useState<string>(user?.coordinationId ?? '')
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(
    user?.status === 'ACTIVE' || !user ? 'ACTIVE' : 'INACTIVE',
  )

  const needsCoordination = roleCode === COORDINATOR_ROLE

  return (
    <AdminDialog
      eyebrow={user ? 'Editar usuario' : 'Nuevo usuario'}
      title={user ? user.fullName : 'Dar de alta un usuario'}
      submitLabel={user ? 'Guardar cambios' : 'Crear usuario'}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          roleCode,
          coordinationId: coordinationId || null,
          status,
        })
      }
    >
      <AdminField label="Nombre completo" wide>
        <input
          required
          minLength={2}
          maxLength={200}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="off"
        />
      </AdminField>

      <AdminField
        label="Correo institucional"
        hint={user ? 'El correo identifica la cuenta y no se puede cambiar.' : 'Con este correo iniciará sesión.'}
        wide
      >
        <input
          type="email"
          required
          maxLength={320}
          value={email}
          disabled={!!user}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="off"
        />
      </AdminField>

      <AdminField label="Rol" hint={isSelf ? 'No puede cambiar su propio rol.' : undefined}>
        <select
          required
          value={roleCode}
          disabled={isSelf}
          onChange={(event) => {
            setRoleCode(event.target.value)
            if (event.target.value === COORDINATOR_ROLE && !coordinationId) {
              setCoordinationId(activeCoordinations[0]?.id ?? '')
            }
          }}
        >
          {activeRoles.map((role) => (
            <option key={role.code} value={role.code}>
              {role.name}
            </option>
          ))}
        </select>
      </AdminField>

      <AdminField
        label="Coordinación"
        hint={needsCoordination ? 'Obligatoria para coordinadores.' : 'Sin coordinación = alcance global.'}
      >
        <select
          required={needsCoordination}
          value={coordinationId}
          onChange={(event) => setCoordinationId(event.target.value)}
        >
          {needsCoordination ? null : <option value="">Alcance global</option>}
          {needsCoordination && !coordinationId ? (
            <option value="" disabled>
              Elija una coordinación
            </option>
          ) : null}
          {activeCoordinations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.isActive ? '' : ' (inactiva)'}
            </option>
          ))}
        </select>
      </AdminField>

      <AdminField
        label="Estado"
        hint={isSelf ? 'No puede desactivar su propia cuenta.' : 'Un usuario inactivo no puede iniciar sesión.'}
      >
        <select
          value={status}
          disabled={isSelf}
          onChange={(event) => setStatus(event.target.value as 'ACTIVE' | 'INACTIVE')}
        >
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
      </AdminField>
    </AdminDialog>
  )
}
