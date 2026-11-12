import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchAdminAuditLogs,
  type AdminAuditLogItem,
  type AdminAuditLogPage,
  type AdminCoordination,
  type AdminCoordinationInput,
  type AdminOverview,
  type AdminRoleMatrixRow,
} from '@/modules/api/admin.api'
import { NovexIcon } from '@/shared/components/NovexIcon'
import { getErrorMessage } from '@/shared/utils/error'
import { permissionsByModule, type AdminSection } from '@/modules/admin-console/adminConsoleModel'
import { AdminIcon } from '@/modules/admin-console/components/AdminConsoleIcons'
import { AdminDialog, AdminField } from '@/modules/admin-console/components/AdminDialog'
import {
  AUDIT_ACTION_LABEL,
  AUDIT_RESOURCE_LABEL,
  describeAuditMetadata,
} from '@/modules/admin-console/auditPresentation'

function CardHead({
  icon,
  title,
  caption,
  actions,
}: {
  icon: React.ReactNode
  title: string
  caption: string
  actions?: React.ReactNode
}) {
  return (
    <header className="admin-console__card-head">
      <div className="admin-console__card-title">
        {icon}
        <div>
          <h2>{title}</h2>
          <p>{caption}</p>
        </div>
      </div>
      {actions ? <div className="admin-console__card-actions">{actions}</div> : null}
    </header>
  )
}

/* ======================================================================= */
/* Roles                                                                    */
/* ======================================================================= */

export function AdminRolesPanel({
  roles,
  canManage,
  onSave,
  onOpenPermissions,
}: {
  roles: AdminRoleMatrixRow[]
  canManage: boolean
  onSave: (
    role: AdminRoleMatrixRow,
    changes: { name?: string; description?: string | null; isActive?: boolean },
  ) => Promise<void>
  onOpenPermissions: (roleId: string) => void
}) {
  const [editing, setEditing] = useState<AdminRoleMatrixRow | null>(null)
  const [toggleError, setToggleError] = useState<{ id: string; message: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function toggle(role: AdminRoleMatrixRow) {
    setBusyId(role.id)
    setToggleError(null)
    try {
      await onSave(role, { isActive: !role.isActive })
    } catch (error) {
      setToggleError({ id: role.id, message: getErrorMessage(error) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="admin-console__card">
      <CardHead
        icon={<AdminIcon name="layers" size={30} strokeWidth={1.5} />}
        title="Roles"
        caption="Nombre, descripción, estado y permisos de cada rol. Los cambios se aplican al instante a todas las sesiones."
      />
      <ul className="admin-catalog">
        {roles.map((role) => {
          const blockedReason = role.locked
            ? 'El rol Administrador siempre está activo.'
            : role.isActive && role.userCount > 0
              ? `Tiene ${role.userCount} ${role.userCount === 1 ? 'usuario' : 'usuarios'}: reasígnelos antes de desactivarlo.`
              : null
          return (
            <li key={role.id} className="admin-catalog__item admin-role" data-inactive={!role.isActive || undefined}>
              <code>{role.code}</code>
              <div className="admin-catalog__text">
                <strong>{role.name}</strong>
                <span>{role.description ?? 'Sin descripción'}</span>
                <span className="admin-role__meta">
                  {role.activeUserCount} {role.activeUserCount === 1 ? 'usuario activo' : 'usuarios activos'}
                  {' · '}
                  {role.permissionCodes.length} permisos
                </span>
                {toggleError?.id === role.id ? (
                  <span className="admin-form__error" role="alert">
                    {toggleError.message}
                  </span>
                ) : null}
              </div>
              <div className="admin-catalog__tags">
                {role.locked ? <span className="admin-catalog__tag">Protegido</span> : null}
                <span className="admin-catalog__tag" data-tone={role.isActive ? 'ok' : 'off'}>
                  {role.isActive ? 'Vigente' : 'Inactivo'}
                </span>
              </div>
              {canManage ? (
                <div className="admin-row-actions">
                  <button type="button" className="admin-console__ghost" onClick={() => onOpenPermissions(role.id)}>
                    <NovexIcon name="shield" size={16} />
                    Permisos
                  </button>
                  <button type="button" className="admin-console__ghost" onClick={() => setEditing(role)}>
                    <AdminIcon name="gear" size={16} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="admin-console__ghost"
                    disabled={busyId === role.id || (role.isActive && !!blockedReason)}
                    title={role.isActive && blockedReason ? blockedReason : undefined}
                    onClick={() => void toggle(role)}
                  >
                    {busyId === role.id ? 'Guardando…' : role.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      {editing ? (
        <RoleDialog role={editing} onClose={() => setEditing(null)} onSave={(changes) => onSave(editing, changes)} />
      ) : null}
    </section>
  )
}

function RoleDialog({
  role,
  onSave,
  onClose,
}: {
  role: AdminRoleMatrixRow
  onSave: (changes: { name: string; description: string | null }) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description ?? '')
  return (
    <AdminDialog
      eyebrow={`Rol ${role.code}`}
      title="Editar rol"
      submitLabel="Guardar cambios"
      onClose={onClose}
      onSubmit={() => onSave({ name: name.trim(), description: description.trim() || null })}
    >
      <AdminField label="Nombre visible" wide>
        <input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
      </AdminField>
      <AdminField label="Descripción" hint="Qué hace este rol en la plataforma." wide>
        <textarea rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
      </AdminField>
    </AdminDialog>
  )
}

/* ======================================================================= */
/* Matriz de permisos                                                       */
/* ======================================================================= */

export function AdminPermissionsMatrix({
  data,
  canManage,
  focusRoleId,
  onSave,
}: {
  data: AdminOverview
  canManage: boolean
  focusRoleId: string | null
  onSave: (role: AdminRoleMatrixRow, permissionCodes: string[]) => Promise<void>
}) {
  const groups = useMemo(() => permissionsByModule(data), [data])
  const roles = data.roleMatrix
  // Borradores por rol: solo se guardan los que cambian.
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({})
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const current = (role: AdminRoleMatrixRow) => drafts[role.id] ?? new Set(role.permissionCodes)
  const dirtyRoles = roles.filter((role) => {
    const draft = drafts[role.id]
    if (!draft) return false
    const base = new Set(role.permissionCodes)
    return draft.size !== base.size || [...draft].some((code) => !base.has(code))
  })

  function toggle(role: AdminRoleMatrixRow, code: string) {
    setFeedback(null)
    setDrafts((prev) => {
      const next = new Set(prev[role.id] ?? role.permissionCodes)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return { ...prev, [role.id]: next }
    })
  }

  async function save() {
    setSaving(true)
    setFeedback(null)
    const failed: string[] = []
    for (const role of dirtyRoles) {
      try {
        await onSave(role, [...current(role)].sort())
        setDrafts((prev) => {
          const next = { ...prev }
          delete next[role.id]
          return next
        })
      } catch (error) {
        failed.push(`${role.name}: ${getErrorMessage(error)}`)
      }
    }
    setSaving(false)
    setFeedback(
      failed.length
        ? { tone: 'error', text: failed.join(' · ') }
        : { tone: 'ok', text: 'Permisos guardados. Ya rigen en todas las sesiones.' },
    )
  }

  return (
    <section className="admin-console__card">
      <CardHead
        icon={<NovexIcon name="shield" size={30} strokeWidth={1.5} />}
        title="Permisos"
        caption="Qué puede hacer cada rol. Marque o desmarque y guarde: el cambio aplica de inmediato."
        actions={
          canManage ? (
            <>
              <button
                type="button"
                className="admin-console__ghost"
                disabled={!dirtyRoles.length || saving}
                onClick={() => {
                  setDrafts({})
                  setFeedback(null)
                }}
              >
                Descartar
              </button>
              <button
                type="button"
                className="admin-console__primary"
                disabled={!dirtyRoles.length || saving}
                onClick={() => void save()}
              >
                {saving ? 'Guardando…' : `Guardar cambios${dirtyRoles.length ? ` (${dirtyRoles.length})` : ''}`}
              </button>
            </>
          ) : null
        }
      />
      {feedback ? (
        <p className={feedback.tone === 'ok' ? 'admin-form__ok' : 'admin-form__error'} role={feedback.tone === 'ok' ? 'status' : 'alert'}>
          {feedback.text}
        </p>
      ) : null}

      <div className="admin-matrix__wrap">
        <table className="admin-matrix">
          <thead>
            <tr>
              <th scope="col">Permiso</th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  scope="col"
                  className={role.id === focusRoleId ? 'is-focus' : undefined}
                  title={role.locked ? 'El Administrador conserva todos los permisos' : undefined}
                >
                  {role.name}
                  {role.locked ? <span className="admin-matrix__lock">Protegido</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.module}>
              <tr className="admin-matrix__group">
                <th scope="rowgroup" colSpan={roles.length + 1}>
                  {group.module}
                </th>
              </tr>
              {group.items.map((permission) => (
                <tr key={permission.id}>
                  <th scope="row">
                    <strong>{permission.name}</strong>
                    <code>{permission.code}</code>
                  </th>
                  {roles.map((role) => {
                    const checked = role.locked || current(role).has(permission.code)
                    return (
                      <td key={role.id} className={role.id === focusRoleId ? 'is-focus' : undefined}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canManage || role.locked || saving}
                          onChange={() => toggle(role, permission.code)}
                          aria-label={`${permission.name} para ${role.name}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  )
}

/* ======================================================================= */
/* Coordinaciones                                                           */
/* ======================================================================= */

export function AdminCoordinationsPanel({
  coordinations,
  canManage,
  onCreate,
  onUpdate,
}: {
  coordinations: AdminCoordination[]
  canManage: boolean
  onCreate: (input: AdminCoordinationInput) => Promise<void>
  onUpdate: (
    item: AdminCoordination,
    changes: Partial<Omit<AdminCoordinationInput, 'code'>> & { isActive?: boolean },
  ) => Promise<void>
}) {
  const [editing, setEditing] = useState<AdminCoordination | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<{ id: string; message: string } | null>(null)
  const sorted = useMemo(
    () =>
      [...coordinations].sort(
        (a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || a.name.localeCompare(b.name, 'es'),
      ),
    [coordinations],
  )

  async function toggle(item: AdminCoordination) {
    setBusyId(item.id)
    setToggleError(null)
    try {
      await onUpdate(item, { isActive: !item.isActive })
    } catch (error) {
      setToggleError({ id: item.id, message: getErrorMessage(error) })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="admin-console__card">
      <CardHead
        icon={<AdminIcon name="org" size={30} strokeWidth={1.5} />}
        title="Coordinaciones"
        caption="Alta, datos y estado de cada coordinación. Una coordinación con usuarios activos o situaciones abiertas no se puede desactivar."
        actions={
          canManage ? (
            <button type="button" className="admin-console__primary" onClick={() => setEditing('new')}>
              <NovexIcon name="plus" size={18} />
              Nueva coordinación
            </button>
          ) : null
        }
      />
      <ul className="admin-catalog admin-catalog--grid">
        {sorted.map((item) => (
          <li key={item.id} className="admin-catalog__item admin-coordination" data-inactive={!item.isActive || undefined}>
            <span
              className="admin-coordination__swatch"
              style={{ background: item.color ?? '#8a602d' }}
              aria-hidden="true"
            />
            <div className="admin-catalog__text">
              <strong>{item.name}</strong>
              <span>
                {item.code}
                {item.shortName ? ` · ${item.shortName}` : ''}
              </span>
              {toggleError?.id === item.id ? (
                <span className="admin-form__error" role="alert">
                  {toggleError.message}
                </span>
              ) : null}
            </div>
            <span className="admin-catalog__tag" data-tone={item.isActive ? 'ok' : 'off'}>
              {item.isActive ? 'Operativa' : 'Inactiva'}
            </span>
            {canManage ? (
              <div className="admin-row-actions">
                <button type="button" className="admin-console__ghost" onClick={() => setEditing(item)}>
                  <AdminIcon name="gear" size={16} />
                  Editar
                </button>
                <button
                  type="button"
                  className="admin-console__ghost"
                  disabled={busyId === item.id}
                  onClick={() => void toggle(item)}
                >
                  {busyId === item.id ? 'Guardando…' : item.isActive ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {editing ? (
        <CoordinationDialog
          item={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSubmit={(input) =>
            editing === 'new'
              ? onCreate(input)
              : onUpdate(editing, {
                  name: input.name,
                  shortName: input.shortName,
                  description: input.description,
                  color: input.color,
                  displayOrder: input.displayOrder,
                })
          }
        />
      ) : null}
    </section>
  )
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function CoordinationDialog({
  item,
  onSubmit,
  onClose,
}: {
  item: AdminCoordination | null
  onSubmit: (input: AdminCoordinationInput) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [shortName, setShortName] = useState(item?.shortName ?? '')
  const [code, setCode] = useState(item?.code ?? '')
  const [codeTouched, setCodeTouched] = useState(false)
  const [description, setDescription] = useState(item?.description ?? '')
  const [color, setColor] = useState(item?.color ?? '#8A602D')
  const [displayOrder, setDisplayOrder] = useState<string>(
    item?.displayOrder !== undefined ? String(item.displayOrder) : '',
  )
  const effectiveCode = item ? item.code : codeTouched ? code : `coord-${slugify(shortName || name)}`

  return (
    <AdminDialog
      eyebrow={item ? `Coordinación ${item.code}` : 'Nueva coordinación'}
      title={item ? 'Editar coordinación' : 'Crear coordinación'}
      submitLabel={item ? 'Guardar cambios' : 'Crear coordinación'}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          code: effectiveCode,
          name: name.trim(),
          shortName: shortName.trim(),
          description: description.trim() || null,
          color: color.toUpperCase(),
          displayOrder: displayOrder === '' ? undefined : Number(displayOrder),
        })
      }
    >
      <AdminField label="Nombre" wide>
        <input required minLength={2} maxLength={180} value={name} onChange={(e) => setName(e.target.value)} />
      </AdminField>
      <AdminField label="Nombre corto" hint="Aparece en cartas y etiquetas.">
        <input required maxLength={80} value={shortName} onChange={(e) => setShortName(e.target.value)} />
      </AdminField>
      <AdminField
        label="Código"
        hint={item ? 'El código no cambia: lo usan las situaciones y los indicadores.' : 'Forma coord-nombre. Se propone desde el nombre corto.'}
      >
        <input
          required
          maxLength={64}
          pattern="coord-[a-z0-9]+(-[a-z0-9]+)*"
          value={effectiveCode}
          disabled={!!item}
          onChange={(e) => {
            setCodeTouched(true)
            setCode(e.target.value.toLowerCase())
          }}
        />
      </AdminField>
      <AdminField label="Color" hint="Identidad en la mesa y en los indicadores.">
        <span className="admin-form__color">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Elegir color" />
          <input
            required
            pattern="#[0-9a-fA-F]{6}"
            maxLength={7}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            aria-label="Color hexadecimal"
          />
        </span>
      </AdminField>
      <AdminField label="Orden en la mesa" hint="Vacío = al final.">
        <input type="number" min={0} max={999} value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} />
      </AdminField>
      <AdminField label="Descripción" wide>
        <textarea rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </AdminField>
    </AdminDialog>
  )
}

/* ======================================================================= */
/* Sistema y auditoría                                                      */
/* ======================================================================= */

export function AdminSystemPanel({
  canViewAudit,
  onGoToSection,
  auditRevision,
}: {
  canViewAudit: boolean
  onGoToSection: (section: AdminSection) => void
  /** Cambia tras cada escritura de la consola: la auditoría se recarga. */
  auditRevision: number
}) {
  const navigate = useNavigate()
  const blocks: Array<{
    label: string
    text: string
    cta: string
    icon: React.ReactNode
    onClick: () => void
  }> = [
    {
      label: 'Configuración',
      text: 'Qué puede hacer cada rol: matriz de permisos editable.',
      cta: 'Abrir permisos',
      icon: <NovexIcon name="shield" size={20} />,
      onClick: () => onGoToSection('permisos'),
    },
    {
      label: 'Catálogos',
      text: 'Coordinaciones y roles: altas, nombres, colores y estado.',
      cta: 'Abrir coordinaciones',
      icon: <AdminIcon name="org" size={20} />,
      onClick: () => onGoToSection('coordinaciones'),
    },
    {
      label: 'Auditoría',
      text: 'Registro de cada cambio: quién, qué y cuándo.',
      cta: 'Ver registro',
      icon: <AdminIcon name="key" size={20} />,
      onClick: () =>
        document.getElementById('admin-audit')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    },
    {
      label: 'Operaciones',
      text: 'Situaciones en curso: avanzar, trasladar o anular desde el Centro.',
      cta: 'Ir a la gestión',
      icon: <AdminIcon name="refresh" size={20} />,
      onClick: () => navigate('/centro-operacional?vista=gestion', { viewTransition: true }),
    },
  ]

  return (
    <>
      <section className="admin-console__card">
        <CardHead
          icon={<AdminIcon name="gear" size={30} strokeWidth={1.5} />}
          title="Sistema y auditoría"
          caption="Accesos a cada área de control de la plataforma."
        />
        <div className="admin-system">
          {blocks.map((block) => (
            <button key={block.label} type="button" className="admin-system__block" onClick={block.onClick}>
              <span className="admin-catalog__glyph" aria-hidden="true">
                {block.icon}
              </span>
              <strong>{block.label}</strong>
              <span>{block.text}</span>
              <span className="admin-system__cta">
                {block.cta}
                <NovexIcon name="chevron-right" size={15} />
              </span>
            </button>
          ))}
        </div>
      </section>
      {canViewAudit ? <AdminAuditLog revision={auditRevision} /> : null}
    </>
  )
}

const AUDIT_PAGE_SIZE = 20
const auditDate = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

function AdminAuditLog({ revision }: { revision: number }) {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<AdminAuditLogPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(
        await fetchAdminAuditLogs({
          page,
          limit: AUDIT_PAGE_SIZE,
          action: action || undefined,
          resourceType: resourceType || undefined,
          from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
          to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
        }),
      )
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }, [page, action, resourceType, from, to])

  useEffect(() => {
    void load()
  }, [load, revision])

  const pageCount = data ? Math.max(1, Math.ceil(data.total / AUDIT_PAGE_SIZE)) : 1
  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  return (
    <section className="admin-console__card" id="admin-audit" aria-labelledby="admin-audit-title">
      <header className="admin-console__card-head">
        <div className="admin-console__card-title">
          <AdminIcon name="key" size={30} strokeWidth={1.5} />
          <div>
            <h2 id="admin-audit-title">Registro de auditoría</h2>
            <p>Cada acción crítica de la plataforma, con quién la hizo y cuándo.</p>
          </div>
        </div>
        <div className="admin-console__card-actions">
          <button type="button" className="admin-console__ghost" onClick={() => void load()} disabled={loading}>
            <AdminIcon name="refresh" size={16} className={loading ? 'is-spinning' : undefined} />
            Actualizar
          </button>
        </div>
      </header>

      <div className="admin-audit__filters">
        <AdminField label="Acción">
          <select value={action} onChange={(e) => resetPage(setAction)(e.target.value)}>
            <option value="">Todas</option>
            {(data?.facets.actions ?? []).map((value) => (
              <option key={value} value={value}>
                {AUDIT_ACTION_LABEL[value] ?? value}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Recurso">
          <select value={resourceType} onChange={(e) => resetPage(setResourceType)(e.target.value)}>
            <option value="">Todos</option>
            {(data?.facets.resourceTypes ?? []).map((value) => (
              <option key={value} value={value}>
                {AUDIT_RESOURCE_LABEL[value] ?? value}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Desde">
          <input type="date" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </AdminField>
        <AdminField label="Hasta">
          <input type="date" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </AdminField>
      </div>

      {error ? (
        <p className="admin-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-users__table-wrap">
        <table className="admin-audit__table" aria-busy={loading}>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Acción</th>
              <th scope="col">Recurso</th>
              <th scope="col">Responsable</th>
              <th scope="col">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((item: AdminAuditLogItem) => (
              <tr key={item.id}>
                <td data-label="Fecha">{auditDate.format(new Date(item.createdAt))}</td>
                <td data-label="Acción">
                  <span className="admin-audit__action" data-resource={item.resourceType}>
                    {AUDIT_ACTION_LABEL[item.action] ?? item.action}
                  </span>
                </td>
                <td data-label="Recurso">{AUDIT_RESOURCE_LABEL[item.resourceType] ?? item.resourceType}</td>
                <td data-label="Responsable">
                  {item.actorName ? (
                    <span className="admin-audit__actor">
                      <strong>{item.actorName}</strong>
                      <small>{item.actorEmail}</small>
                    </span>
                  ) : (
                    <span className="admin-audit__muted">Sistema</span>
                  )}
                </td>
                <td data-label="Detalle" className="admin-audit__detail">
                  {describeAuditMetadata(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && data && data.items.length === 0 ? (
          <p className="admin-console__empty">No hay registros con estos filtros.</p>
        ) : null}
      </div>

      <footer className="admin-users__footer">
        <p aria-live="polite">
          {data ? `${data.total} ${data.total === 1 ? 'registro' : 'registros'}` : 'Cargando…'}
        </p>
        {pageCount > 1 ? (
          <nav className="admin-users__pager" aria-label="Paginación de auditoría">
            <button type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(page - 1)}>
              <NovexIcon name="chevron-left" size={18} />
            </button>
            <span className="admin-audit__page">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={page >= pageCount}
              onClick={() => setPage(page + 1)}
            >
              <NovexIcon name="chevron-right" size={18} />
            </button>
          </nav>
        ) : null}
      </footer>
    </section>
  )
}
