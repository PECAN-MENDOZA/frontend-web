import test from 'node:test'
import assert from 'node:assert/strict'
import {
  conditionRows,
  formatAcceptance,
  formatDelta,
  formatInterval,
  formatMean,
  formatPairedStats,
  formatSeconds,
  resultsBanners,
  resultsJsonFilename,
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

test('resultsBanners subtracts excluded attempts from the insufficient-sample count', () => {
  assert.deepEqual(
    resultsBanners({
      sampleInsufficient: true,
      minSample: 8,
      sample: { completed: 9, excluded: 2 },
    }),
    [
      { severity: 'warn', text: 'Muestra insuficiente (7 de 8).' },
      { severity: 'info', text: 'Diseño manual: la condición no está contrabalanceada.' },
    ],
  )
})

test('conditionRows maps condition metrics into table-ready rows', () => {
  const conditions = {
    ASSISTED: {
      participants: 8,
      errorsPer100Words: { mean: 2, lower: 1, upper: 3 },
      wordsPerMinute: { mean: 22, lower: 20, upper: 24 },
      acceptanceRate: { accepted: 3, offered: 4, ratePct: 75, wilsonLower: 70, wilsonUpper: 80 },
    },
    OTHER: { participants: 0, errorsPer100Words: null, wordsPerMinute: null, acceptanceRate: null },
  }

  assert.deepEqual(conditionRows({ conditions }), [
    {
      condition: 'ASSISTED',
      label: 'Con ayuda',
      participants: 8,
      errors: { mean: 2, lower: 1, upper: 3 },
      ppm: { mean: 22, lower: 20, upper: 24 },
      acceptance: { accepted: 3, offered: 4, ratePct: 75, wilsonLower: 70, wilsonUpper: 80 },
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
      meanDurationFirstKeyMs: 8300,
      skippedCount: 2,
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

test('formatAcceptance shows accepted over offered with the Wilson interval', () => {
  assert.equal(
    formatAcceptance({ accepted: 2, offered: 5, ratePct: 40, wilsonLower: 11.76, wilsonUpper: 76.93 }),
    '2/5 (40,0 %, IC Wilson 11,8–76,9)',
  )
  assert.equal(
    formatAcceptance({ accepted: 1, offered: 1, ratePct: 100, wilsonLower: null, wilsonUpper: null }),
    '1/1 (100,0 %)',
  )
  assert.equal(formatAcceptance(null), '—')
})

test('formatPairedStats reports t, p and dz only when the backend computed them', () => {
  assert.equal(
    formatPairedStats({ t: 0.2201, p: 0.86202, dz: 0.1556 }),
    't = 0,22; p = 0,862; dz = 0,16',
  )
  assert.equal(formatPairedStats({ t: null, p: null, dz: null }), '')
  assert.equal(formatPairedStats(undefined), '')
})

test('formatSeconds and formatMean use es-PE decimals and a dash for missing values', () => {
  assert.equal(formatSeconds(5700), '5,7 s')
  assert.equal(formatSeconds(null), '—')
  assert.equal(formatMean(1.25), '1,25')
  assert.equal(formatMean(0.5, 1), '0,5')
  assert.equal(formatMean(undefined), '—')
})

test('resultsJsonFilename uses the test code and falls back to the id', () => {
  assert.equal(resultsJsonFilename({ code: 'DRYRUN-02' }), 'test-DRYRUN-02-results.json')
  assert.equal(resultsJsonFilename({ testId: 'abc' }), 'test-abc-results.json')
  assert.equal(resultsJsonFilename(null), 'test-prueba-results.json')
})
