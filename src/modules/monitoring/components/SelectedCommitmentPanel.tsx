import { useEffect, useState } from 'react'
import type { ExecutionAction, ExecutionActionStatus } from '@/modules/execution-actions/types/execution-action.types'
import { PRIORITY_LABELS } from '@/modules/execution-actions/types/execution-action.types'

interface Props { action: ExecutionAction | null; canUpdate: boolean; isUpdating: boolean; onUpdateStatus: (input: { status: ExecutionActionStatus; note?: string; observation?: string }) => Promise<void> | void }
const statuses: Array<[ExecutionActionStatus, string]> = [['in_progress', 'En proceso'], ['pending', 'En espera'], ['executed', 'Resuelta'], ['not_executable', 'No fue posible resolver']]
const labels: Record<ExecutionActionStatus, string> = { pending: 'En espera', in_progress: 'En proceso', executed: 'Resuelta', not_executable: 'No fue posible resolver' }
const formatDate = (value: string) => new Date(value).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function historyEvent(item: ExecutionAction['timeline'][number]) {
  if (item.type === 'ai_generated') return { title: 'Análisis ejecutivo generado', change: 'Informe disponible' }
  if (item.type === 'executed') return { title: 'Situación marcada como Resuelta', change: 'Ciclo operativo finalizado' }
  if (item.type === 'not_executable') return { title: 'Estado cambiado', change: 'No fue posible resolver' }
  if (item.type === 'in_progress') return { title: 'Estado cambiado', change: 'En espera → En proceso' }
  return { title: 'Situación registrada', change: 'Expediente creado' }
}

export function SelectedCommitmentPanel({ action, canUpdate, isUpdating, onUpdateStatus }: Props) {
  const [draft, setDraft] = useState<ExecutionActionStatus | null>(null)
  const [note, setNote] = useState('')
  const [observation, setObservation] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => { setDraft(null); setNote(''); setObservation(''); setMessage('') }, [action?.id])
  if (!action) return <section className="cunmark-action-detail cunmark-action-detail--empty"><strong>Ninguna situación seleccionada</strong><p>Selecciona una situación para revisar su expediente operativo.</p></section>

  const status = draft ?? action.executionStatus
  const reasonRequired = status === 'pending' || status === 'not_executable'
  const observationRequired = status === 'executed' || status === 'not_executable'
  const save = async () => {
    if (status === action.executionStatus) return
    if (reasonRequired && note.trim().length < 4) return setMessage('Indica el motivo requerido.')
    try { await onUpdateStatus({ status, note: note.trim() || undefined, observation: observation.trim() || undefined }); setDraft(null); setMessage('Situación actualizada correctamente.') } catch { setMessage('No se pudo guardar la actualización.') }
  }

  return <article className="cunmark-action-detail" data-status={action.executionStatus} data-priority={action.priority}>
    <header className="cunmark-action-detail__header"><div className="cunmark-action-detail__heading"><p>Expediente operativo</p><h2>{action.eventTitle}</h2></div><div className="cunmark-action-detail__signals"><span className="cunmark-action-detail__priority"><i />{PRIORITY_LABELS[action.priority]}</span><span className="cunmark-action-detail__state"><i />{labels[action.executionStatus]}</span></div></header>
    <section className="cunmark-situation-block cunmark-general-strip"><h3>Información general</h3><dl className="cunmark-action-detail__facts"><div><dt>Estado</dt><dd>{labels[action.executionStatus]}</dd></div><div><dt>Riesgo</dt><dd>{PRIORITY_LABELS[action.priority]}</dd></div><div><dt>Área responsable</dt><dd>{action.suggestedAreaName}</dd></div><div><dt>Responsable actual</dt><dd>{action.suggestedAreaName}</dd></div><div><dt>Fecha de creación</dt><dd>{formatDate(action.createdAt)}</dd></div></dl></section>
    <div className="cunmark-situation-lifecycle" aria-label="Línea de vida de la situación"><span className="is-complete"><i />Registrada</span><b /><span className="is-complete"><i />Analizada IA</span><b /><span className={status === 'executed' || status === 'not_executable' ? 'is-complete' : 'is-current'}><i />En gestión</span><b /><span className={status === 'executed' ? 'is-current' : ''}><i />Resuelta</span></div>
    <section className="cunmark-situation-block cunmark-action-detail__context"><h3>Contexto de la situación</h3><div className="cunmark-situation-context"><div><strong>Situación de origen</strong><p>{action.eventTitle}</p></div><div><strong>Riesgo si continúa</strong><p>{action.riskIfNotExecuted}</p></div><div><strong>Resumen ejecutivo</strong><p>{action.executiveSummary}</p></div></div></section>
    <section className="cunmark-action-update"><header><p>Gestión del estado</p><span>Esta es la acción principal del expediente.</span></header><div className="cunmark-action-update__selector" role="radiogroup" aria-label="Estado actual">{statuses.map(([value, label]) => <button key={value} type="button" disabled={!canUpdate || isUpdating} aria-pressed={status === value} data-status={value} onClick={() => { setDraft(value); setMessage('') }}><i />{label}</button>)}</div><div className="cunmark-action-update__conditional">{reasonRequired && <label><span>{status === 'pending' ? 'Motivo de espera *' : 'Motivo *'}</span><textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Registra el motivo operativo." /></label>}{observationRequired && <label><span>{status === 'executed' ? 'Observaciones finales' : 'Observaciones *'}</span><textarea value={observation} onChange={e => setObservation(e.target.value)} rows={2} placeholder="Registra una observación." /></label>}</div><div className="cunmark-action-update__confirm"><button type="button" disabled={!canUpdate || isUpdating || status === action.executionStatus} onClick={() => void save()}>{isUpdating ? 'Guardando…' : 'Guardar actualización'}</button>{message && <span role="status">{message}</span>}</div></section>
    <section className="cunmark-action-history"><h3>Historial operativo</h3><ol>{action.timeline.map((item, index) => { const event = historyEvent(item); return <li key={`${item.type}-${item.at}-${index}`}><time>{new Date(item.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</time><div><strong>{event.title}</strong><span>{event.change}</span><small>{item.byUserName ?? (item.type === 'ai_generated' ? 'IA Operacional' : 'Sistema')}</small></div></li> })}</ol></section>
  </article>
}
