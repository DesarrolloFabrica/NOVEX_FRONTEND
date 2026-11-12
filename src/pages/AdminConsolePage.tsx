import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  createAdminCoordination,
  createAdminUser,
  replaceAdminRolePermissions,
  updateAdminCoordination,
  updateAdminRole,
  updateAdminUser,
  updateAdminUserStatus,
  type AdminOverview,
  type AdminRoleMatrixRow,
  type AdminUser,
  type AdminUserInput,
} from '@/modules/api/admin.api'
import { useAuth } from '@/modules/auth/hooks/useAuth'
import { hasPermission } from '@/modules/auth/utils/permissions'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { getErrorMessage } from '@/shared/utils/error'
import { OperationalRoleHeader } from '@/modules/operational-cards/components/OperationalRoleHeader'
import {
  CircusScene,
  ShellBottom,
} from '@/modules/operational-cards/experience/layouts/OperationalCenterChrome'
import { TicketPanelFrame } from '@/modules/operational-cards/experience/TicketPanelFrame'
import {
  activeSituationsCache,
  adminOverviewCache,
} from '@/modules/admin-console/adminConsoleData'
import { summarize, type AdminSection } from '@/modules/admin-console/adminConsoleModel'
import { AdminConsoleSidebar } from '@/modules/admin-console/components/AdminConsoleSidebar'
import { AdminStats } from '@/modules/admin-console/components/AdminStats'
import { AdminUsersPanel } from '@/modules/admin-console/components/AdminUsersPanel'
import {
  AdminCoordinationsPanel,
  AdminPermissionsMatrix,
  AdminRolesPanel,
  AdminSystemPanel,
} from '@/modules/admin-console/components/AdminManagementPanels'
import { AdminUserDialog } from '@/modules/admin-console/components/AdminUserDialog'
import { AdminIcon } from '@/modules/admin-console/components/AdminConsoleIcons'
// La consola comparte cabecera, escenario, marco de ticket y menú con el
// Centro: sus hojas se importan aquí para que una recarga directa en /admin
// las tenga (Vite las comparte con el chunk del Centro, no se duplican).
import '@/styles/operational-shell.css'
import '@/styles/operational-shell-ticket-fabrica-pilot.css'
import '@/styles/operational-shell-admin.css'
import '@/modules/admin-console/styles/admin-console.css'

const EMPTY_OVERVIEW: AdminOverview = {
  users: [],
  roles: [],
  permissions: [],
  coordinations: [],
  roleMatrix: [],
}

const updatedFormat = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' })

/**
 * Consola de Administración.
 *
 * Misma composición que el Centro Operacional (escenario del circo, cabecera
 * de rol, menú flotante y papel de ticket) para que pasar de uno a otro sea
 * continuo: con View Transitions la cabecera y el escenario no se mueven y solo
 * cambia el contenido. Los datos llegan precargados desde el enlace del Centro
 * (`adminConsoleData`); si no, la consola los pide al montar.
 */
export function AdminConsolePage() {
  const { user } = useAuth()
  const [data, setData] = useState<AdminOverview>(
    () => adminOverviewCache.peek() ?? EMPTY_OVERVIEW,
  )
  const [loaded, setLoaded] = useState(() => adminOverviewCache.peek() !== null)
  const [loading, setLoading] = useState(() => adminOverviewCache.peek() === null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(() =>
    adminOverviewCache.peek() ? new Date() : null,
  )
  const [activeCount, setActiveCount] = useState<number | undefined>(
    () => activeSituationsCache.peek() ?? undefined,
  )
  const [section, setSection] = useState<AdminSection>('usuarios')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingStatusUser, setPendingStatusUser] = useState<AdminUser | null>(null)
  const [editingUser, setEditingUser] = useState<AdminUser | 'new' | null>(null)
  const [focusRoleId, setFocusRoleId] = useState<string | null>(null)
  // Sube tras cada escritura: el registro de auditoría se recarga solo.
  const [auditRevision, setAuditRevision] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  // Capacidades según los permisos vigentes de la sesión.
  const can = {
    createUsers: hasPermission(user, 'USERS_CREATE'),
    updateUsers: hasPermission(user, 'USERS_UPDATE'),
    system: hasPermission(user, 'SYSTEM_CONFIGURATION'),
    coordinations: hasPermission(user, 'COORDINATIONS_MANAGE'),
  }

  const load = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const next = await adminOverviewCache.load(force)
      setData(next)
      setLoaded(true)
      setUpdatedAt(new Date())
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!adminOverviewCache.peek()) void load()
    if (activeSituationsCache.peek() === null) {
      activeSituationsCache
        .load()
        .then(setActiveCount)
        .catch(() => undefined)
    }
  }, [load])

  const summary = useMemo(() => summarize(data), [data])

  useEffect(() => {
    if (!toast) return
    const handle = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(handle)
  }, [toast])

  /**
   * Tras cada escritura confirmada por el backend: se aplica la respuesta al
   * momento, se avisa y se resincroniza en segundo plano lo derivado (recuentos
   * por rol, listas) sin volver al estado de carga.
   */
  const commit = useCallback(
    (update: (current: AdminOverview) => AdminOverview, message: string) => {
      setData((current) => {
        const next = update(current)
        adminOverviewCache.remember(next)
        return next
      })
      setToast(message)
      setAuditRevision((value) => value + 1)
      adminOverviewCache
        .load(true)
        .then((fresh) => {
          setData(fresh)
          setUpdatedAt(new Date())
        })
        .catch(() => undefined)
    },
    [],
  )

  const replaceRole = (row: AdminRoleMatrixRow) => (current: AdminOverview) => ({
    ...current,
    roleMatrix: current.roleMatrix.map((item) => (item.id === row.id ? row : item)),
    roles: current.roles.map((item) =>
      item.id === row.id
        ? { ...item, name: row.name, description: row.description, isActive: row.isActive }
        : item,
    ),
  })

  async function saveUser(target: AdminUser | null, input: AdminUserInput) {
    if (!target) {
      const created = await createAdminUser(input)
      commit((current) => ({ ...current, users: [...current.users, created] }), `Usuario ${created.fullName} creado.`)
      return
    }
    const isSelf = target.id === user?.id
    const updated = await updateAdminUser(target.id, {
      fullName: input.fullName,
      coordinationId: input.coordinationId,
      ...(isSelf ? {} : { roleCode: input.roleCode, status: input.status }),
    })
    commit(
      (current) => ({
        ...current,
        users: current.users.map((item) => (item.id === updated.id ? updated : item)),
      }),
      'Usuario actualizado.',
    )
  }

  async function confirmToggleUser() {
    if (!pendingStatusUser) return
    const target = pendingStatusUser
    const status = target.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setUpdatingId(target.id)
    setError(null)
    try {
      const updated = await updateAdminUserStatus(target.id, status)
      commit(
        (current) => ({
          ...current,
          users: current.users.map((item) => (item.id === updated.id ? updated : item)),
        }),
        updated.status === 'ACTIVE' ? 'Usuario activado.' : 'Usuario desactivado.',
      )
      setPendingStatusUser(null)
    } catch (updateError) {
      setError(getErrorMessage(updateError))
      setPendingStatusUser(null)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div
      className="operational-shell admin-console"
      data-shell-layout="deck"
      data-shell-experience="admin"
      data-ticket-theme="general"
      data-surface="admin-console"
    >
      <CircusScene />

      <OperationalRoleHeader
        experience="admin"
        user={user}
        activeProblemsCount={activeCount}
        brandHref="/centro-operacional"
      />

      <AdminConsoleSidebar
        section={section}
        onSelect={(next) => {
          setFocusRoleId(null)
          setSection(next)
        }}
      />

      <main
        className="admin-console__main"
        data-tour="admin-console"
        aria-labelledby="admin-console-title"
      >
        <TicketPanelFrame themeId="general" variant="action" />

        <div className="admin-console__sheet">
          <header className="admin-console__hero">
            <span className="admin-console__hero-medal" aria-hidden="true">
              <AdminIcon name="gear" size={34} strokeWidth={1.5} />
            </span>
            <div className="admin-console__hero-text">
              <NavLink
                to="/centro-operacional"
                viewTransition
                className="admin-console__back"
                data-testid="admin-back-to-stage"
              >
                <NovexIcon name="chevron-left" size={15} />
                Centro Operacional
              </NavLink>
              <h1 id="admin-console-title">Consola de Administración</h1>
              <p>Control, configuración y gestión del sistema NOVEX.</p>
            </div>
            <div className="admin-console__hero-aside">
              {updatedAt ? (
                <span className="admin-console__updated">
                  Actualizado {updatedFormat.format(updatedAt)}
                </span>
              ) : null}
              <button
                type="button"
                className="admin-console__refresh"
                onClick={() => void load(true)}
                disabled={loading}
                aria-label="Actualizar datos de administración"
                title="Actualizar"
              >
                <AdminIcon name="refresh" size={18} className={loading ? 'is-spinning' : undefined} />
              </button>
            </div>
          </header>

          {error ? (
            <div className="admin-console__alert" role="alert">
              <NovexIcon name="alert" size={18} />
              <p>{error}</p>
              <button type="button" onClick={() => void load(true)}>
                Reintentar
              </button>
            </div>
          ) : null}

          {!loaded ? (
            loading ? (
              <AdminConsoleSkeleton />
            ) : null
          ) : (
            <>
              <AdminStats summary={summary} />
              <div className="admin-console__section" key={section}>
                {section === 'usuarios' ? (
                  <AdminUsersPanel
                    users={data.users}
                    updatingId={updatingId}
                    currentUserId={user?.id ?? null}
                    canCreate={can.createUsers}
                    canUpdate={can.updateUsers}
                    onCreate={() => setEditingUser('new')}
                    onEdit={setEditingUser}
                    onRequestToggle={setPendingStatusUser}
                  />
                ) : section === 'roles' ? (
                  <AdminRolesPanel
                    roles={data.roleMatrix}
                    canManage={can.system}
                    onSave={async (role, changes) => {
                      const row = await updateAdminRole(role.id, changes)
                      commit(replaceRole(row), `Rol ${row.name} actualizado.`)
                    }}
                    onOpenPermissions={(roleId) => {
                      setFocusRoleId(roleId)
                      setSection('permisos')
                    }}
                  />
                ) : section === 'coordinaciones' ? (
                  <AdminCoordinationsPanel
                    coordinations={data.coordinations}
                    canManage={can.coordinations}
                    onCreate={async (input) => {
                      const created = await createAdminCoordination(input)
                      commit(
                        (current) => ({ ...current, coordinations: [...current.coordinations, created] }),
                        `Coordinación ${created.name} creada.`,
                      )
                    }}
                    onUpdate={async (item, changes) => {
                      const updated = await updateAdminCoordination(item.id, changes)
                      commit(
                        (current) => ({
                          ...current,
                          coordinations: current.coordinations.map((entry) =>
                            entry.id === updated.id ? updated : entry,
                          ),
                        }),
                        `Coordinación ${updated.name} actualizada.`,
                      )
                    }}
                  />
                ) : section === 'permisos' ? (
                  <AdminPermissionsMatrix
                    data={data}
                    canManage={can.system}
                    focusRoleId={focusRoleId}
                    onSave={async (role, codes) => {
                      const row = await replaceAdminRolePermissions(role.id, codes)
                      commit(replaceRole(row), `Permisos de ${row.name} guardados.`)
                    }}
                  />
                ) : (
                  <AdminSystemPanel
                    canViewAudit={can.system}
                    auditRevision={auditRevision}
                    onGoToSection={(next) => {
                      setFocusRoleId(null)
                      setSection(next)
                    }}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <ShellBottom />

      <p className="admin-console__toast" role="status" aria-live="polite" data-visible={toast ? 'true' : 'false'}>
        {toast ? (
          <>
            <AdminIcon name="check-circle" size={18} />
            {toast}
          </>
        ) : null}
      </p>

      {editingUser ? (
        <AdminUserDialog
          user={editingUser === 'new' ? null : editingUser}
          roles={data.roles}
          coordinations={data.coordinations}
          isSelf={editingUser !== 'new' && editingUser.id === user?.id}
          onClose={() => setEditingUser(null)}
          onSubmit={(input) => saveUser(editingUser === 'new' ? null : editingUser, input)}
        />
      ) : null}

      {pendingStatusUser ? (
        <div className="novex-ops-modal admin-console__modal" role="presentation">
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
                  {pendingStatusUser.status === 'ACTIVE' ? 'Desactivar usuario' : 'Activar usuario'}
                </h2>
              </div>
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
            <footer className="admin-console__confirm-actions">
              <button
                type="button"
                className="novex-ops-modal__secondary"
                disabled={updatingId === pendingStatusUser.id}
                onClick={() => setPendingStatusUser(null)}
                autoFocus
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
    </div>
  )
}

/** Esqueleto con la forma real (tarjetas + tabla), sin spinner genérico. */
function AdminConsoleSkeleton() {
  return (
    <div className="admin-console__skeleton" aria-busy="true" aria-label="Cargando configuración">
      <div className="admin-console__stats">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className="admin-console__skeleton-block admin-console__skeleton-block--stat" />
        ))}
      </div>
      <span className="admin-console__skeleton-block admin-console__skeleton-block--table" />
    </div>
  )
}
