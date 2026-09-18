import test from 'node:test'
import assert from 'node:assert/strict'
import {
  attemptLabel,
  finishedAttempts,
  liveProgressLabel,
  testSentenceRows,
} from '../src/features/insights/utils/tests.js'

test('testSentenceRows projects each sentence with labels, edits and duration', () => {
  const rows = testSentenceRows({
    sentences: [
      {
        position: 3,
        kind: 'DICTATED',
        assistance: 'ASSISTED',
        referenceText: 'Vamos a ver la película.',
        finalText: 'Vamos aver la película.',
        skipped: false,
        errorCount: 1,
        errorSource: 'AUTO',
        edits: [{ type: 'UNION', expected: 'a ver', written: 'aver' }],
        durationFromFirstKeyMs: 12_340,
      },
      {
        position: 1,
        kind: 'FREE',
        assistance: 'UNASSISTED',
        referenceText: 'Escribe qué hiciste ayer.',
        finalText: 'Fui al parque.',
        skipped: false,
        errorCount: null,
        errorSource: 'PENDING',
        edits: [],
        durationFromFirstKeyMs: 65_000,
      },
    ],
  })

  assert.equal(rows.length, 2)
  // Orden por posición, no por el orden del arreglo.
  assert.equal(rows[0].position, 1)
  assert.equal(rows[0].kindLabel, 'Libre')
  assert.equal(rows[0].assistanceLabel, 'Sin ayuda')
  assert.equal(rows[0].referenceCaption, 'Consigna')
  assert.equal(rows[0].errorText, '—')
  assert.equal(rows[0].sourceLabel, 'Sin anotar')
  assert.deepEqual(rows[0].editLabels, [])
  assert.equal(rows[0].durationLabel, '1 min 5 s')

  assert.equal(rows[1].position, 3)
  assert.equal(rows[1].kindLabel, 'Dictada')
  assert.equal(rows[1].assistanceLabel, 'Con ayuda')
  assert.equal(rows[1].referenceCaption, 'Referencia')
  assert.equal(rows[1].finalText, 'Vamos aver la película.')
  assert.equal(rows[1].errorText, '1')
  assert.equal(rows[1].sourceLabel, 'Automático')
  assert.deepEqual(rows[1].editLabels, ['aver → a ver'])
  assert.equal(rows[1].durationLabel, '12,3 s')
})

test('testSentenceRows marks a skipped sentence as blank and tolerates missing fields', () => {
  const [row] = testSentenceRows({
    sentences: [{ position: 2, kind: 'DICTATED', skipped: true, referenceText: 'Hola.' }],
  })

  assert.equal(row.skipped, true)
  assert.equal(row.finalText, '— en blanco —')
  assert.equal(row.errorText, '—')
  assert.equal(row.durationLabel, '—')
  assert.deepEqual(row.editLabels, [])
  assert.deepEqual(testSentenceRows(null), [])
})

test('attemptLabel joins title and code, falling back to what exists', () => {
  assert.equal(attemptLabel({ testTitle: 'Dictado 1', testCode: 'DIC-1' }), 'Dictado 1 · DIC-1')
  assert.equal(attemptLabel({ testCode: 'DIC-1' }), 'DIC-1')
  assert.equal(attemptLabel({}), 'Prueba')
})

test('liveProgressLabel describes the current sentence of the attempt', () => {
  assert.equal(liveProgressLabel({ currentPosition: 4, sentenceCount: 20 }), 'Oración 4 de 20')
  assert.equal(liveProgressLabel({ sentenceCount: 20 }), 'Oración 1 de 20')
})

test('liveProgressLabel never shows a position beyond the sentence count', () => {
  assert.equal(liveProgressLabel({ currentPosition: 21, sentenceCount: 20 }), 'Oración 20 de 20')
  assert.equal(liveProgressLabel({ currentPosition: 20, sentenceCount: 20 }), 'Oración 20 de 20')
  assert.equal(liveProgressLabel({ currentPosition: 3, sentenceCount: 0 }), 'Oración 3 de 0')
})

test('finishedAttempts returns the attempts that were listed before and are gone now', () => {
  const previous = [
    { attemptId: 'a1', studentId: 's1', realName: 'Ana' },
    { attemptId: 'a2', studentId: 's2', realName: 'Luis' },
  ]
  const current = [{ attemptId: 'a2', studentId: 's2', realName: 'Luis' }]

  assert.deepEqual(finishedAttempts(previous, current), [previous[0]])
  assert.deepEqual(finishedAttempts([], current), [])
  assert.deepEqual(finishedAttempts(previous, previous), [])
  assert.deepEqual(finishedAttempts(null, null), [])
})
