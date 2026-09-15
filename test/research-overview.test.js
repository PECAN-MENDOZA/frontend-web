import test from 'node:test'
import assert from 'node:assert/strict'
import {
  overviewCounts,
  pairRows,
  participantReadiness,
  versionStrip,
} from '../src/features/research/utils/overview.js'

test('marks only complete non-excluded pairs as ready', () => {
  assert.deepEqual(
    participantReadiness({ assisted: 'COMPLETED', unassisted: 'COMPLETED', excluded: false }),
    { label: 'Listo para análisis', severity: 'success' },
  )
  assert.equal(participantReadiness({ assisted: 'COMPLETED', unassisted: null }).severity, 'warn')
})

test('participantReadiness reports no sessions and exclusion', () => {
  assert.deepEqual(participantReadiness({ assisted: null, unassisted: null, excluded: false }), {
    label: 'Sin sesiones',
    severity: 'secondary',
  })
  assert.deepEqual(
    participantReadiness({ assisted: 'COMPLETED', unassisted: 'COMPLETED', excluded: true }),
    { label: 'Excluido', severity: 'danger' },
  )
})

test('pairRows infers task condition from sequence when no run exists', () => {
  const participants = [{ id: 'p1', pseudonym: 'P-001', sequence: 'ASSISTED_FIRST' }]
  const rows = pairRows(participants, [])

  assert.deepEqual(rows, [
    {
      pseudonym: 'P-001',
      sequence: 'ASSISTED_FIRST',
      taskA: { condition: 'ASSISTED', status: null, runId: null, excluded: false },
      taskB: { condition: 'UNASSISTED', status: null, runId: null, excluded: false },
      readiness: { label: 'Sin sesiones', severity: 'secondary' },
    },
  ])
})

test('pairRows prefers a completed non-excluded run over a more recent cancelled one', () => {
  const participants = [{ id: 'p1', pseudonym: 'P-001', sequence: 'ASSISTED_FIRST' }]
  const runs = [
    {
      id: 'r1',
      participantId: 'p1',
      task: 'TASK_A',
      condition: 'ASSISTED',
      status: 'COMPLETED',
      excluded: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'r2',
      participantId: 'p1',
      task: 'TASK_A',
      condition: 'ASSISTED',
      status: 'CANCELLED',
      excluded: false,
      createdAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'r3',
      participantId: 'p1',
      task: 'TASK_B',
      condition: 'UNASSISTED',
      status: 'COMPLETED',
      excluded: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ]
  const rows = pairRows(participants, runs)

  assert.equal(rows[0].taskA.runId, 'r1')
  assert.equal(rows[0].readiness.severity, 'success')
})

test('pairRows marks the pair excluded when either task run was excluded', () => {
  const participants = [{ id: 'p1', pseudonym: 'P-001', sequence: 'UNASSISTED_FIRST' }]
  const runs = [
    {
      id: 'r1',
      participantId: 'p1',
      task: 'TASK_A',
      condition: 'UNASSISTED',
      status: 'COMPLETED',
      excluded: false,
      createdAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'r2',
      participantId: 'p1',
      task: 'TASK_B',
      condition: 'ASSISTED',
      status: 'COMPLETED',
      excluded: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ]
  const rows = pairRows(participants, runs)

  assert.equal(rows[0].readiness.severity, 'danger')
})

test('overviewCounts totals ready pairs, pending runs, failures and pending adjudications', () => {
  const rows = [{ readiness: { severity: 'success' } }, { readiness: { severity: 'warn' } }]
  const runs = [
    { status: 'PENDING' },
    { status: 'ACTIVE' },
    { status: 'TECHNICAL_FAILURE' },
    { status: 'COMPLETED', incidentCount: 1 },
    { status: 'COMPLETED', incidentCount: 0 },
  ]
  const batches = [{ adjudicationCurrent: true }, { adjudicationCurrent: false }]

  assert.deepEqual(overviewCounts(rows, runs, batches), {
    readyPairs: 1,
    participants: 2,
    pendingRuns: 2,
    failures: 2,
    pendingAdjudications: 1,
  })
})

test('versionStrip collects distinct, non-empty versions', () => {
  const study = { activeProtocolVersion: 2 }
  const runs = [
    { appVersion: '1.0', modelVersion: 'v1', backendVersion: 'b1' },
    { appVersion: '1.0', modelVersion: 'v2', backendVersion: 'b1' },
    { appVersion: null, modelVersion: 'v2', backendVersion: null },
  ]

  assert.deepEqual(versionStrip(study, runs), {
    protocolVersion: 2,
    appVersions: ['1.0'],
    modelVersions: ['v1', 'v2'],
    backendVersions: ['b1'],
  })
})

test('versionStrip handles a missing study', () => {
  assert.deepEqual(versionStrip(null, []), {
    protocolVersion: null,
    appVersions: [],
    modelVersions: [],
    backendVersions: [],
  })
})
