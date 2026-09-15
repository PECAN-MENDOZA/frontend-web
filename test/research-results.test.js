import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ANNOTATION_SLOT_OPTIONS,
  IMPORT_MAX_BYTES,
  SCORER_VERSION,
  annotationKindLabel,
  annotationNextStep,
  annotationStatusLabel,
  currentImports,
  formatCi,
  formatCount,
  formatMetric,
  formatP,
  formatPair,
  importFormErrors,
  latestBatch,
  metricStatus,
  shortHash,
  shortId,
  slotLabel,
  technicalEvaluationErrors,
  technicalEvaluationPayload,
} from '../src/features/research/utils/results.js'

// ------------------------------------------------------------------ fixtures

function paired(overrides = {}) {
  return {
    n: 6,
    assistedMean: 4.1,
    assistedSd: 1.2,
    unassistedMean: 6.3,
    unassistedSd: 1.9,
    meanDelta: -2.2,
    sdDelta: 1.1,
    ci95Lower: -3.4,
    ci95Upper: -1.0,
    tStatistic: -4.9,
    pValue: 0.004,
    cohenDz: -2.0,
    ...overrides,
  }
}

function annotation(status, overrides = {}) {
  return {
    status,
    batchId: status === 'NO_BATCH' ? null : 'b1b2b3b4-0000-0000-0000-000000000000',
    exportSha256: null,
    adjudicationImportId: null,
    message: `backend says ${status}`,
    ...overrides,
  }
}

function tas(overrides = {}) {
  return {
    participantsEvaluated: 6,
    participantsWithoutDenominator: 0,
    runsAnalyzed: 6,
    suggestionsEvaluated: 40,
    harmfulSuggestions: 2,
    pooledRate: 5,
    pooledCi95Lower: 1.4,
    pooledCi95Upper: 16.5,
    participantMean: 4.8,
    participantSd: 3.1,
    participantCi95Lower: 1.5,
    participantCi95Upper: 8.1,
    descriptive: false,
    limit: 20,
    upperCiBelowLimit: true,
    ...overrides,
  }
}

function results(overrides = {}) {
  return {
    studyId: 's1',
    peo: {
      paired: paired(),
      participantsAnalyzed: 6,
      participantsWithoutCountableWords: 0,
      runsAnalyzed: 12,
      relativeReductionMean: 30,
      relativeReductionN: 6,
      relativeReductionSkipped: 0,
      upperCiBelowZero: true,
    },
    ppm: {
      paired: paired({ meanDelta: 1.5, ci95Lower: -0.5, ci95Upper: 3.5 }),
      participantsAnalyzed: 6,
      runsAnalyzed: 12,
      descriptive: false,
      nonInferiorityMargin: 2,
      nonInferior: true,
    },
    tas: tas(),
    tasAccepted: tas({ suggestionsEvaluated: 20, harmfulSuggestions: 0 }),
    orthographyAnnotation: annotation('ADJUDICATED'),
    semanticAnnotation: annotation('ADJUDICATED'),
    ...overrides,
  }
}

function report(overrides = {}) {
  return {
    modelVersion: 'beto-lora-global-v1',
    datasetSha256: 'a'.repeat(64),
    scorerVersion: SCORER_VERSION,
    precision: 0.8,
    recall: 0.5,
    fZeroFive: (1.25 * 0.8 * 0.5) / (0.25 * 0.8 + 0.5),
    truePositives: 40,
    falsePositives: 10,
    falseNegatives: 40,
    ...overrides,
  }
}

function category(overrides = {}) {
  return {
    category: 'ortografia',
    tp: 30,
    fp: 10,
    fn: 10,
    precision: 0.75,
    recall: 0.75,
    f05: 0.75,
    ...overrides,
  }
}

// ------------------------------------------------------------------ metricStatus · PEO

test('PEO stays pending while the orthography annotation is not adjudicated', () => {
  for (const status of ['NO_BATCH', 'NOT_ADJUDICATED', 'INCOMPLETE_COVERAGE']) {
    const state = metricStatus(
      'PEO',
      results({ peo: null, orthographyAnnotation: annotation(status) }),
    )

    assert.equal(state.label, 'Pendiente de adjudicación', status)
    assert.equal(state.severity, 'warn', status)
    assert.equal(state.message, `backend says ${status}`)
  }
})

test('PEO reports an empty or non applicable sample without claiming a pending step', () => {
  const noSample = metricStatus(
    'PEO',
    results({ peo: null, orthographyAnnotation: annotation('NO_SAMPLE') }),
  )
  const notApplicable = metricStatus(
    'PEO',
    results({ peo: null, orthographyAnnotation: annotation('NOT_APPLICABLE') }),
  )

  assert.deepEqual([noSample.label, noSample.severity], ['Sin muestra', 'secondary'])
  assert.deepEqual([notApplicable.label, notApplicable.severity], ['Nada que evaluar', 'secondary'])
})

test('PEO translates the known backend messages of the annotation block', () => {
  const state = metricStatus(
    'PEO',
    results({
      peo: null,
      orthographyAnnotation: annotation('NO_BATCH', {
        message: 'No orthography annotation batch exists for this study',
      }),
    }),
  )

  assert.equal(state.message, 'No existe ningún lote de anotación ortográfica para este estudio.')
})

test('PEO needs at least two analysed participants once adjudicated', () => {
  const missing = metricStatus('PEO', results({ peo: null }))
  const single = metricStatus(
    'PEO',
    results({ peo: { ...results().peo, paired: paired({ n: 1, ci95Upper: null }) } }),
  )

  assert.deepEqual([missing.label, missing.severity], ['Muestra insuficiente', 'warn'])
  assert.deepEqual([single.label, single.severity], ['Muestra insuficiente', 'warn'])
})

test('PEO states the CI criterion, never a success verdict', () => {
  const below = metricStatus('PEO', results())
  const inconclusive = metricStatus(
    'PEO',
    results({ peo: { ...results().peo, upperCiBelowZero: false } }),
  )
  const undefinedCi = metricStatus(
    'PEO',
    results({ peo: { ...results().peo, upperCiBelowZero: null } }),
  )

  assert.deepEqual([below.label, below.severity], ['IC 95 % por debajo de 0', 'success'])
  assert.deepEqual(
    [inconclusive.label, inconclusive.severity],
    ['Sin evidencia concluyente', 'info'],
  )
  assert.deepEqual([undefinedCi.label, undefinedCi.severity], ['Sin evidencia concluyente', 'info'])
})

// ------------------------------------------------------------------ metricStatus · PPM

test('PPM does not claim non-inferiority without a configured margin', () => {
  const state = metricStatus(
    'PPM',
    results({
      ppm: { ...results().ppm, descriptive: true, nonInferiorityMargin: null, nonInferior: null },
    }),
  )

  assert.equal(state.label, 'Resultado descriptivo')
  assert.equal(state.severity, 'info')
})

test('PPM follows the non-inferiority verdict when a margin exists', () => {
  const nonInferior = metricStatus('PPM', results())
  const notShown = metricStatus('PPM', results({ ppm: { ...results().ppm, nonInferior: false } }))
  const tooSmall = metricStatus(
    'PPM',
    results({
      ppm: { ...results().ppm, paired: paired({ n: 1, ci95Lower: null }), nonInferior: null },
    }),
  )
  const missing = metricStatus('PPM', results({ ppm: null }))

  assert.deepEqual([nonInferior.label, nonInferior.severity], ['No inferior (IC 95 %)', 'success'])
  assert.deepEqual([notShown.label, notShown.severity], ['No se demuestra no inferioridad', 'warn'])
  assert.deepEqual([tooSmall.label, tooSmall.severity], ['Muestra insuficiente', 'warn'])
  assert.deepEqual([missing.label, missing.severity], ['Sin muestra', 'secondary'])
})

// ------------------------------------------------------------------ metricStatus · TAS

test('TAS and accepted TAS stay pending while the semantic annotation is not adjudicated', () => {
  for (const kind of ['TAS', 'TAS_ACCEPTED']) {
    const pending = metricStatus(
      kind,
      results({ tas: null, tasAccepted: null, semanticAnnotation: annotation('NOT_ADJUDICATED') }),
    )
    const notApplicable = metricStatus(
      kind,
      results({ tas: null, tasAccepted: null, semanticAnnotation: annotation('NOT_APPLICABLE') }),
    )

    assert.deepEqual([pending.label, pending.severity], ['Pendiente de adjudicación', 'warn'], kind)
    assert.deepEqual(
      [notApplicable.label, notApplicable.severity],
      ['Nada que evaluar', 'secondary'],
      kind,
    )
  }
})

test('TAS is descriptive without a limit and follows the Wilson upper bound with one', () => {
  const descriptive = metricStatus(
    'TAS',
    results({ tas: tas({ descriptive: true, limit: null, upperCiBelowLimit: null }) }),
  )
  const below = metricStatus('TAS', results())
  const above = metricStatus('TAS', results({ tas: tas({ upperCiBelowLimit: false }) }))
  const none = metricStatus(
    'TAS',
    results({
      tas: tas({ suggestionsEvaluated: 0, pooledRate: null, upperCiBelowLimit: null }),
    }),
  )
  const missing = metricStatus('TAS', results({ tas: null }))

  assert.deepEqual([descriptive.label, descriptive.severity], ['Resultado descriptivo', 'info'])
  assert.deepEqual(
    [below.label, below.severity],
    ['Límite superior del IC bajo el límite', 'success'],
  )
  assert.deepEqual(
    [above.label, above.severity],
    ['Límite superior del IC por encima del límite', 'danger'],
  )
  assert.deepEqual([none.label, none.severity], ['Sin sugerencias evaluadas', 'secondary'])
  assert.deepEqual([missing.label, missing.severity], ['Sin sugerencias evaluadas', 'secondary'])
})

test('accepted TAS reads its own block', () => {
  const state = metricStatus(
    'TAS_ACCEPTED',
    results({ tasAccepted: tas({ upperCiBelowLimit: false }) }),
  )

  assert.equal(state.label, 'Límite superior del IC por encima del límite')
  assert.equal(state.severity, 'danger')
})

test('metricStatus tolerates unknown kinds and missing results', () => {
  assert.equal(metricStatus('OTHER', results()).severity, 'secondary')
  assert.equal(metricStatus('PEO', null).label, 'Pendiente de adjudicación')
  assert.equal(metricStatus('PPM', undefined).label, 'Sin muestra')
})

// ------------------------------------------------------------------ annotation helpers

test('annotationNextStep tells the researcher what to do for every status', () => {
  assert.equal(annotationNextStep('NO_BATCH'), 'Crea el lote.')
  assert.equal(
    annotationNextStep('NOT_ADJUDICATED'),
    'Importa los evaluadores y la adjudicación de este lote; no crees otro.',
  )
  assert.equal(annotationNextStep('INCOMPLETE_COVERAGE'), 'Crea y adjudica un lote nuevo.')
  assert.equal(annotationNextStep('NOT_APPLICABLE'), 'Nada que evaluar.')
  assert.equal(
    annotationNextStep('NO_SAMPLE'),
    'Completa sesiones: ningún participante tiene un par completo.',
  )
  assert.equal(annotationNextStep('ADJUDICATED'), 'Listo: la adjudicación cubre toda la muestra.')
  assert.equal(annotationNextStep('SOMETHING_ELSE'), '')
  assert.equal(annotationNextStep(undefined), '')
})

test('annotationStatusLabel maps every status to a Spanish tag', () => {
  assert.deepEqual(annotationStatusLabel('ADJUDICATED'), {
    label: 'Adjudicado',
    severity: 'success',
  })
  assert.deepEqual(annotationStatusLabel('NO_BATCH'), { label: 'Sin lote', severity: 'secondary' })
  assert.deepEqual(annotationStatusLabel('NOT_ADJUDICATED'), {
    label: 'Sin adjudicar',
    severity: 'warn',
  })
  assert.deepEqual(annotationStatusLabel('INCOMPLETE_COVERAGE'), {
    label: 'Cobertura incompleta',
    severity: 'warn',
  })
  assert.deepEqual(annotationStatusLabel('NOT_APPLICABLE'), {
    label: 'No aplica',
    severity: 'secondary',
  })
  assert.deepEqual(annotationStatusLabel('NO_SAMPLE'), {
    label: 'Sin muestra',
    severity: 'secondary',
  })
  assert.deepEqual(annotationStatusLabel(null), { label: 'Sin datos', severity: 'secondary' })
})

test('slot and kind labels are Spanish and cover every option', () => {
  assert.deepEqual(
    ANNOTATION_SLOT_OPTIONS.map((option) => option.value),
    ['RATER_1', 'RATER_2', 'ADJUDICATED'],
  )
  assert.equal(slotLabel('RATER_1'), 'Evaluador 1')
  assert.equal(slotLabel('RATER_2'), 'Evaluador 2')
  assert.equal(slotLabel('ADJUDICATED'), 'Adjudicación')
  assert.equal(slotLabel('OTHER'), 'OTHER')
  assert.equal(annotationKindLabel('ORTHOGRAPHY'), 'Ortografía')
  assert.equal(annotationKindLabel('SEMANTIC'), 'Semántica')
  assert.equal(annotationKindLabel('OTHER'), 'OTHER')
})

test('latestBatch picks the newest batch of a kind', () => {
  const batches = [
    { id: 'old', kind: 'ORTHOGRAPHY', createdAt: '2026-09-01T10:00:00Z' },
    { id: 'new', kind: 'ORTHOGRAPHY', createdAt: '2026-09-10T10:00:00Z' },
    { id: 'sem', kind: 'SEMANTIC', createdAt: '2026-09-12T10:00:00Z' },
  ]

  assert.equal(latestBatch(batches, 'ORTHOGRAPHY').id, 'new')
  assert.equal(latestBatch(batches, 'SEMANTIC').id, 'sem')
  assert.equal(latestBatch([], 'SEMANTIC'), null)
  assert.equal(latestBatch(undefined, 'SEMANTIC'), null)
})

test('currentImports returns one row per slot, in order, with the current import or null', () => {
  const batch = {
    imports: [
      { id: 'i1', slot: 'RATER_1', version: 1, rater: 'Ana', current: false },
      { id: 'i2', slot: 'RATER_1', version: 2, rater: 'Ana', current: true },
      { id: 'i3', slot: 'ADJUDICATED', version: 1, rater: 'Ana', current: true },
    ],
  }

  assert.deepEqual(
    currentImports(batch).map((row) => [row.slot, row.current?.id ?? null]),
    [
      ['RATER_1', 'i2'],
      ['RATER_2', null],
      ['ADJUDICATED', 'i3'],
    ],
  )
  assert.deepEqual(
    currentImports(null).map((row) => row.current),
    [null, null, null],
  )
})

test('importFormErrors requires a slot, a rater and a CSV file of at most 5 MB', () => {
  const file = { name: 'annotations-ORTHOGRAPHY-abc.csv', size: 1200 }

  assert.deepEqual(importFormErrors({ slot: 'RATER_1', rater: 'Ana', file }), {})
  assert.equal(
    importFormErrors({ slot: null, rater: 'Ana', file }).slot,
    'Elige la ranura que vas a importar.',
  )
  assert.equal(
    importFormErrors({ slot: 'RATER_1', rater: '   ', file }).rater,
    'El nombre del evaluador es obligatorio.',
  )
  assert.equal(
    importFormErrors({ slot: 'RATER_1', rater: 'a'.repeat(81), file }).rater,
    'Máximo 80 caracteres.',
  )
  assert.equal(
    importFormErrors({ slot: 'RATER_1', rater: 'Ana', file: null }).file,
    'Elige el archivo CSV con los puntajes.',
  )
  assert.equal(
    importFormErrors({ slot: 'RATER_1', rater: 'Ana', file: { name: 'scores.xlsx', size: 10 } })
      .file,
    'El archivo debe ser un CSV (.csv).',
  )
  assert.equal(
    importFormErrors({
      slot: 'RATER_1',
      rater: 'Ana',
      file: { name: 'scores.csv', size: IMPORT_MAX_BYTES + 1 },
    }).file,
    'El archivo supera los 5 MB.',
  )
  assert.equal(
    importFormErrors({ slot: 'RATER_1', rater: 'Ana', file: { name: 'scores.CSV', size: 10 } })
      .file,
    undefined,
  )
})

// ------------------------------------------------------------------ formatters

test('formatMetric renders numbers with fixed digits, a unit and a real minus sign', () => {
  assert.equal(formatMetric(12.345), '12.35')
  assert.equal(formatMetric(12.345, { digits: 1, unit: '%' }), '12.3 %')
  assert.equal(formatMetric(-2.2, { digits: 1 }), '−2.2')
  assert.equal(formatMetric(0, { digits: 0 }), '0')
  assert.equal(formatMetric(-0.001, { digits: 2 }), '0.00')
  assert.equal(formatMetric(null), '—')
  assert.equal(formatMetric(undefined), '—')
  assert.equal(formatMetric(Number.NaN), '—')
  assert.equal(formatMetric('12'), '—')
})

test('formatPair, formatCi, formatP and formatCount handle missing values', () => {
  assert.equal(formatPair(4.1, 1.2, { digits: 1 }), '4.1 ± 1.2')
  assert.equal(formatPair(4.1, null, { digits: 1 }), '4.1')
  assert.equal(formatPair(4.1, 1.2, { digits: 2, unit: '%' }), '4.10 ± 1.20 %')
  assert.equal(formatPair(4.1, null, { digits: 1, unit: '%' }), '4.1 %')
  assert.equal(formatPair(null, 1.2), '—')
  assert.equal(formatCi(-3.4, -1.0, { digits: 1 }), '[−3.4; −1.0]')
  assert.equal(formatCi(-0.5, 3.5, { digits: 2, unit: '%' }), '[−0.50 %; 3.50 %]')
  assert.equal(formatCi(null, 1), '—')
  assert.equal(formatCi(1, undefined), '—')
  assert.equal(formatP(0.0004), '< 0.001')
  assert.equal(formatP(0.001), '0.001')
  assert.equal(formatP(0.0345), '0.035')
  assert.equal(formatP(1), '1.000')
  assert.equal(formatP(null), '—')
  assert.equal(formatCount(12), '12')
  assert.equal(formatCount(0), '0')
  assert.equal(formatCount(null), '—')
})

test('shortId and shortHash abbreviate identifiers for display', () => {
  assert.equal(shortId('b1b2b3b4-0000-0000-0000-000000000000'), 'b1b2b3b4')
  assert.equal(shortId(null), '—')
  assert.equal(shortHash('abcdef0123456789abcdef0123456789'), 'abcdef012345…')
  assert.equal(shortHash('abc'), 'abc')
  assert.equal(shortHash(''), '—')
})

// ------------------------------------------------------------------ technicalEvaluationErrors

test('a valid evaluate.py report has no errors', () => {
  assert.deepEqual(technicalEvaluationErrors(report()), [])
  assert.deepEqual(technicalEvaluationErrors(report({ categories: [] })), [])
  assert.deepEqual(technicalEvaluationErrors(report({ categories: [category()] })), [])
})

test('zero denominators are valid only when the reported rate is 0', () => {
  const empty = report({
    precision: 0,
    recall: 0,
    fZeroFive: 0,
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
  })

  assert.deepEqual(technicalEvaluationErrors(empty), [])
  assert.ok(
    technicalEvaluationErrors({ ...empty, precision: 0.5 }).some((error) =>
      error.startsWith('precision'),
    ),
  )
})

test('the report must be a JSON object', () => {
  for (const value of [null, undefined, [], 'text', 42]) {
    const errors = technicalEvaluationErrors(value)

    assert.equal(errors.length, 1)
    assert.match(errors[0], /objeto JSON/)
  }
})

test('every required field is checked', () => {
  const cases = [
    [{ modelVersion: '' }, /modelVersion/],
    [{ modelVersion: 'x'.repeat(161) }, /modelVersion/],
    [{ modelVersion: null }, /modelVersion/],
    [{ datasetSha256: 'A'.repeat(64) }, /datasetSha256/],
    [{ datasetSha256: 'a'.repeat(63) }, /datasetSha256/],
    [{ datasetSha256: undefined }, /datasetSha256/],
    [{ scorerVersion: 'other_scorer' }, /scorerVersion/],
    [{ scorerVersion: undefined }, /scorerVersion/],
    [{ precision: 1.2 }, /precision/],
    [{ precision: -0.1 }, /precision/],
    [{ precision: '0.8' }, /precision/],
    [{ recall: Number.NaN }, /recall/],
    [{ fZeroFive: null }, /fZeroFive/],
    [{ truePositives: -1 }, /truePositives/],
    [{ truePositives: 1.5 }, /truePositives/],
    [{ falsePositives: '10' }, /falsePositives/],
    [{ falseNegatives: undefined }, /falseNegatives/],
  ]

  for (const [overrides, pattern] of cases) {
    const errors = technicalEvaluationErrors(report(overrides))

    assert.ok(
      errors.some((error) => pattern.test(error)),
      JSON.stringify(overrides),
    )
  }
})

test('rates must match TP/FP/FN and F0.5 must match precision and recall', () => {
  const precision = technicalEvaluationErrors(report({ precision: 0.81 }))
  const recall = technicalEvaluationErrors(report({ recall: 0.51 }))
  const f05 = technicalEvaluationErrors(report({ fZeroFive: 0.7 }))
  const tolerated = technicalEvaluationErrors(
    report({ fZeroFive: (1.25 * 0.8 * 0.5) / (0.25 * 0.8 + 0.5) + 5e-7 }),
  )

  assert.ok(precision.some((error) => /precision no coincide con TP \/ \(TP \+ FP\)/.test(error)))
  assert.ok(recall.some((error) => /recall no coincide con TP \/ \(TP \+ FN\)/.test(error)))
  assert.equal(f05.length, 1)
  assert.match(f05[0], /fZeroFive no coincide con precision y recall \(esperado 0\.714286\)/)
  assert.deepEqual(tolerated, [])
})

test('consistency is only checked when the fields are individually valid', () => {
  const errors = technicalEvaluationErrors(report({ precision: 'x', truePositives: -1 }))

  assert.ok(errors.every((error) => !/no coincide/.test(error)))
})

test('categories are optional but follow the same rules and must be unique', () => {
  const notList = technicalEvaluationErrors(report({ categories: 'x' }))
  const tooMany = technicalEvaluationErrors(
    report({ categories: Array.from({ length: 51 }, (_, i) => category({ category: `c${i}` })) }),
  )
  const notObject = technicalEvaluationErrors(report({ categories: [42] }))
  const noName = technicalEvaluationErrors(report({ categories: [category({ category: '  ' })] }))
  const longName = technicalEvaluationErrors(
    report({ categories: [category({ category: 'x'.repeat(81) })] }),
  )
  const badCounts = technicalEvaluationErrors(report({ categories: [category({ tp: -1 })] }))
  const badRate = technicalEvaluationErrors(report({ categories: [category({ f05: 2 })] }))
  const mismatch = technicalEvaluationErrors(report({ categories: [category({ precision: 0.7 })] }))
  const f05Mismatch = technicalEvaluationErrors(report({ categories: [category({ f05: 0.7 })] }))
  const repeated = technicalEvaluationErrors(
    report({ categories: [category(), category({ category: ' ortografia ' })] }),
  )

  assert.match(notList[0], /categories/)
  assert.match(tooMany[0], /categories/)
  assert.match(notObject[0], /Categoría #1/)
  assert.match(noName[0], /Categoría #1: category/)
  assert.match(longName[0], /category/)
  assert.match(badCounts[0], /Categoría 'ortografia': tp/)
  assert.match(badRate[0], /Categoría 'ortografia': f05/)
  assert.match(mismatch[0], /Categoría 'ortografia': precision no coincide/)
  assert.match(f05Mismatch[0], /Categoría 'ortografia': f05 no coincide/)
  assert.match(repeated[0], /Categoría 'ortografia' repetida/)
})

test('technicalEvaluationPayload keeps only the contract fields and trims names', () => {
  const payload = technicalEvaluationPayload(
    report({
      modelVersion: '  beto-v1 ',
      extra: 'ignored',
      categories: [category({ category: ' ortografia ', extra: true })],
    }),
  )

  assert.deepEqual(
    Object.keys(payload).sort(),
    [
      'categories',
      'datasetSha256',
      'falseNegatives',
      'falsePositives',
      'fZeroFive',
      'modelVersion',
      'precision',
      'recall',
      'scorerVersion',
      'truePositives',
    ].sort(),
  )
  assert.equal(payload.modelVersion, 'beto-v1')
  assert.deepEqual(payload.categories, [category({ category: 'ortografia' })])
  assert.deepEqual(technicalEvaluationPayload(report()).categories, [])
})
