/**
 * Copy del cierre con aprendizaje (`POST /situations/:id/resolution`).
 *
 * El contrato solo acepta `learning`: un texto no vacío. No hay campos
 * separados de «solución», «procesos afectados» ni «medida preventiva».
 * La ayuda pide un relato útil que cubra esos aspectos en un solo texto
 * persistido en `situation_resolutions.learning`.
 */

export type ResolutionReportKind = 'INTERNAL' | 'INTER_COORDINATION'

export interface ResolutionCopy {
  blockTitle: string
  blockHint: string
  fieldLabel: string
  fieldHelp: string
  placeholder: string
  submitLabel: string
  submittingLabel: string
  resolvedLabel: string
  emptyError: string
}

export function resolveResolutionCopy(
  reportKind: ResolutionReportKind | null | undefined,
): ResolutionCopy {
  const esInterno = reportKind !== 'INTER_COORDINATION'

  if (esInterno) {
    return {
      blockTitle: 'Cerrar con aprendizaje',
      blockHint:
        'Al confirmar, el problema queda cerrado. Todo el relato se guarda en un único aprendizaje del cierre.',
      fieldLabel: 'Aprendizaje del cierre',
      fieldHelp:
        'Indique qué se hizo para solucionarlo, qué procesos resultaron afectados y qué medida ayudaría a evitar que se repita.',
      placeholder:
        'Ej.: Se restableció el servicio de notas; afectó carga de notas y consulta de horarios; se documentó un runbook de rollback.',
      submitLabel: 'Cerrar problema',
      submittingLabel: 'Cerrando…',
      resolvedLabel: 'Aprendizaje registrado',
      emptyError:
        'Escriba el aprendizaje del cierre antes de cerrar el problema.',
    }
  }

  return {
    blockTitle: 'Cerrar con aprendizaje',
    blockHint:
      'Al confirmar, el problema queda cerrado. Todo el relato se guarda en un único aprendizaje del cierre.',
    fieldLabel: 'Aprendizaje del cierre',
    fieldHelp:
      'Indique qué se hizo para solucionarlo, qué entrega o dependencia resultó afectada y qué medida ayudaría a evitar que se repita.',
    placeholder:
      'Ej.: Se acordó el handoff con Especializaciones; la entrega del listado retrasó la matrícula; se fijará fecha de compromiso antes de reportar.',
    submitLabel: 'Cerrar problema',
    submittingLabel: 'Cerrando…',
    resolvedLabel: 'Aprendizaje registrado',
    emptyError:
      'Escriba el aprendizaje del cierre antes de cerrar el problema.',
  }
}
