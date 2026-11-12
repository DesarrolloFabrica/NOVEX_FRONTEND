import { NovexIcon } from '@/shared/components/NovexIcon'
import { AdminIcon } from '@/modules/admin-console/components/AdminConsoleIcons'
import type { summarize } from '@/modules/admin-console/adminConsoleModel'

type Summary = ReturnType<typeof summarize>

interface Stat {
  tone: 'green' | 'wine' | 'navy' | 'gold'
  icon: React.ReactNode
  value: number
  label: string
  note: string
  noteIcon: React.ReactNode
}

/**
 * Resumen en cuatro tarjetas. Las líneas secundarias son cifras reales del
 * catálogo (no tendencias: el backend no guarda histórico de altas).
 */
export function AdminStats({ summary }: { summary: Summary }) {
  const { users, roles, coordinations, permissions } = summary
  const stats: Stat[] = [
    {
      tone: 'green',
      icon: <NovexIcon name="users" size={26} />,
      value: users.active,
      label: 'Usuarios activos',
      note:
        users.inactive > 0
          ? `${users.inactive} ${users.inactive === 1 ? 'inactivo' : 'inactivos'} de ${users.total}`
          : `Todos los ${users.total} habilitados`,
      noteIcon: <AdminIcon name={users.inactive > 0 ? 'minus' : 'check-circle'} size={15} />,
    },
    {
      tone: 'wine',
      icon: <AdminIcon name="layers" size={26} />,
      value: roles.active,
      label: 'Roles vigentes',
      note: `${roles.system} del sistema`,
      noteIcon: <AdminIcon name="minus" size={15} />,
    },
    {
      tone: 'navy',
      icon: <AdminIcon name="org" size={26} />,
      value: coordinations.active,
      label: 'Coordinaciones',
      note:
        coordinations.inactive > 0
          ? `${coordinations.inactive} ${coordinations.inactive === 1 ? 'inactiva' : 'inactivas'}`
          : 'Todas operativas',
      noteIcon: <AdminIcon name={coordinations.inactive > 0 ? 'minus' : 'check-circle'} size={15} />,
    },
    {
      tone: 'gold',
      icon: <NovexIcon name="shield" size={26} />,
      value: permissions.total,
      label: 'Permisos centralizados',
      note: `En ${permissions.modules} ${permissions.modules === 1 ? 'módulo' : 'módulos'}`,
      noteIcon: <AdminIcon name="check-circle" size={15} />,
    },
  ]

  return (
    <section className="admin-console__stats" aria-label="Resumen administrativo">
      {stats.map((stat, index) => (
        <article
          key={stat.label}
          className={`admin-console__stat admin-console__stat--${stat.tone}`}
          style={{ '--stagger': index } as React.CSSProperties}
        >
          <span className="admin-console__stat-medal" aria-hidden="true">
            {stat.icon}
          </span>
          <div className="admin-console__stat-body">
            <strong className="admin-console__stat-value">{stat.value}</strong>
            <span className="admin-console__stat-label">{stat.label}</span>
            <span className="admin-console__stat-note">
              {stat.noteIcon}
              {stat.note}
            </span>
          </div>
        </article>
      ))}
    </section>
  )
}
