import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ATTEMPT_STATUS_LABELS,
  BLANK_RESPONSE_TEXT,
  assignmentStatusLabel,
  canAnnotate,
  editDetail,
  editLabel,
  errorSourceLabel,
  exclusionLabel,
  exclusionReasonError,
  formatDuration,
  hasAttemptsInProgress,
  responseRowsFor,
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
  assert.equal(formatDuration(59999), '1 min 0 s')
  assert.equal(formatDuration(119999), '2 min 0 s')
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

test('canAnnotate only allows completed attempts', () => {
  assert.equal(canAnnotate({ status: 'COMPLETED' }), true)
  assert.equal(canAnnotate({ status: 'IN_PROGRESS' }), false)
  assert.equal(canAnnotate(null), false)
})

test('exclusionLabel describes an excluded attempt with its reason', () => {
  assert.equal(exclusionLabel({ excludedAt: null }), '')
  assert.equal(exclusionLabel({ excludedAt: '2026-09-17T10:00:00Z' }), 'Excluido')
  assert.equal(
    exclusionLabel({
      excludedAt: '2026-09-17T10:00:00Z',
      exclusionReason: ' Dictado interrumpido ',
    }),
    'Excluido · Dictado interrumpido',
  )
})

test('responseRowsFor projects responses ordered by position with resolved labels', () => {
  const rows = responseRowsFor({
    responses: [
      {
        responseId: 'r2',
        position: 2,
        kind: 'FREE',
        assistance: 'UNASSISTED',
        referenceText: 'Escribe sobre tu fin de semana.',
        finalText: 'Fui al parque.',
        skipped: false,
        wordCount: 3,
        autoErrorCount: null,
        autoErrorDetail: null,
        annotatedErrorCount: 2,
        effectiveErrorCount: 2,
        errorSource: 'ANNOTATED',
        durationFromFirstKeyMs: 65000,
        durationFromStartMs: 70000,
        suggestionsOffered: 1,
        suggestionsAccepted: 0,
        suggestionsRejected: 1,
        suggestionsUndone: 0,
      },
      {
        responseId: 'r1',
        position: 1,
        kind: 'DICTATED',
        assistance: 'ASSISTED',
        referenceText: 'El perro corre.',
        finalText: 'El pero corre.',
        skipped: false,
        wordCount: 3,
        autoErrorCount: 1,
        autoErrorDetail: JSON.stringify({
          edits: [
            { type: 'SUSTITUCION', expected: 'perro', written: 'pero' },
            { type: 'OTHER', expected: '', written: '' },
          ],
        }),
        annotatedErrorCount: null,
        effectiveErrorCount: 1,
        errorSource: 'AUTO',
        durationFromFirstKeyMs: 5700,
        durationFromStartMs: 6700,
        suggestionsOffered: 1,
        suggestionsAccepted: 1,
        suggestionsRejected: 0,
        suggestionsUndone: 0,
      },
    ],
  })

  assert.deepEqual(rows, [
    {
      responseId: 'r1',
      position: 1,
      isDictated: true,
      kindLabel: 'Dictada',
      assistanceLabel: 'Con ayuda',
      referenceText: 'El perro corre.',
      skipped: false,
      finalText: 'El pero corre.',
      wordCount: 3,
      durationLabel: '5,7 s',
      durationFromStartLabel: '6,7 s',
      errorCount: 1,
      annotatedErrorCount: null,
      editLabels: ['pero → perro'],
      errorSource: 'AUTO',
      sourceLabel: 'Automático',
      suggestions: { offered: 1, accepted: 1, rejected: 0, undone: 0 },
    },
    {
      responseId: 'r2',
      position: 2,
      isDictated: false,
      kindLabel: 'Libre',
      assistanceLabel: 'Sin ayuda',
      referenceText: 'Escribe sobre tu fin de semana.',
      skipped: false,
      finalText: 'Fui al parque.',
      wordCount: 3,
      durationLabel: '1 min 5 s',
      durationFromStartLabel: '1 min 10 s',
      errorCount: 2,
      annotatedErrorCount: 2,
      editLabels: [],
      errorSource: 'ANNOTATED',
      sourceLabel: 'Anotado',
      suggestions: { offered: 1, accepted: 0, rejected: 1, undone: 0 },
    },
  ])
})

test('responseRowsFor shows a blank marker for skipped responses and tolerates missing data', () => {
  const [row] = responseRowsFor({
    responses: [
      { responseId: 'r1', position: 1, kind: 'FREE', skipped: true, errorSource: 'PENDING' },
    ],
  })

  assert.equal(row.finalText, BLANK_RESPONSE_TEXT)
  assert.equal(row.skipped, true)
  assert.equal(row.durationLabel, '—')
  assert.equal(row.durationFromStartLabel, '—')
  assert.equal(row.errorCount, null)
  assert.equal(row.annotatedErrorCount, null)
  assert.equal(row.sourceLabel, 'Sin anotar')
  assert.deepEqual(row.suggestions, { offered: 0, accepted: 0, rejected: 0, undone: 0 })
  assert.deepEqual(responseRowsFor(null), [])
  assert.deepEqual(responseRowsFor({}), [])
})
