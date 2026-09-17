import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ATTEMPT_STATUS_LABELS,
  assignmentStatusLabel,
  editDetail,
  editLabel,
  errorSourceLabel,
  exclusionReasonError,
  formatDuration,
  hasAttemptsInProgress,
} from '../src/features/tests/utils/attempts.js'

test('assignmentStatusLabel prioritizes exclusion and describes an attempt in progress', () => {
  assert.deepEqual(ATTEMPT_STATUS_LABELS, {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
  })
  assert.equal(assignmentStatusLabel({ excluded: true, attemptStatus: 'COMPLETED' }), 'Excluida')
  assert.equal(
    assignmentStatusLabel({ attemptStatus: 'IN_PROGRESS', currentPosition: 4, sentenceCount: 20 }),
    'Oración 4 de 20',
  )
  assert.equal(assignmentStatusLabel({ attemptStatus: 'COMPLETED' }), 'Completada')
  assert.equal(assignmentStatusLabel({ attemptStatus: 'UNKNOWN' }), 'UNKNOWN')
})

test('hasAttemptsInProgress ignores excluded attempts', () => {
  assert.equal(hasAttemptsInProgress([{ attemptStatus: 'IN_PROGRESS', excluded: false }]), true)
  assert.equal(hasAttemptsInProgress([{ attemptStatus: 'IN_PROGRESS', excluded: true }]), false)
  assert.equal(hasAttemptsInProgress([]), false)
})

test('exclusionReasonError accepts blank or 10–500 chars and rejects the limits', () => {
  assert.equal(exclusionReasonError(''), '')
  assert.equal(exclusionReasonError('Motivo válido'), '')
  assert.equal(exclusionReasonError('Corto'), 'Escribe al menos 10 caracteres.')
  assert.equal(exclusionReasonError('x'.repeat(501)), 'Máximo 500 caracteres.')
})

test('errorSourceLabel maps automatic, annotated and pending responses', () => {
  assert.equal(errorSourceLabel({ errorSource: 'AUTO' }), 'Automático')
  assert.equal(errorSourceLabel({ errorSource: 'ANNOTATED' }), 'Anotado')
  assert.equal(errorSourceLabel({ errorSource: 'PENDING' }), 'Sin anotar')
  assert.equal(errorSourceLabel({ errorSource: 'OTHER' }), 'OTHER')
})

test('formatDuration formats seconds and minutes with es-PE decimals', () => {
  assert.equal(formatDuration(null), '—')
  assert.equal(formatDuration(7500), '7,5 s')
  assert.equal(formatDuration(65000), '1 min 5 s')
  assert.equal(formatDuration(0), '0 s')
})

test('editDetail parses auto_error_detail and returns an empty list for invalid JSON', () => {
  const edits = [{ type: 'OMISION', expected: 'por', written: '' }]

  assert.deepEqual(editDetail(JSON.stringify({ edits })), edits)
  assert.deepEqual(editDetail(null), [])
  assert.deepEqual(editDetail('{'), [])
  assert.deepEqual(editDetail('{}'), [])
})

test('editLabel formats the five edit types and tolerates unknown edits', () => {
  assert.equal(
    editLabel({ type: 'SUSTITUCION', expected: 'volver', written: 'bolver' }),
    'bolver → volver',
  )
  assert.equal(editLabel({ type: 'OMISION', expected: 'por', written: '' }), 'falta «por»')
  assert.equal(editLabel({ type: 'INSERCION', expected: '', written: 'grande' }), 'sobra «grande»')
  assert.equal(editLabel({ type: 'UNION', expected: 'a ver', written: 'aver' }), 'aver → a ver')
  assert.equal(
    editLabel({ type: 'SEPARACION', expected: 'también', written: 'tam bién' }),
    'tam bién → también',
  )
  assert.equal(editLabel({ type: 'OTHER', expected: 'a', written: 'b' }), '')
})
