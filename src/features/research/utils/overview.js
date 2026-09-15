const STATUS_LABELS = {
  PENDING: 'Código emitido',
  ACTIVE: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Vencida',
  TECHNICAL_FAILURE: 'Fallo técnico',
}

const CONDITION_LABELS = {
  ASSISTED: 'Con asistencia',
  UNASSISTED: 'Sin asistencia',
}

const STATUS_SEVERITIES = {
  PENDING: 'info',
  ACTIVE: 'warn',
  COMPLETED: 'success',
  CANCELLED: 'secondary',
  EXPIRED: 'secondary',
  TECHNICAL_FAILURE: 'danger',
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? 'Sin sesión'
}

export function conditionLabel(condition) {
  return CONDITION_LABELS[condition] ?? condition
}

export function statusSeverity(status) {
  return STATUS_SEVERITIES[status] ?? 'secondary'
}

export function participantReadiness({ assisted, unassisted, excluded }) {
  if (excluded) {
    return { label: 'Excluido', severity: 'danger' }
  }

  const completedCount = [assisted, unassisted].filter((status) => status === 'COMPLETED').length

  if (completedCount === 2) {
    return { label: 'Listo para análisis', severity: 'success' }
  }

  if (completedCount === 1) {
    return { label: 'Falta una condición', severity: 'warn' }
  }

  return { label: 'Sin sesiones', severity: 'secondary' }
}

export function pairRows(participants, runs) {
  return participants.map((participant) => {
    const participantRuns = runs.filter((run) => run.participantId === participant.id)
    const taskA = buildTaskInfo(
      pickBestRun(participantRuns.filter((run) => run.task === 'TASK_A')),
      inferCondition(participant.sequence, 'TASK_A'),
    )
    const taskB = buildTaskInfo(
      pickBestRun(participantRuns.filter((run) => run.task === 'TASK_B')),
      inferCondition(participant.sequence, 'TASK_B'),
    )
    const assisted = taskA.condition === 'ASSISTED' ? taskA : taskB
    const unassisted = taskA.condition === 'UNASSISTED' ? taskA : taskB

    return {
      pseudonym: participant.pseudonym,
      sequence: participant.sequence,
      taskA,
      taskB,
      readiness: participantReadiness({
        assisted: assisted.status,
        unassisted: unassisted.status,
        excluded: assisted.excluded || unassisted.excluded,
      }),
    }
  })
}

export function overviewCounts(rows, runs, batches) {
  return {
    readyPairs: rows.filter((row) => row.readiness.severity === 'success').length,
    participants: rows.length,
    pendingRuns: runs.filter((run) => run.status === 'PENDING' || run.status === 'ACTIVE').length,
    failures: runs.filter(
      (run) =>
        run.status === 'TECHNICAL_FAILURE' || (run.status === 'COMPLETED' && run.incidentCount > 0),
    ).length,
    pendingAdjudications: batches.filter((batch) => !batch.adjudicationCurrent).length,
  }
}

export function versionStrip(study, runs) {
  return {
    protocolVersion: study?.activeProtocolVersion ?? null,
    appVersions: uniqueValues(runs, 'appVersion'),
    modelVersions: uniqueValues(runs, 'modelVersion'),
    backendVersions: uniqueValues(runs, 'backendVersion'),
  }
}

function inferCondition(sequence, task) {
  const assistedFirst = sequence === 'ASSISTED_FIRST'

  if (task === 'TASK_A') return assistedFirst ? 'ASSISTED' : 'UNASSISTED'
  return assistedFirst ? 'UNASSISTED' : 'ASSISTED'
}

function buildTaskInfo(run, fallbackCondition) {
  if (!run) {
    return { condition: fallbackCondition, status: null, runId: null, excluded: false }
  }

  return {
    condition: run.condition ?? fallbackCondition,
    status: run.status,
    runId: run.id,
    excluded: Boolean(run.excluded),
  }
}

function pickBestRun(taskRuns) {
  if (taskRuns.length === 0) return null

  const sorted = [...taskRuns].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )

  return sorted.find((run) => run.status === 'COMPLETED' && !run.excluded) ?? sorted[0]
}

function uniqueValues(runs, field) {
  return [...new Set(runs.map((run) => run[field]).filter(Boolean))]
}
