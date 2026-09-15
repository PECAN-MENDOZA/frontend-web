import { translateBackendMessage } from './errors.js'

export const REASON_MIN_LENGTH = 10
export const REASON_MAX_LENGTH = 500

const OPEN_STATUSES = ['PENDING', 'ACTIVE']
const EXCLUDABLE_STATUSES = ['COMPLETED', 'TECHNICAL_FAILURE']

const INCIDENT_LABELS = {
  AI_REQUEST_FAILED: 'IA sin respuesta',
  MODEL_VERSION_CHANGED: 'Cambio de versión del modelo',
  DURATION_INCONSISTENT: 'Duración inconsistente',
  DURATION_IMPLAUSIBLY_SHORT: 'Duración implausiblemente corta',
  TECHNICAL_FAILURE: 'Fallo técnico',
}

// Disposición analítica de una ejecución: qué puede entrar al análisis y qué no.
export const READINESS_OPTIONS = [
  { value: 'analizable', label: 'Analizable' },
  { value: 'abierta', label: 'Abierta' },
  { value: 'descartada', label: 'Descartada' },
  { value: 'excluida', label: 'Excluida' },
]

export function runReadiness(run) {
  if (run.excluded) return 'excluida'
  if (run.status === 'COMPLETED') return 'analizable'
  if (OPEN_STATUSES.includes(run.status)) return 'abierta'

  return 'descartada'
}

// El backend no filtra ejecuciones: cada criterio acepta un valor, una lista o nada.
export function filterRuns(runs, { status, condition, readiness } = {}) {
  const statuses = toList(status)
  const conditions = toList(condition)
  const readinesses = toList(readiness)

  return runs.filter(
    (run) =>
      matches(statuses, run.status) &&
      matches(conditions, run.condition) &&
      matches(readinesses, runReadiness(run)),
  )
}

export function formatDuration(durationMs) {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) {
    return '—'
  }

  const totalSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function incidentLabel(reason) {
  return INCIDENT_LABELS[reason] ?? reason
}

export function incidentSummary(run) {
  const counts = new Map()

  for (const incident of run.incidents ?? []) {
    counts.set(incident.reason, (counts.get(incident.reason) ?? 0) + 1)
  }

  return [...counts]
    .map(([reason, count]) =>
      count > 1 ? `${incidentLabel(reason)} ×${count}` : incidentLabel(reason),
    )
    .join(' · ')
}

// Misma regla que el backend (10–500 caracteres); el botón de confirmar depende de ella.
export function reasonErrors(reason) {
  const trimmed = typeof reason === 'string' ? reason.trim() : ''

  if (!trimmed) return ['El motivo es obligatorio.']
  if (trimmed.length < REASON_MIN_LENGTH)
    return [`Escribe al menos ${REASON_MIN_LENGTH} caracteres.`]
  if (trimmed.length > REASON_MAX_LENGTH) return [`Máximo ${REASON_MAX_LENGTH} caracteres.`]

  return []
}

// Transiciones que el backend acepta: cancelar/fallo técnico solo abiertas; excluir una sola vez.
export function runActions(run) {
  const isOpen = OPEN_STATUSES.includes(run.status)

  return {
    canCancel: isOpen,
    canFail: isOpen,
    canExclude: EXCLUDABLE_STATUSES.includes(run.status) && !run.excluded,
  }
}

// El backend no expone qué ejecuciones entraron en cada lote: un lote congela las ejecuciones
// COMPLETED existentes al crearse, así que una ejecución completada antes de algún lote se
// considera "En lote". Para ejecuciones no completadas la anotación no aplica (null).
export function annotationState(run, batches) {
  if (run.status !== 'COMPLETED') return null

  const completedAt = toTime(run.completedAt ?? run.createdAt)
  const isFrozen = (batches ?? []).some((batch) => {
    const batchCreatedAt = toTime(batch.createdAt)

    return (
      Number.isFinite(batchCreatedAt) &&
      Number.isFinite(completedAt) &&
      completedAt < batchCreatedAt
    )
  })

  return isFrozen ? 'En lote' : 'Sin lote'
}

// El motivo puede ser texto libre del investigador, un código de incidencia o un mensaje fijo
// del teclado del alumno: los dos últimos se muestran en español.
export function runReason(run) {
  const reason = run.exclusionReason || run.failureReason || ''

  return translateBackendMessage(incidentLabel(reason))
}

export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text ?? ''

  return `${text.slice(0, maxLength - 1)}…`
}

function toList(value) {
  if (value === null || value === undefined || value === '') return []

  return Array.isArray(value) ? value : [value]
}

function matches(selected, value) {
  return selected.length === 0 || selected.includes(value)
}

function toTime(value) {
  if (!value) return Number.NaN

  return new Date(value).getTime()
}
