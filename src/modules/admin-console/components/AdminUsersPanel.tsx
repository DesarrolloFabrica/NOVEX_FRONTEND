import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { AdminUser } from '@/modules/api/admin.api'
import { NovexIcon } from '@/shared/components/NovexIcon'
import {
  DEFAULT_USER_SORT,
  countByStatus,
  formatLastAccess,
  pageWindow,
  paginate,
  roleOptions,
  selectUsers,
  userInitials,
  type UserSort,
  type UserSortKey,
  type UserStatusFilter,
} from '@/modules/admin-console/adminConsoleModel'
import { AdminIcon } from '@/modules/admin-console/components/AdminConsoleIcons'

const STATUS_LABEL: Record<AdminUser['status'], string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SUSPENDED: 'Suspendido',
}

const COLUMNS: Array<{ key: UserSortKey; label: string }> = [
  { key: 'usuario', label: 'Usuario' },
  { key: 'rol', label: 'Rol' },
  { key: 'coordinacion', label: 'Coordinación' },
  { key: 'acceso', label: 'Último acceso' },
  { key: 'estado', label: 'Estado' },
]

function roleTone(roleCode: string): string {
  switch (roleCode.toUpperCase()) {
    case 'ADMIN':
      return 'admin'
    case 'DIRECTOR':
      return 'director'
    case 'ANALISTA':
      return 'analyst'
    default:
      return 'neutral'
  }
}

export function AdminUsersPanel({
  users,
  updatingId,
  currentUserId,
  canCreate,
  canUpdate,
  onCreate,
  onEdit,
  onRequestToggle,
}: {
  users: AdminUser[]
  updatingId: string | null
  /** La propia cuenta no ofrece activar/desactivar. */
  currentUserId: string | null
  canCreate: boolean
  canUpdate: boolean
  onCreate: () => void
  onEdit: (user: AdminUser) => void
  onRequestToggle: (user: AdminUser) => void
}) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<UserStatusFilter>('todos')
  const [roleCode, setRoleCode] = useState<string | null>(null)
  const [sort, setSort] = useState<UserSort>(DEFAULT_USER_SORT)
  const [page, setPage] = useState(1)
  const searchId = useId()
  const roleId = useId()

  const counts = useMemo(() => countByStatus(users), [users])
  const roles = useMemo(() => roleOptions(users), [users])
  const selected = useMemo(
    () => selectUsers(users, { text, status, roleCode, sort }),
    [users, text, status, roleCode, sort],
  )
  const view = paginate(selected, page)

  // Cualquier cambio de criterio vuelve a la primera página.
  function toggleSort(key: UserSortKey) {
    setPage(1)
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'acceso' ? 'desc' : 'asc' },
    )
  }

  const tabs: Array<{ id: UserStatusFilter; label: string; count: number }> = [
    { id: 'todos', label: 'Todos', count: counts.total },
    { id: 'activos', label: 'Activos', count: counts.active },
    { id: 'inactivos', label: 'Inactivos', count: counts.inactive },
  ]

  return (
    <section className="admin-console__card admin-users" aria-labelledby="admin-users-title">
      <header className="admin-console__card-head">
        <div className="admin-console__card-title">
          <NovexIcon name="user" size={30} strokeWidth={1.5} />
          <h2 id="admin-users-title">Usuarios</h2>
        </div>
        <div className="admin-console__card-actions">
        <label className="admin-console__search" htmlFor={searchId}>
          <span className="sr-only">Buscar usuario, rol o coordinación</span>
          <NovexIcon name="search" size={18} />
          <input
            id={searchId}
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setPage(1)
            }}
            placeholder="Buscar usuario, rol o coordinación…"
            autoComplete="off"
          />
        </label>
        {canCreate ? (
          <button type="button" className="admin-console__primary" onClick={onCreate}>
            <NovexIcon name="plus" size={18} />
            Nuevo usuario
          </button>
        ) : null}
        </div>
      </header>

      <div className="admin-users__toolbar">
        <div className="admin-users__tabs" role="group" aria-label="Filtrar por estado">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className="admin-users__tab"
              aria-pressed={status === tab.id}
              onClick={() => {
                setStatus(tab.id)
                setPage(1)
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <label className="admin-users__role-filter" htmlFor={roleId}>
          <AdminIcon name="filter" size={17} />
          <span className="sr-only">Filtrar por rol</span>
          <select
            id={roleId}
            value={roleCode ?? ''}
            onChange={(event) => {
              setRoleCode(event.target.value || null)
              setPage(1)
            }}
          >
            <option value="">Todos los roles</option>
            {roles.map((role) => (
              <option key={role.code} value={role.code}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-users__table-wrap">
        <table className="admin-users__table">
          <thead>
            <tr>
              {COLUMNS.map((column) => {
                const active = sort.key === column.key
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    <button type="button" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      <AdminIcon
                        name={active ? (sort.direction === 'asc' ? 'sort-asc' : 'sort-desc') : 'sort'}
                        size={15}
                        strokeWidth={2}
                      />
                    </button>
                  </th>
                )
              })}
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {view.items.map((user) => (
              <tr key={user.id} data-status={user.status}>
                <td data-label="Usuario">
                  <div className="admin-users__person">
                    <span className="admin-users__avatar" aria-hidden="true">
                      {userInitials(user.fullName)}
                    </span>
                    <span className="admin-users__person-text">
                      <strong>{user.fullName}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                </td>
                <td data-label="Rol">
                  <span className={`admin-users__role admin-users__role--${roleTone(user.roleCode)}`}>
                    {user.roleName}
                  </span>
                </td>
                <td data-label="Coordinación">
                  <span className="admin-users__meta">
                    <AdminIcon name={user.coordinationName ? 'org' : 'globe'} size={20} />
                    {user.coordinationName ?? 'Alcance global'}
                  </span>
                </td>
                <td data-label="Último acceso">
                  <span className="admin-users__meta">
                    <NovexIcon name="calendar" size={19} />
                    {formatLastAccess(user.lastLoginAt)}
                  </span>
                </td>
                <td data-label="Estado">
                  <span className="admin-users__status" data-status={user.status}>
                    <AdminIcon name="check-circle" size={16} strokeWidth={2} />
                    {STATUS_LABEL[user.status]}
                  </span>
                </td>
                <td className="admin-users__actions-cell">
                  {canUpdate ? (
                    <RowMenu
                      user={user}
                      busy={updatingId === user.id}
                      isSelf={user.id === currentUserId}
                      onEdit={() => onEdit(user)}
                      onToggle={() => onRequestToggle(user)}
                    />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {view.total === 0 ? (
          <p className="admin-console__empty">
            Ningún usuario coincide con la búsqueda o los filtros.
          </p>
        ) : null}
      </div>

      <footer className="admin-users__footer">
        <p aria-live="polite">
          {view.total === 0
            ? 'Sin resultados'
            : `Mostrando ${view.from} – ${view.to} de ${view.total} ${view.total === 1 ? 'usuario' : 'usuarios'}`}
        </p>
        {view.pageCount > 1 ? (
          <nav className="admin-users__pager" aria-label="Paginación de usuarios">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={view.page === 1}
              onClick={() => setPage(view.page - 1)}
            >
              <NovexIcon name="chevron-left" size={18} />
            </button>
            {pageWindow(view.page, view.pageCount).map((number, index) =>
              number === null ? (
                <span key={`gap-${index}`} className="admin-users__pager-gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={number}
                  type="button"
                  aria-label={`Página ${number}`}
                  aria-current={number === view.page ? 'page' : undefined}
                  onClick={() => setPage(number)}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={view.page === view.pageCount}
              onClick={() => setPage(view.page + 1)}
            >
              <NovexIcon name="chevron-right" size={18} />
            </button>
          </nav>
        ) : null}
      </footer>
    </section>
  )
}

/** Menú «…» de cada fila. Escape o un clic fuera lo cierran y el foco vuelve al botón. */
function RowMenu({
  user,
  busy,
  isSelf,
  onEdit,
  onToggle,
}: {
  user: AdminUser
  busy: boolean
  isSelf: boolean
  onEdit: () => void
  onToggle: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const active = user.status === 'ACTIVE'

  useEffect(() => {
    if (!open) return
    rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()

    function close(restore: boolean) {
      setOpen(false)
      if (restore) triggerRef.current?.focus()
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close(true)
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="admin-users__menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="admin-users__menu-trigger"
        aria-label={`Acciones para ${user.fullName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        {busy ? <span className="admin-console__spinner" aria-hidden="true" /> : <AdminIcon name="more" size={20} />}
      </button>
      {open ? (
        <div id={menuId} className="admin-users__menu-list" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            <AdminIcon name="gear" size={17} />
            Editar usuario
          </button>
          {isSelf ? null : (
            <button
              type="button"
              role="menuitem"
              className={active ? 'is-danger' : ''}
              onClick={() => {
                setOpen(false)
                onToggle()
              }}
            >
              <AdminIcon name={active ? 'minus' : 'check-circle'} size={17} />
              {active ? 'Desactivar usuario' : 'Activar usuario'}
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}
