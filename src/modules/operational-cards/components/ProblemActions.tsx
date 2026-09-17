import { useId, type FormEvent } from 'react'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'
import type { OperationalSubmissionState } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * ACCIONES sobre el problema abierto, bajo su detalle y en el mismo panel.
 *
 * QUIÉN PUEDE SOLUCIONAR lo decide el BACKEND con `canResolve`, que viaja en la
 * respuesta del detalle. Aquí no se recalcula a partir del rol ni de la
 * coordinación: dos criterios acabarían discrepando, y el que manda es el del
 * servidor, que además vuelve a comprobarlo al recibir la resolución. Ocultar el
 * formulario es una comodidad de la interfaz, nunca la autorización.
 *
 * Tres situaciones, en este orden:
 *   RESUELTO    Ya tiene resolución: se muestra el aprendizaje y quién lo cerró.
 *               Un histórico sin aprendizaje se declara como tal, sin inventarlo.
 *   PUEDE       `canResolve` true: campo de aprendizaje y botón de solución.
 *   NO PUEDE    Se explica brevemente de quién es la acción, y se mantiene
 *               disponible la salida para reportar otro problema.
 */

const CERRADO = new Set(['CLOSED'])

export interface ProblemActionsProps {
  detail: ProblemDetail
  learningDraft: string
  submission: OperationalSubmissionState
  onLearningChange: (value: string) => void
  onResolve: () => void
  onReportAnother: () => void
}

export function ProblemActions({
  detail,
  learningDraft,
  submission,
  onLearningChange,
  onResolve,
  onReportAnother,
}: ProblemActionsProps) {
  const idPrefijo = useId()
  const enviando =
    submission.status === 'sending' &&
    submission.kind === 'resolution' &&
    submission.targetKey === detail.id
  const errorEnvio =
    submission.status === 'error' &&
    submission.kind === 'resolution' &&
    submission.targetKey === detail.id
      ? submission.errorMessage
      : null

  const yaCerrado = CERRADO.has(detail.status)
  const sinTexto = learningDraft.trim().length === 0

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (enviando || sinTexto) return
    onResolve()
  }

  return (
    <section
      className="problem-actions"
      data-testid="problem-actions"
      data-tour="problem-actions"
      data-can-resolve={detail.canResolve ? 'true' : 'false'}
      data-resolved={yaCerrado ? 'true' : 'false'}
      aria-label="Acciones sobre el problema"
    >
      {/* ---------- YA SOLUCIONADO ---------- */}
      {yaCerrado && (
        <div className="problem-actions__resolved" data-testid="problem-resolved">
          <h3 className="problem-actions__heading">Problema solucionado</h3>
          {detail.resolution ? (
            <>
              <p
                className="problem-actions__learning"
                data-testid="problem-learning"
              >
                {detail.resolution.learning}
              </p>
              <p className="problem-actions__byline">
                {detail.resolution.resolvedByUserName}
                {detail.resolution.resolvedAt && (
                  <>
                    {' · '}
                    {new Date(detail.resolution.resolvedAt).toLocaleDateString(
                      'es-CO',
                      { day: '2-digit', month: 'short', year: 'numeric' },
                    )}
                  </>
                )}
              </p>
            </>
          ) : (
            /*
             * Cerrado ANTES de que existiera el aprendizaje. Se dice tal cual:
             * no se inventa texto ni se atribuye una explicación a nadie.
             */
            <p
              className="problem-actions__note"
              data-testid="problem-without-learning"
            >
              Este problema se cerró antes de que se registrara el aprendizaje.
            </p>
          )}
        </div>
      )}

      {/* ---------- PUEDE SOLUCIONARLO ---------- */}
      {!yaCerrado && detail.canResolve && (
        <form
          className="problem-actions__form"
          data-testid="resolve-form"
          onSubmit={handleSubmit}
        >
          <label
            className="problem-actions__label"
            htmlFor={`${idPrefijo}-learning`}
          >
            ¿Qué aprendiste de este problema?
          </label>
          <textarea
            id={`${idPrefijo}-learning`}
            data-testid="resolve-learning"
            rows={4}
            maxLength={4000}
            required
            value={learningDraft}
            disabled={enviando}
            onChange={(e) => onLearningChange(e.target.value)}
          />

          {enviando && (
            <p
              className="problem-actions__note"
              data-testid="resolve-sending"
              role="status"
            >
              Registrando la solución…
            </p>
          )}

          {errorEnvio && (
            <p
              className="problem-actions__note problem-actions__note--error"
              data-testid="resolve-error"
              role="alert"
            >
              {errorEnvio}
            </p>
          )}

          <button
            type="submit"
            className="problem-actions__submit"
            data-testid="resolve-submit"
            disabled={enviando || sinTexto}
          >
            {enviando ? 'Registrando…' : 'Problema solucionado'}
          </button>
        </form>
      )}

      {/* ---------- NO PUEDE, PERO SÍ CONSULTAR ---------- */}
      {!yaCerrado && !detail.canResolve && (
        <p
          className="problem-actions__note"
          data-testid="resolve-not-allowed"
        >
          La solución de este problema corresponde al coordinador de la
          coordinación responsable.
        </p>
      )}

      {/*
        SALIDA SIEMPRE DISPONIBLE. Desde el detalle se puede volver al
        formulario sin tener que pasar por otra carta.
      */}
      <button
        type="button"
        className="problem-actions__secondary"
        data-testid="report-another-button"
        onClick={onReportAnother}
      >
        Reportar otro problema
      </button>
    </section>
  )
}
