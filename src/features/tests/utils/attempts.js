export const ATTEMPT_STATUS_LABELS = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

export function assignmentStatusLabel(row) {
  if (row.excluded) return 'Excluida'
  if (row.attemptStatus === 'IN_PROGRESS') {
    return `Oración ${row.currentPosition} de ${row.sentenceCount}`
  }
  return ATTEMPT_STATUS_LABELS[row.attemptStatus] ?? row.attemptStatus
}

export function hasAttemptsInProgress(rows) {
  return (rows ?? []).some((row) => row.attemptStatus === 'IN_PROGRESS' && !row.excluded)
}

export function exclusionReasonError(reason) {
  const length = reason?.trim().length ?? 0

  if (length === 0) return ''
  if (length < 10) return 'Escribe al menos 10 caracteres.'
  if (length > 500) return 'Máximo 500 caracteres.'
  return ''
}

export function errorSourceLabel(response) {
  return (
    { AUTO: 'Automático', ANNOTATED: 'Anotado', PENDING: 'Sin anotar' }[response.errorSource] ??
    response.errorSource
  )
}

export function formatDuration(ms) {
  if (ms == null) return '—'

  const seconds = ms / 1000
  const roundedSeconds = Math.round(seconds)
  if (seconds < 60 && roundedSeconds < 60) {
    return `${Number(seconds.toFixed(1)).toString().replace('.', ',')} s`
  }

  const minutes = Math.floor(roundedSeconds / 60)
  return `${minutes} min ${roundedSeconds % 60} s`
}

export function editDetail(detailJson) {
  if (!detailJson) return []

  try {
    const detail = JSON.parse(detailJson)
    return Array.isArray(detail?.edits) ? detail.edits : []
  } catch {
    return []
  }
}

export function editLabel(edit) {
  if (edit.type === 'OMISION') return `falta «${edit.expected}»`
  if (edit.type === 'INSERCION') return `sobra «${edit.written}»`
  if (['SUSTITUCION', 'UNION', 'SEPARACION'].includes(edit.type)) {
    return `${edit.written} → ${edit.expected}`
  }
  return ''
}
