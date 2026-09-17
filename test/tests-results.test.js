import test from 'node:test'
import assert from 'node:assert/strict'
import {
  conditionRows,
  formatDelta,
  formatInterval,
  resultsBanners,
  sentenceRows,
} from '../src/features/tests/utils/results.js'

test('formatInterval uses es-PE decimals and reports missing confidence intervals', () => {
  assert.equal(formatInterval({ mean: 3.2, lower: 1.1, upper: 5.3 }), '3,2 (IC 95 % 1,1–5,3)')
  assert.equal(formatInterval({ mean: 3.2, lower: null, upper: null }), '3,2 (IC no disponible)')
  assert.equal(formatInterval({ mean: null, lower: 1.1, upper: 5.3 }), '—')
  assert.equal(formatInterval({ mean: 3.25, lower: 1.15, upper: 5.35 }, 2), '3,25 (IC 95 % 1,15–5,35)')
})

test('formatDelta renders a real minus sign, confidence interval and sample size', () => {
  assert.equal(
    formatDelta({ meanDelta: -1.4, bootstrapLower: -2.8, bootstrapUpper: 0.1, n: 6 }),
    '−1,4 (IC 95 % −2,8–0,1; n = 6)',
  )
  assert.equal(formatDelta({ meanDelta: null, bootstrapLower: null, bootstrapUpper: null, n: 0 }), '—')
  assert.equal(
    formatDelta({ meanDelta: 1.2, bootstrapLower: null, bootstrapUpper: null, n: 3 }),
    '1,2 (IC no disponible; n = 3)',
  )
})

test('resultsBanners reports incomplete results, insufficient sample and manual design', () => {
  assert.deepEqual(
    resultsBanners({
      incomplete: true,
      sampleInsufficient: true,
      minSample: 6,
      sample: { completed: 4, unannotatedFree: 3 },
    }),
    [
      { severity: 'warn', text: '3 oraciones libres sin anotar: resultados incompletos.' },
      { severity: 'warn', text: 'Muestra insuficiente (4 de 6).' },
      { severity: 'info', text: 'Diseño manual: la condición no está contrabalanceada.' },
    ],
  )
  assert.deepEqual(resultsBanners({}), [
    { severity: 'info', text: 'Diseño manual: la condición no está contrabalanceada.' },
  ])
})

test('conditionRows maps condition metrics into table-ready rows', () => {
  const conditions = {
    ASSISTED: {
      participants: 8,
      errorsPer100Words: { mean: 2, lower: 1, upper: 3 },
      wordsPerMinute: { mean: 22, lower: 20, upper: 24 },
      acceptance: { mean: 75, lower: 70, upper: 80 },
    },
    OTHER: { participants: 0, errorsPer100Words: null, wordsPerMinute: null, acceptance: null },
  }

  assert.deepEqual(conditionRows({ conditions }), [
    {
      condition: 'ASSISTED',
      label: 'Con ayuda',
      participants: 8,
      errors: { mean: 2, lower: 1, upper: 3 },
      ppm: { mean: 22, lower: 20, upper: 24 },
      acceptance: { mean: 75, lower: 70, upper: 80 },
    },
    {
      condition: 'OTHER',
      label: 'OTHER',
      participants: 0,
      errors: null,
      ppm: null,
      acceptance: null,
    },
  ])
  assert.deepEqual(conditionRows(null), [])
})

test('sentenceRows keeps the sentence metrics needed by the results table', () => {
  const sentences = [
    {
      position: 1,
      kind: 'DICTATED',
      assistance: 'UNASSISTED',
      n: 8,
      meanErrors: 1.25,
      meanDuration: 8300,
      skipped: 2,
      internal: 'ignored',
    },
  ]

  assert.deepEqual(sentenceRows({ sentences }), [
    {
      position: 1,
      kind: 'DICTATED',
      assistance: 'UNASSISTED',
      n: 8,
      meanErrors: 1.25,
      meanDuration: 8300,
      skipped: 2,
    },
  ])
  assert.deepEqual(sentenceRows({}), [])
})
