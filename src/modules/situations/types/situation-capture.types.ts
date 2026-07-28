export type DetectionMethod =
  | 'USUARIO'
  | 'COORDINADOR'
  | 'DIRECTOR'
  | 'SISTEMA'
  | 'MESA_AYUDA'
  | 'OTRO'

export type AffectedParty =
  | 'ESTUDIANTES'
  | 'DOCENTES'
  | 'ADMINISTRATIVOS'
  | 'SISTEMAS'
  | 'PROCESOS_INTERNOS'
  | 'COMUNIDAD_EXTERNA'
  | 'OTRO'

export interface CaptureFileAttachment {
  id: string
  file: File
}

export interface SituationCaptureDraft {
  title: string
  description: string
  coordinationId: string
  reportedAt: string
  detectionMethod: DetectionMethod | ''
  detectionMethodOther: string
  affectedParties: AffectedParty[]
  affectedPartyOther: string
  relatedCoordinationIds: string[]
  additionalNotes: string
  attachments: CaptureFileAttachment[]
}

export const DETECTION_METHOD_OPTIONS: Array<{
  value: DetectionMethod
  label: string
}> = [
  { value: 'USUARIO', label: 'Usuario' },
  { value: 'COORDINADOR', label: 'Coordinador' },
  { value: 'DIRECTOR', label: 'Director' },
  { value: 'SISTEMA', label: 'Sistema' },
  { value: 'MESA_AYUDA', label: 'Mesa de ayuda' },
  { value: 'OTRO', label: 'Otro' },
]

export const AFFECTED_PARTY_OPTIONS: Array<{
  value: AffectedParty
  label: string
}> = [
  { value: 'ESTUDIANTES', label: 'Estudiantes' },
  { value: 'DOCENTES', label: 'Docentes' },
  { value: 'ADMINISTRATIVOS', label: 'Administrativos' },
  { value: 'SISTEMAS', label: 'Sistemas' },
  { value: 'PROCESOS_INTERNOS', label: 'Procesos internos' },
  { value: 'COMUNIDAD_EXTERNA', label: 'Comunidad externa' },
  { value: 'OTRO', label: 'Otro' },
]
