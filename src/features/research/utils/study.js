export const PROMPT_MAX_LENGTH = 5000
export const STUDY_CODE_MAX_LENGTH = 40
export const STUDY_TITLE_MAX_LENGTH = 120

const STUDY_CODE_PATTERN = /^[A-Z0-9-]+$/

const SEQUENCE_LABELS = {
  ASSISTED_FIRST: 'Asistida primero',
  UNASSISTED_FIRST: 'Sin asistencia primero',
}

const TASK_LABELS = {
  TASK_A: 'Tarea A',
  TASK_B: 'Tarea B',
}

const CONDITION_LABELS = {
  ASSISTED: 'Con asistencia',
  UNASSISTED: 'Sin asistencia',
}

const PROTOCOL_STATUS_LABELS = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  RETIRED: 'Retirado',
}

const PROTOCOL_STATUS_SEVERITIES = {
  DRAFT: 'info',
  ACTIVE: 'success',
  RETIRED: 'secondary',
}

const STUDY_STATUS_LABELS = {
  DRAFT: 'Sin activar',
  ACTIVE: 'Activo',
  CLOSED: 'Cerrado',
}

const timeFormatter = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const dateFormatter = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function protocolFormErrors({ taskAPrompt = '', taskBPrompt = '' } = {}) {
  return {
    ...promptError('taskAPrompt', 'Tarea A', taskAPrompt),
    ...promptError('taskBPrompt', 'Tarea B', taskBPrompt),
  }
}

export function studyFormErrors({ code = '', title = '' } = {}) {
  const errors = {}
  const trimmedCode = code.trim()
  const trimmedTitle = title.trim()

  if (!trimmedCode) {
    errors.code = 'El código es obligatorio.'
  } else if (trimmedCode.length > STUDY_CODE_MAX_LENGTH) {
    errors.code = `Máximo ${STUDY_CODE_MAX_LENGTH} caracteres.`
  } else if (!STUDY_CODE_PATTERN.test(trimmedCode)) {
    errors.code = 'Usa solo mayúsculas, números y guiones.'
  }

  if (!trimmedTitle) {
    errors.title = 'El título es obligatorio.'
  } else if (trimmedTitle.length > STUDY_TITLE_MAX_LENGTH) {
    errors.title = `Máximo ${STUDY_TITLE_MAX_LENGTH} caracteres.`
  }

  return errors
}

export function accessCodeState(participant, runs, now = new Date()) {
  const latestRun = latestParticipantRun(participant, runs)
  const none = { kind: 'NONE', label: '—', severity: 'secondary', pendingRunId: null }

  if (!latestRun) return none

  if (latestRun.status === 'ACTIVE') {
    return { kind: 'ACTIVE', label: 'En curso', severity: 'warn', pendingRunId: null }
  }

  if (latestRun.status === 'PENDING') {
    const expiresAt = new Date(latestRun.accessCodeExpiresAt)
    const isExpired = Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= toTime(now)

    if (isExpired) {
      return {
        kind: 'EXPIRED',
        label: 'Vencido',
        severity: 'secondary',
        pendingRunId: latestRun.id,
      }
    }

    return {
      kind: 'ISSUED',
      label: `Código emitido · vence ${formatTime(latestRun.accessCodeExpiresAt)}`,
      severity: 'info',
      pendingRunId: latestRun.id,
    }
  }

  if (latestRun.status === 'EXPIRED') {
    return { kind: 'EXPIRED', label: 'Vencido', severity: 'secondary', pendingRunId: null }
  }

  return none
}

export function canGenerateCode(participant, study) {
  return Boolean(
    study?.status === 'ACTIVE' &&
    participant &&
    !participant.hasOpenRun &&
    !participant.protocolCompleted,
  )
}

// Motivo por el que "Generar código" está deshabilitado ('' cuando sí se puede).
export function generateCodeHint(participant, study) {
  if (study?.status === 'CLOSED') return 'El estudio está cerrado.'
  if (study?.status !== 'ACTIVE') return 'Activa un protocolo primero.'
  if (participant?.protocolCompleted) return 'El participante completó ambas condiciones.'
  if (participant?.hasOpenRun) return 'El participante tiene una sesión abierta.'

  return ''
}

// Mientras exista un PENDING (vigente o vencido en el cliente) la vía correcta es
// Regenerar/Revocar; "Generar código" solo se ofrece cuando no hay código abierto.
export function participantActions(participant, codeState, study) {
  const pendingRunId = codeState?.pendingRunId ?? null

  return {
    showGenerate: !pendingRunId,
    canGenerate: canGenerateCode(participant, study),
    generateHint: generateCodeHint(participant, study),
    showRegenerate: Boolean(pendingRunId),
    showRevoke: Boolean(pendingRunId),
    pendingRunId,
  }
}

export function matchesPendingAction(pendingAction, kind, participantId = null) {
  if (!pendingAction || pendingAction.kind !== kind) return false

  return participantId === null || pendingAction.participantId === participantId
}

export function sequenceLabel(sequence) {
  return SEQUENCE_LABELS[sequence] ?? sequence
}

export function nextSessionLabel(nextSession) {
  if (!nextSession) return 'Protocolo completo'

  return `${TASK_LABELS[nextSession.task] ?? nextSession.task} · ${
    CONDITION_LABELS[nextSession.condition] ?? nextSession.condition
  }`
}

export function taskLabel(task) {
  return TASK_LABELS[task] ?? task
}

export function conditionLabel(condition) {
  return CONDITION_LABELS[condition] ?? condition
}

export function protocolStatusLabel(status) {
  return PROTOCOL_STATUS_LABELS[status] ?? status
}

export function protocolStatusSeverity(status) {
  return PROTOCOL_STATUS_SEVERITIES[status] ?? 'secondary'
}

export function studyStatusLabel(status) {
  return STUDY_STATUS_LABELS[status] ?? status
}

export function formatTime(value) {
  return formatWith(timeFormatter, value)
}

export function formatDate(value) {
  return formatWith(dateFormatter, value)
}

export function formatDateTime(value) {
  return formatWith(dateTimeFormatter, value)
}

// Estado del shell: solo afirma "Actualizado hh:mm" con una recarga completa exitosa y sin una
// carga o un error en curso que la contradiga.
export function refreshStatusLabel(lastRefreshAt, { isLoading = false, hasError = false } = {}) {
  if (!lastRefreshAt || isLoading || hasError) return ''

  const time = formatTime(lastRefreshAt)

  return time === '—' ? '' : `Actualizado ${time}`
}

function promptError(field, taskName, value) {
  if (!value.trim()) {
    return { [field]: `La consigna de la ${taskName} es obligatoria.` }
  }

  if (value.length > PROMPT_MAX_LENGTH) {
    return { [field]: `Máximo ${PROMPT_MAX_LENGTH} caracteres.` }
  }

  return {}
}

function latestParticipantRun(participant, runs) {
  const participantRuns = runs.filter((run) => run.participantId === participant?.id)

  if (participantRuns.length === 0) return null

  return [...participantRuns].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )[0]
}

function toTime(value) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

function formatWith(formatter, value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date)
}
