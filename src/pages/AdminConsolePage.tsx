import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchAdminOverview,
  updateAdminUserStatus,
  type AdminOverview,
  type AdminUser,
} from '@/modules/api/admin.api'
import { MainScreen, NovexFrame, NovexRoom } from '@/modules/room'
import { ScreenDeck } from '@/modules/monitoring/components/ScreenDeck'
import { NovexProductHeader } from '@/shared/components/NovexProductHeader'
import { NovexIcon, type NovexIconName } from '@/shared/components/NovexIcon'
import { getErrorMessage } from '@/shared/utils/error'

type AdminSection =
  'usuarios' | 'roles' | 'coordinaciones' | 'permisos' | 'sistema'

const EMPTY_OVERVIEW: AdminOverview = {
  users: [],
  roles: [],
  permissions: [],
  coordinations: [],
}

const SECTIONS: Array<{
  id: AdminSection
  label: string
  icon: NovexIconName
}> = [
  { id: 'usuarios', label: 'Usuarios', icon: 'users' },
  { id: 'roles', label: 'Roles', icon: 'shield' },
  { id: 'coordinaciones', label: 'Coordinaciones', icon: 'grid' },
  { id: 'permisos', label: 'Permisos', icon: 'check' },
  { id: 'sistema', label: 'Sistema y auditoría', icon: 'settings' },
]

function formatDate(value: string | null): string {
  if (!value) return 'Sin ingreso registrado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function AdminConsolePage() {
  const [data, setData] = useState<AdminOverview>(EMPTY_OVERVIEW)
  const [section, setSection] = useState<AdminSection>('usuarios')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingStatusUser, setPendingStatusUser] = useState<AdminUser | null>(
    null,
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetchAdminOverview())
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => void load(), [load])

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es')
    if (!normalized) return data.users
    return data.users.filter((user) =>
      [
        user.fullName,
        user.email,
        user.roleName,
        user.coordinationName ?? '',
      ].some((value) => value.toLocaleLowerCase('es').includes(normalized)),
    )
  }, [data.users, query])

  async function confirmToggleUser() {
    if (!pendingStatusUser) return
    const user = pendingStatusUser
    const status = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setUpdatingId(user.id)
    setError(null)
    try {
      const updated = await updateAdminUserStatus(user.id, status)
      setData((current) => ({
        ...current,
        users: current.users.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      }))
      setPendingStatusUser(null)
    } catch (updateError) {
      setError(getErrorMessage(updateError))
    } finally {
      setUpdatingId(null)
    }
  }

  const activeUsers = data.users.filter(
    (user) => user.status === 'ACTIVE',
  ).length

  return (
    <NovexRoom environment="healthy" scene="admin">
      <NovexFrame environment="healthy">
        <MainScreen environment="healthy">
          <ScreenDeck
            environment="healthy"
            className="novex-admin-deck"
            header={
              <NovexProductHeader
                eyebrow="Administración de plataforma"
                title="Control del sistema"
                context="Usuarios, acceso, catálogos y configuración institucional"
                help={
                  <p>
                    Administre el acceso y consulte la configuración efectiva de
                    NOVEX.
                  </p>
                }
              />
            }
          >
            <main className="novex-admin" data-tour="admin-console">
              <section
                className="novex-admin__summary"
                aria-label="Estado administrativo"
              >
                <article>
                  <strong>{activeUsers}</strong>
                  <span>Usuarios activos</span>
                </article>
                <article>
                  <strong>
                    {data.roles.filter((role) => role.isActive).length}
                  </strong>
                  <span>Roles vigentes</span>
                </article>
                <article>
                  <strong>
                    {data.coordinations.filter((item) => item.isActive).length}
                  </strong>
                  <span>Coordinaciones</span>
                </article>
                <article>
                  <strong>{data.permissions.length}</strong>
                  <span>Permisos centralizados</span>
                </article>
              </section>

              <div className="novex-admin__workspace">
                <nav
                  className="novex-admin__sections"
                  aria-label="Herramientas administrativas"
                >
                  {SECTIONS.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={section === item.id ? 'is-active' : ''}
                      aria-pressed={section === item.id}
                      onClick={() => setSection(item.id)}
                    >
                      <NovexIcon name={item.icon} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </nav>

                <section className="novex-admin__panel" aria-live="polite">
                  {error ? (
                    <div className="novex-admin__state" role="alert">
                      <NovexIcon name="alert" />
                      <p>{error}</p>
                      <button type="button" onClick={() => void load()}>
                        Reintentar
                      </button>
                    </div>
                  ) : loading ? (
                    <div className="novex-admin__state" aria-busy="true">
                      <span className="novex-admin__loader" />
                      <p>Cargando configuración segura…</p>
                    </div>
                  ) : section === 'usuarios' ? (
                    <>
                      <header className="novex-admin__panel-head">
                        <div>
                          <span>Acceso</span>
                          <h2>Usuarios</h2>
                        </div>
                        <label>
                          <span className="sr-only">Buscar usuarios</span>
                          <NovexIcon name="search" />
                          <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Buscar usuario, rol o coordinación"
                          />
                        </label>
                      </header>
                      <div className="novex-admin__table-wrap">
                        <table className="novex-admin__table">
                          <thead>
                            <tr>
                              <th>Usuario</th>
                              <th>Rol</th>
                              <th>Coordinación</th>
                              <th>Último acceso</th>
                              <th>Estado</th>
                              <th>
                                <span className="sr-only">Acción</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((user) => (
                              <tr key={user.id}>
                                <td>
                                  <strong>{user.fullName}</strong>
                                  <small>{user.email}</small>
                                </td>
                                <td>{user.roleName}</td>
                                <td>
                                  {user.coordinationName ?? 'Alcance global'}
                                </td>
                                <td>{formatDate(user.lastLoginAt)}</td>
                                <td>
                                  <span
                                    className="novex-admin__status"
                                    data-active={user.status === 'ACTIVE'}
                                  >
                                    {user.status === 'ACTIVE'
                                      ? 'Activo'
                                      : 'Inactivo'}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="novex-admin__row-action"
                                    disabled={updatingId === user.id}
                                    onClick={() => setPendingStatusUser(user)}
                                  >
                                    {updatingId === user.id
                                      ? 'Guardando…'
                                      : user.status === 'ACTIVE'
                                        ? 'Desactivar'
                                        : 'Activar'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredUsers.length === 0 ? (
                          <p className="novex-admin__empty">
                            No hay usuarios que coincidan con la búsqueda.
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : section === 'roles' ? (
                    <CatalogList
                      title="Roles y alcance"
                      items={data.roles.map((role) => ({
                        code: role.code,
                        name: role.name,
                        detail: role.description ?? 'Rol del sistema',
                      }))}
                    />
                  ) : section === 'coordinaciones' ? (
                    <CatalogList
                      title="Coordinaciones"
                      items={data.coordinations.map((item) => ({
                        code: item.code,
                        name: item.name,
                        detail: item.isActive ? 'Operativa' : 'Inactiva',
                      }))}
                    />
                  ) : section === 'permisos' ? (
                    <CatalogList
                      title="Matriz de permisos"
                      items={data.permissions.map((item) => ({
                        code: item.code,
                        name: item.name,
                        detail: item.module,
                      }))}
                    />
                  ) : (
                    <div className="novex-admin__system-grid">
                      {[
                        'Configuración',
                        'Catálogos',
                        'Auditoría',
                        'Operaciones',
                      ].map((label) => (
                        <article key={label}>
                          <NovexIcon name="shield" />
                          <strong>{label}</strong>
                          <span>Estado nominal · acceso administrativo</span>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </main>
            {pendingStatusUser ? (
              <div className="novex-ops-modal" role="presentation">
                <button
                  type="button"
                  className="novex-ops-modal__backdrop"
                  aria-label="Cerrar confirmación"
                  disabled={updatingId === pendingStatusUser.id}
                  onClick={() => setPendingStatusUser(null)}
                />
                <div
                  className="novex-ops-modal__dialog"
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="novex-admin-status-title"
                  aria-describedby="novex-admin-status-desc"
                >
                  <header>
                    <div>
                      <p>Confirmación requerida</p>
                      <h2 id="novex-admin-status-title">
                        {pendingStatusUser.status === 'ACTIVE'
                          ? 'Desactivar usuario'
                          : 'Activar usuario'}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="novex-ops-modal__close"
                      disabled={updatingId === pendingStatusUser.id}
                      onClick={() => setPendingStatusUser(null)}
                    >
                      Cerrar
                    </button>
                  </header>
                  <p className="novex-ops-modal__hint" id="novex-admin-status-desc">
                    {pendingStatusUser.status === 'ACTIVE'
                      ? `¿Confirma desactivar a ${pendingStatusUser.fullName}? Perderá el acceso a NOVEX hasta que se reactive.`
                      : `¿Confirma activar a ${pendingStatusUser.fullName}? Recuperará el acceso según su rol vigente.`}
                  </p>
                  <p className="novex-ops-modal__hint">
                    <strong>{pendingStatusUser.email}</strong>
                    {' · '}
                    {pendingStatusUser.roleName}
                  </p>
                  <footer className="novex-admin__confirm-actions">
                    <button
                      type="button"
                      className="novex-ops-modal__secondary"
                      disabled={updatingId === pendingStatusUser.id}
                      onClick={() => setPendingStatusUser(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="novex-ops-modal__primary"
                      disabled={updatingId === pendingStatusUser.id}
                      onClick={() => void confirmToggleUser()}
                    >
                      {updatingId === pendingStatusUser.id
                        ? 'Guardando…'
                        : pendingStatusUser.status === 'ACTIVE'
                          ? 'Sí, desactivar'
                          : 'Sí, activar'}
                    </button>
                  </footer>
                </div>
              </div>
            ) : null}
          </ScreenDeck>
        </MainScreen>
      </NovexFrame>
    </NovexRoom>
  )
}

function CatalogList({
  title,
  items,
}: {
  title: string
  items: Array<{ code: string; name: string; detail: string }>
}) {
  return (
    <div className="novex-admin__catalog">
      <header className="novex-admin__panel-head">
        <div>
          <span>Catálogo vigente</span>
          <h2>{title}</h2>
        </div>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item.code}>
            <code>{item.code}</code>
            <div>
              <strong>{item.name}</strong>
              <span>{item.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
