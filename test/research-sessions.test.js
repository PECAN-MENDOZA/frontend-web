import test from 'node:test'
import assert from 'node:assert/strict'
import {
  READINESS_OPTIONS,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  annotationState,
  filterRuns,
  formatDuration,
  incidentLabel,
  incidentSummary,
  reasonErrors,
  runActions,
  runReadiness,
  runReason,
  truncateText,
} from '../src/features/research/utils/sessions.js'

function run(overrides = {}) {
  return {
    id: 'run-1',
    participantId: 'p-1',
    pseudonym: 'P-001',
    task: 'TASK_A',
    condition: 'ASSISTED',
    status: 'COMPLETED',
    durationMs: 125_000,
    incidentCount: 0,
    failureReason: null,
    incidents: [],
    excluded: false,
    excludedAt: null,
    exclusionReason: null,
    appVersion: '1.0.0',
    backendVersion: '0.9.0',
    modelVersion: 'beto-1',
    createdAt: '2026-09-10T10:00:00Z',
    completedAt: '2026-09-10T10:05:00Z',
    ...overrides,
  }
}

test('runReadiness classifies runs by status and exclusion', () => {
  assert.equal(runReadiness(run({ status: 'COMPLETED' })), 'analizable')
  assert.equal(runReadiness(run({ status: 'COMPLETED', excluded: true })), 'excluida')
  assert.equal(runReadiness(run({ status: 'TECHNICAL_FAILURE', excluded: true })), 'excluida')
  assert.equal(runReadiness(run({ status: 'PENDING' })), 'abierta')
  assert.equal(runReadiness(run({ status: 'ACTIVE' })), 'abierta')
  assert.equal(runReadiness(run({ status: 'CANCELLED' })), 'descartada')
  assert.equal(runReadiness(run({ status: 'EXPIRED' })), 'descartada')
  assert.equal(runReadiness(run({ status: 'TECHNICAL_FAILURE' })), 'descartada')
})

test('readiness options cover every readiness with a Spanish label', () => {
  assert.deepEqual(READINESS_OPTIONS, [
    { value: 'analizable', label: 'Analizable' },
    { value: 'abierta', label: 'Abierta' },
    { value: 'descartada', label: 'Descartada' },
    { value: 'excluida', label: 'Excluida' },
  ])
})

test('filterRuns returns every run when no filter is set', () => {
  const runs = [run({ id: 'a' }), run({ id: 'b', status: 'PENDING' })]

  assert.deepEqual(filterRuns(runs, {}), runs)
  assert.deepEqual(filterRuns(runs, { status: null, condition: '', readiness: [] }), runs)
})

test('filterRuns combines status, condition and readiness filters', () => {
  const runs = [
    run({ id: 'a', status: 'COMPLETED', condition: 'ASSISTED' }),
    run({ id: 'b', status: 'COMPLETED', condition: 'UNASSISTED', excluded: true }),
    run({ id: 'c', status: 'PENDING', condition: 'ASSISTED' }),
    run({ id: 'd', status: 'CANCELLED', condition: 'UNASSISTED' }),
  ]

  assert.deepEqual(
    filterRuns(runs, { status: 'COMPLETED' }).map((item) => item.id),
    ['a', 'b'],
  )
  assert.deepEqual(
    filterRuns(runs, { status: ['PENDING', 'CANCELLED'] }).map((item) => item.id),
    ['c', 'd'],
  )
  assert.deepEqual(
    filterRuns(runs, { condition: 'UNASSISTED' }).map((item) => item.id),
    ['b', 'd'],
  )
  assert.deepEqual(
    filterRuns(runs, { readiness: 'excluida' }).map((item) => item.id),
    ['b'],
  )
  assert.deepEqual(
    filterRuns(runs, { status: 'COMPLETED', condition: 'ASSISTED', readiness: 'analizable' }).map(
      (item) => item.id,
    ),
    ['a'],
  )
  assert.deepEqual(filterRuns(runs, { status: 'EXPIRED' }), [])
})

test('formatDuration renders mm:ss and an em dash without data', () => {
  assert.equal(formatDuration(0), '00:00')
  assert.equal(formatDuration(125_000), '02:05')
  assert.equal(formatDuration(59_999), '00:59')
  assert.equal(formatDuration(3_600_000), '60:00')
  assert.equal(formatDuration(null), '—')
  assert.equal(formatDuration(undefined), '—')
  assert.equal(formatDuration(-1), '—')
  assert.equal(formatDuration('abc'), '—')
})

test('incidentLabel translates known incident reasons', () => {
  assert.equal(incidentLabel('AI_REQUEST_FAILED'), 'IA sin respuesta')
  assert.equal(incidentLabel('MODEL_VERSION_CHANGED'), 'Cambio de versión del modelo')
  assert.equal(incidentLabel('DURATION_INCONSISTENT'), 'Duración inconsistente')
  assert.equal(incidentLabel('DURATION_IMPLAUSIBLY_SHORT'), 'Duración implausiblemente corta')
  assert.equal(incidentLabel('TECHNICAL_FAILURE'), 'Fallo técnico')
  assert.equal(incidentLabel('SOMETHING_NEW'), 'SOMETHING_NEW')
})

test('incidentSummary groups repeated reasons and keeps order of first appearance', () => {
  assert.equal(incidentSummary(run()), '')
  assert.equal(incidentSummary(run({ incidents: null })), '')
  assert.equal(
    incidentSummary(
      run({
        incidents: [
          { reason: 'AI_REQUEST_FAILED', at: '2026-09-10T10:01:00Z' },
          { reason: 'MODEL_VERSION_CHANGED', at: '2026-09-10T10:02:00Z' },
          { reason: 'AI_REQUEST_FAILED', at: '2026-09-10T10:03:00Z' },
        ],
      }),
    ),
    'IA sin respuesta ×2 · Cambio de versión del modelo',
  )
})

test('reasonErrors requires a trimmed reason between 10 and 500 characters', () => {
  assert.equal(REASON_MIN_LENGTH, 10)
  assert.equal(REASON_MAX_LENGTH, 500)
  assert.deepEqual(reasonErrors('Sesión interrumpida por corte de luz'), [])
  assert.deepEqual(reasonErrors('a'.repeat(REASON_MIN_LENGTH)), [])
  assert.deepEqual(reasonErrors('a'.repeat(REASON_MAX_LENGTH)), [])
  assert.deepEqual(reasonErrors(''), ['El motivo es obligatorio.'])
  assert.deepEqual(reasonErrors('        '), ['El motivo es obligatorio.'])
  assert.deepEqual(reasonErrors(undefined), ['El motivo es obligatorio.'])
  assert.deepEqual(reasonErrors('corto   '), ['Escribe al menos 10 caracteres.'])
  assert.deepEqual(reasonErrors(`  ${'a'.repeat(9)}  `), ['Escribe al menos 10 caracteres.'])
  assert.deepEqual(reasonErrors('a'.repeat(REASON_MAX_LENGTH + 1)), ['Máximo 500 caracteres.'])
})

test('runActions only allows transitions the backend accepts', () => {
  assert.deepEqual(runActions(run({ status: 'PENDING' })), {
    canCancel: true,
    canFail: true,
    canExclude: false,
  })
  assert.deepEqual(runActions(run({ status: 'ACTIVE' })), {
    canCancel: true,
    canFail: true,
    canExclude: false,
  })
  assert.deepEqual(runActions(run({ status: 'COMPLETED' })), {
    canCancel: false,
    canFail: false,
    canExclude: true,
  })
  assert.deepEqual(runActions(run({ status: 'TECHNICAL_FAILURE' })), {
    canCancel: false,
    canFail: false,
    canExclude: true,
  })
  assert.deepEqual(runActions(run({ status: 'COMPLETED', excluded: true })), {
    canCancel: false,
    canFail: false,
    canExclude: false,
  })
  assert.deepEqual(runActions(run({ status: 'CANCELLED' })), {
    canCancel: false,
    canFail: false,
    canExclude: false,
  })
  assert.deepEqual(runActions(run({ status: 'EXPIRED' })), {
    canCancel: false,
    canFail: false,
    canExclude: false,
  })
})

test('annotationState infers batch membership from completion time', () => {
  const batches = [{ id: 'b1', kind: 'ORTHOGRAPHY', createdAt: '2026-09-11T00:00:00Z' }]

  assert.equal(annotationState(run({ completedAt: '2026-09-10T10:05:00Z' }), batches), 'En lote')
  assert.equal(annotationState(run({ completedAt: '2026-09-12T10:05:00Z' }), batches), 'Sin lote')
  assert.equal(annotationState(run(), []), 'Sin lote')
  assert.equal(annotationState(run(), null), 'Sin lote')
  assert.equal(annotationState(run({ status: 'PENDING', completedAt: null }), batches), null)
  assert.equal(annotationState(run({ status: 'CANCELLED', completedAt: null }), batches), null)
})

test('annotationState falls back to createdAt when completedAt is missing', () => {
  const batches = [{ id: 'b1', createdAt: '2026-09-11T00:00:00Z' }]

  assert.equal(annotationState(run({ completedAt: null }), batches), 'En lote')
})

test('runReason prefers the exclusion reason over the failure reason', () => {
  assert.equal(runReason(run()), '')
  assert.equal(runReason(run({ failureReason: 'Se cayó la red' })), 'Se cayó la red')
  assert.equal(
    runReason(run({ failureReason: 'Se cayó la red', exclusionReason: 'Texto copiado' })),
    'Texto copiado',
  )
})

test('runReason shows incident codes and student cancellations in Spanish', () => {
  assert.equal(runReason(run({ failureReason: 'AI_REQUEST_FAILED' })), 'IA sin respuesta')
  assert.equal(runReason(run({ failureReason: 'TECHNICAL_FAILURE' })), 'Fallo técnico')
  assert.equal(
    runReason(run({ failureReason: 'Cancelled by the student: interrupted' })),
    'Cancelada por el alumno: interrupción',
  )
  assert.equal(
    runReason(run({ failureReason: 'Cancelled by the student: abandoned the task' })),
    'Cancelada por el alumno: ya no quiso seguir',
  )
  assert.equal(
    runReason(run({ failureReason: 'Cancelled by the student: technical problem' })),
    'Cancelada por el alumno: problema técnico',
  )
})

test('truncateText shortens long text with an ellipsis', () => {
  assert.equal(truncateText('', 10), '')
  assert.equal(truncateText('corto', 10), 'corto')
  assert.equal(truncateText('exactamente', 11), 'exactamente')
  assert.equal(truncateText('Un motivo bastante largo', 10), 'Un motivo…')
})
