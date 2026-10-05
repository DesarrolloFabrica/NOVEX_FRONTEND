import { useAuth } from '@/modules/auth/hooks/useAuth'
import { normalizeRoleCode } from '@/modules/auth/utils/roleExperience'
import { resolveOperationalCenterExperience } from '@/modules/operational-cards/experience/resolveOperationalCenterExperience'
import { AdminOperationalShell } from '@/modules/operational-cards/experience/shells/AdminOperationalShell'
import { AnalystOperationalShell } from '@/modules/operational-cards/experience/shells/AnalystOperationalShell'
import { CoordinatorOperationalShell } from '@/modules/operational-cards/experience/shells/CoordinatorOperationalShell'
import { DirectorOperationalShell } from '@/modules/operational-cards/experience/shells/DirectorOperationalShell'
import '@/styles/operational-character.css'
import '@/styles/operational-shell.css'
import '@/styles/operational-shell-ticket-fabrica.css'
import '@/styles/operational-shell-ticket-fabrica-pilot.css'
import '@/styles/operational-problem-dossier.css'

/**
 * Punto de entrada del Centro Operacional: elige el shell por rol.
 * Sustituye el monolito OperationalShellV2.
 */
export function OperationalCenterHome() {
  const { user } = useAuth()
  const experience = resolveOperationalCenterExperience(
    normalizeRoleCode(user?.roleCode),
  )

  switch (experience) {
    case 'director':
      return <DirectorOperationalShell />
    case 'analyst':
      return <AnalystOperationalShell />
    case 'coordinator':
      return <CoordinatorOperationalShell />
    case 'admin':
      return <AdminOperationalShell />
  }
}
