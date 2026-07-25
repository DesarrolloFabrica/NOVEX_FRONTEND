import { useAuth } from '@/modules/auth/hooks/useAuth'

interface OmegaProductHeaderProps {
  title: string
}

export function OmegaProductHeader({ title }: OmegaProductHeaderProps) {
  const { user } = useAuth()
  const today = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date())
  const firstName = user?.name?.split(' ')[0] ?? 'Operador'
  const role =
    user?.role === 'supervisor' ? 'Dirección de Operaciones' : 'Unidad operativa'

  return (
    <header className="omega-os-topbar">
      <div className="omega-os-topbar__heading">
        <p className="omega-os-topbar__eyebrow">Centro de Inteligencia Operacional</p>
        <h1>
          Buenas noches, <span>{firstName}</span>
        </h1>
        <p className="omega-os-topbar__route">
          <span aria-hidden="true" />
          {title}
        </p>
      </div>

      <div className="omega-os-topbar__telemetry" aria-label="Estado del sistema">
        <div className="omega-os-topbar__date">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M5 5.5h14v14H5zM8 3.5v4M16 3.5v4M5 9h14" />
          </svg>
          <span>{today}</span>
        </div>
        <div className="omega-os-topbar__status">
          <span aria-hidden="true" />
          <div>
            <strong>Sistemas nominales</strong>
            <small>Sincronización en tiempo real</small>
          </div>
        </div>
        <div className="omega-os-topbar__profile">
          <span className="omega-os-topbar__avatar" aria-hidden="true">
            {firstName.slice(0, 1)}
          </span>
          <div>
            <strong>{user?.name ?? 'Operador O.M.E.G.A.'}</strong>
            <small>{role}</small>
          </div>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m8 10 4 4 4-4" />
          </svg>
        </div>
      </div>
    </header>
  )
}
