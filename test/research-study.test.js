import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PROMPT_MAX_LENGTH,
  accessCodeState,
  canGenerateCode,
  formatTime,
  generateCodeHint,
  matchesPendingAction,
  nextSessionLabel,
  participantActions,
  protocolFormErrors,
  refreshStatusLabel,
  sequenceLabel,
  studyFormErrors,
} from '../src/features/research/utils/study.js'

test('protocolFormErrors requires both prompts', () => {
  assert.deepEqual(
    protocolFormErrors({
      taskAPrompt: 'Cuenta tu fin de semana',
      taskBPrompt: 'Describe tu lugar favorito',
    }),
    {},
  )
  assert.deepEqual(protocolFormErrors({ taskAPrompt: '   ', taskBPrompt: '' }), {
    taskAPrompt: 'La consigna de la Tarea A es obligatoria.',
    taskBPrompt: 'La consigna de la Tarea B es obligatoria.',
  })
  assert.deepEqual(protocolFormErrors({}), {
    taskAPrompt: 'La consigna de la Tarea A es obligatoria.',
    taskBPrompt: 'La consigna de la Tarea B es obligatoria.',
  })
})

test('protocolFormErrors limits each prompt to 5000 characters', () => {
  const limit = 'a'.repeat(PROMPT_MAX_LENGTH)
  const tooLong = 'a'.repeat(PROMPT_MAX_LENGTH + 1)

  assert.equal(PROMPT_MAX_LENGTH, 5000)
  assert.deepEqual(protocolFormErrors({ taskAPrompt: limit, taskBPrompt: limit }), {})
  assert.deepEqual(protocolFormErrors({ taskAPrompt: tooLong, taskBPrompt: limit }), {
    taskAPrompt: 'Máximo 5000 caracteres.',
  })
  assert.deepEqual(protocolFormErrors({ taskAPrompt: limit, taskBPrompt: tooLong }), {
    taskBPrompt: 'Máximo 5000 caracteres.',
  })
})

test('studyFormErrors validates code and title', () => {
  assert.deepEqual(studyFormErrors({ code: 'EXP-2026-01', title: 'Piloto teclado adaptativo' }), {})
  assert.deepEqual(studyFormErrors({ code: '', title: '' }), {
    code: 'El código es obligatorio.',
    title: 'El título es obligatorio.',
  })
  assert.deepEqual(studyFormErrors({ code: 'exp 01', title: 'Piloto' }), {
    code: 'Usa solo mayúsculas, números y guiones.',
  })
  assert.deepEqual(studyFormErrors({ code: 'A'.repeat(41), title: 'Piloto' }), {
    code: 'Máximo 40 caracteres.',
  })
  assert.deepEqual(studyFormErrors({ code: 'EXP-01', title: 'T'.repeat(121) }), {
    title: 'Máximo 120 caracteres.',
  })
  assert.deepEqual(studyFormErrors({ code: 'A'.repeat(40), title: 'T'.repeat(120) }), {})
})

const participant = { id: 'p1', pseudonym: 'P-001', hasOpenRun: false, protocolCompleted: false }
const now = new Date('2026-09-15T14:00:00Z')

test('accessCodeState reports a valid pending code with its expiry time', () => {
  const expiresAt = '2026-09-15T14:30:00Z'
  const runs = [
    {
      id: 'r1',
      participantId: 'p1',
      status: 'PENDING',
      accessCodeExpiresAt: expiresAt,
      createdAt: '2026-09-15T14:00:00Z',
    },
    { id: 'other', participantId: 'p2', status: 'ACTIVE', createdAt: '2026-09-15T13:00:00Z' },
  ]

  assert.deepEqual(accessCodeState(participant, runs, now), {
    kind: 'ISSUED',
    label: `Código emitido · vence ${formatTime(expiresAt)}`,
    severity: 'info',
    pendingRunId: 'r1',
  })
})

test('accessCodeState reports an expired pending code as revocable', () => {
  const runs = [
    {
      id: 'r1',
      participantId: 'p1',
      status: 'PENDING',
      accessCodeExpiresAt: '2026-09-15T13:59:59Z',
      createdAt: '2026-09-15T13:00:00Z',
    },
  ]

  assert.deepEqual(accessCodeState(participant, runs, now), {
    kind: 'EXPIRED',
    label: 'Vencido',
    severity: 'secondary',
    pendingRunId: 'r1',
  })
})

test('accessCodeState reports a run already marked EXPIRED without a revocable id', () => {
  const runs = [
    {
      id: 'r1',
      participantId: 'p1',
      status: 'EXPIRED',
      accessCodeExpiresAt: '2026-09-15T13:00:00Z',
      createdAt: '2026-09-15T12:00:00Z',
    },
  ]

  assert.deepEqual(accessCodeState(participant, runs, now), {
    kind: 'EXPIRED',
    label: 'Vencido',
    severity: 'secondary',
    pendingRunId: null,
  })
})

test('accessCodeState reports an active session', () => {
  const runs = [
    { id: 'r0', participantId: 'p1', status: 'COMPLETED', createdAt: '2026-09-14T10:00:00Z' },
    { id: 'r1', participantId: 'p1', status: 'ACTIVE', createdAt: '2026-09-15T13:30:00Z' },
  ]

  assert.deepEqual(accessCodeState(participant, runs, now), {
    kind: 'ACTIVE',
    label: 'En curso',
    severity: 'warn',
    pendingRunId: null,
  })
})

test('accessCodeState returns a dash when there is no open code', () => {
  const noRuns = accessCodeState(participant, [], now)
  const completedOnly = accessCodeState(
    participant,
    [{ id: 'r0', participantId: 'p1', status: 'COMPLETED', createdAt: '2026-09-14T10:00:00Z' }],
    now,
  )

  assert.deepEqual(noRuns, { kind: 'NONE', label: '—', severity: 'secondary', pendingRunId: null })
  assert.deepEqual(completedOnly, noRuns)
})

test('canGenerateCode requires an active study and a participant without open run', () => {
  const activeStudy = { id: 's1', status: 'ACTIVE' }

  assert.equal(canGenerateCode(participant, activeStudy), true)
  assert.equal(canGenerateCode({ ...participant, hasOpenRun: true }, activeStudy), false)
  assert.equal(canGenerateCode({ ...participant, protocolCompleted: true }, activeStudy), false)
  assert.equal(canGenerateCode(participant, { id: 's1', status: 'DRAFT' }), false)
  assert.equal(canGenerateCode(participant, { id: 's1', status: 'CLOSED' }), false)
  assert.equal(canGenerateCode(participant, null), false)
})

test('sequence and next session labels are Spanish and never expose identity', () => {
  assert.equal(sequenceLabel('ASSISTED_FIRST'), 'Asistida primero')
  assert.equal(sequenceLabel('UNASSISTED_FIRST'), 'Sin asistencia primero')
  assert.equal(
    nextSessionLabel({ task: 'TASK_A', condition: 'ASSISTED' }),
    'Tarea A · Con asistencia',
  )
  assert.equal(
    nextSessionLabel({ task: 'TASK_B', condition: 'UNASSISTED' }),
    'Tarea B · Sin asistencia',
  )
  assert.equal(nextSessionLabel(null), 'Protocolo completo')
})

test('generateCodeHint explains why a code cannot be generated', () => {
  const activeStudy = { id: 's1', status: 'ACTIVE' }

  assert.equal(generateCodeHint(participant, activeStudy), '')
  assert.equal(
    generateCodeHint({ ...participant, hasOpenRun: true }, activeStudy),
    'El participante tiene una sesión abierta.',
  )
  assert.equal(
    generateCodeHint({ ...participant, protocolCompleted: true }, activeStudy),
    'El participante completó ambas condiciones.',
  )
  assert.equal(
    generateCodeHint(participant, { id: 's1', status: 'DRAFT' }),
    'Activa un protocolo primero.',
  )
  assert.equal(
    generateCodeHint(participant, { id: 's1', status: 'CLOSED' }),
    'El estudio está cerrado.',
  )
})

test('participantActions offers regenerate and revoke instead of generate while a code is open', () => {
  const activeStudy = { id: 's1', status: 'ACTIVE' }
  const issued = { kind: 'ISSUED', pendingRunId: 'r1' }
  const expiredPending = { kind: 'EXPIRED', pendingRunId: 'r1' }
  const expiredBackend = { kind: 'EXPIRED', pendingRunId: null }
  const none = { kind: 'NONE', pendingRunId: null }

  assert.deepEqual(participantActions({ ...participant, hasOpenRun: true }, issued, activeStudy), {
    showGenerate: false,
    canGenerate: false,
    generateHint: 'El participante tiene una sesión abierta.',
    showRegenerate: true,
    showRevoke: true,
    pendingRunId: 'r1',
  })
  assert.deepEqual(participantActions(participant, expiredPending, activeStudy), {
    showGenerate: false,
    canGenerate: true,
    generateHint: '',
    showRegenerate: true,
    showRevoke: true,
    pendingRunId: 'r1',
  })
  assert.deepEqual(participantActions(participant, expiredBackend, activeStudy), {
    showGenerate: true,
    canGenerate: true,
    generateHint: '',
    showRegenerate: false,
    showRevoke: false,
    pendingRunId: null,
  })
  assert.deepEqual(
    participantActions(
      { ...participant, hasOpenRun: true },
      { kind: 'ACTIVE', pendingRunId: null },
      activeStudy,
    ),
    {
      showGenerate: true,
      canGenerate: false,
      generateHint: 'El participante tiene una sesión abierta.',
      showRegenerate: false,
      showRevoke: false,
      pendingRunId: null,
    },
  )
  assert.deepEqual(participantActions(participant, none, { id: 's1', status: 'CLOSED' }), {
    showGenerate: true,
    canGenerate: false,
    generateHint: 'El estudio está cerrado.',
    showRegenerate: false,
    showRevoke: false,
    pendingRunId: null,
  })
})

test('matchesPendingAction only matches the row and kind being mutated', () => {
  const pending = { kind: 'generate', participantId: 'p1' }

  assert.equal(matchesPendingAction(pending, 'generate', 'p1'), true)
  assert.equal(matchesPendingAction(pending, 'generate', 'p2'), false)
  assert.equal(matchesPendingAction(pending, 'revoke', 'p1'), false)
  assert.equal(matchesPendingAction({ kind: 'add' }, 'add'), true)
  assert.equal(matchesPendingAction({ kind: 'add' }, 'generate', 'p1'), false)
  assert.equal(matchesPendingAction(null, 'add'), false)
})

test('refreshStatusLabel shows the time of the last full refresh only when nothing is pending', () => {
  const refreshedAt = new Date(2026, 8, 15, 14, 5)

  assert.equal(refreshStatusLabel(refreshedAt), 'Actualizado 14:05')
  assert.equal(refreshStatusLabel(null), '')
  assert.equal(refreshStatusLabel(refreshedAt, { isLoading: true }), '')
  assert.equal(refreshStatusLabel(refreshedAt, { hasError: true }), '')
  assert.equal(refreshStatusLabel('not a date'), '')
})
