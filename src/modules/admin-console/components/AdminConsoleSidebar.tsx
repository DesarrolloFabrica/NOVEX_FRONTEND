import { lazy, Suspense } from 'react'
import { NovexIcon } from '@/shared/components/NovexIcon'
import type { AdminSection } from '@/modules/admin-console/adminConsoleModel'
import { AdminIcon } from '@/modules/admin-console/components/AdminConsoleIcons'

/** Diferido: el runtime de Rive ya suele estar en caché desde el Centro. */
const NovexCharacterFigure = lazy(() =>
  import('@/shared/character/NovexCharacterFigure').then((module) => ({
    default: module.NovexCharacterFigure,
  })),
)

const SECTIONS: Array<{ id: AdminSection; label: string; icon: React.ReactNode }> = [
  { id: 'usuarios', label: 'Usuarios', icon: <NovexIcon name="user" size={20} /> },
  { id: 'roles', label: 'Roles', icon: <AdminIcon name="layers" size={20} /> },
  { id: 'coordinaciones', label: 'Coordinaciones', icon: <AdminIcon name="org" size={20} /> },
  { id: 'permisos', label: 'Permisos', icon: <NovexIcon name="shield" size={20} /> },
  { id: 'sistema', label: 'Sistema y auditoría', icon: <AdminIcon name="gear" size={20} /> },
]

export function AdminConsoleSidebar({
  section,
  onSelect,
}: {
  section: AdminSection
  onSelect: (section: AdminSection) => void
}) {
  return (
    <aside className="admin-console__sidebar" aria-label="Administración del Sistema">
      <div className="admin-console__identity">
        <div className="admin-console__medallion" aria-hidden="true">
          <Suspense fallback={null}>
            <NovexCharacterFigure
              className="admin-console__character"
              mood="neutral"
              autoBlink
            />
          </Suspense>
        </div>
        <h2 className="admin-console__identity-title">Administración del Sistema</h2>
        <p className="admin-console__identity-text">Gestión y configuración de la plataforma.</p>
      </div>

      <span className="admin-console__rule" aria-hidden="true" />

      <nav className="admin-console__nav" aria-label="Secciones de administración">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="admin-console__nav-item"
            aria-current={section === item.id ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
          >
            <span className="admin-console__nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <svg
        className="admin-console__flourish"
        viewBox="0 0 120 28"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M60 4c-4 7-10 11-18 12 6 1 11 4 14 9h8c3-5 8-8 14-9-8-1-14-5-18-12Z" />
        <path d="M6 24h38M76 24h38" />
        <circle cx="60" cy="24" r="2.2" />
      </svg>
    </aside>
  )
}
