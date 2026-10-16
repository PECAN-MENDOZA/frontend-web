import test from 'node:test'
import assert from 'node:assert/strict'
import {
  OUTCOME_LABELS,
  OUTCOME_SEVERITIES,
  assistanceBadge,
  correctionLine,
  correctionsLabel,
  outcomeSummary,
  outcomeTags,
} from '../src/features/insights/utils/outcomes.js'

test('OUTCOME_LABELS and OUTCOME_SEVERITIES cover the six outcomes in Spanish', () => {
  assert.deepEqual(Object.keys(OUTCOME_LABELS), [
    'EDITED',
    'ACCEPTED',
    'REJECTED',
    'UNDONE',
    'UNANSWERED',
    'NO_CHANGES',
  ])
  assert.equal(OUTCOME_LABELS.NO_CHANGES, 'Ya estaba bien')
  assert.equal(OUTCOME_SEVERITIES.NO_CHANGES, 'secondary')
  assert.equal(OUTCOME_LABELS.EDITED, 'Aceptó y editó')
  assert.equal(OUTCOME_SEVERITIES.UNANSWERED, 'secondary')
})

test('outcomeSummary keeps a fixed order and rounds pct to one decimal', () => {
  const help = { total: 3, edited: 1, accepted: 1, rejected: 1, undone: 0, unanswered: 0 }

  assert.deepEqual(
    outcomeSummary(help).map(({ key, pct }) => ({ key, pct })),
    [
      { key: 'EDITED', pct: 33.3 },
      { key: 'ACCEPTED', pct: 33.3 },
      { key: 'REJECTED', pct: 33.3 },
      { key: 'UNDONE', pct: 0 },
      { key: 'UNANSWERED', pct: 0 },
      { key: 'NO_CHANGES', pct: 0 },
    ],
  )
})

test('outcomeSummary returns pct 0 for every outcome when total is 0', () => {
  const help = { total: 0, edited: 0, accepted: 0, rejected: 0, undone: 0, unanswered: 0 }

  for (const item of outcomeSummary(help)) {
    assert.equal(item.pct, 0)
    assert.equal(item.count, 0)
  }
})

test('correctionLine shows the single word that changed', () => {
  assert.equal(
    correctionLine({ originalText: 'yo bolver mañana', finalText: 'yo volver mañana' }),
    'bolver → volver',
  )
})

test('correctionLine falls back to the first 6 words when more than one word differs', () => {
  const item = {
    originalText: 'la niña fue al parque muy contenta ayer',
    finalText: 'la niña fue al parque muy alegre hoy',
  }
  assert.equal(correctionLine(item), 'la niña fue al parque muy…')
})

test('correctionLine falls back when nothing changed or lengths differ', () => {
  assert.equal(
    correctionLine({ originalText: 'todo bien', finalText: 'todo bien' }),
    'todo bien…',
  )
  assert.equal(
    correctionLine({ originalText: 'una frase corta', finalText: 'una frase mucho más larga' }),
    'una frase corta…',
  )
})

test('assistanceBadge marks in-test corrections with or without help, and null otherwise', () => {
  assert.equal(assistanceBadge({ inTest: true, assistance: 'ASSISTED' }), 'en prueba · con ayuda')
  assert.equal(
    assistanceBadge({ inTest: true, assistance: 'UNASSISTED' }),
    'en prueba · sin ayuda',
  )
  assert.equal(assistanceBadge({ inTest: false, assistance: 'ASSISTED' }), null)
  assert.equal(assistanceBadge({}), null)
})

test('assistanceBadge hides old pilot test marks when sentence tests are off', () => {
  assert.equal(assistanceBadge({ inTest: true, assistance: 'ASSISTED' }, false), null)
  assert.equal(
    assistanceBadge({ inTest: true, assistance: 'ASSISTED' }, true),
    'en prueba · con ayuda',
  )
})

test('outcomeTags lists only the outcomes with a count, in the fixed order, with their severity', () => {
  const tags = outcomeTags({ edited: 0, accepted: 2, rejected: 1, undone: 0, unanswered: 3 })

  assert.deepEqual(
    tags.map((tag) => [tag.key, tag.label, tag.count, tag.severity]),
    [
      ['ACCEPTED', 'Aceptó', 2, 'info'],
      ['REJECTED', 'Rechazó', 1, 'warn'],
      ['UNANSWERED', 'Sin respuesta', 3, 'secondary'],
    ],
  )
  assert.deepEqual(outcomeTags(null), [])
})

test('correctionsLabel names the count "correcciones pedidas", as the PDF does', () => {
  assert.equal(correctionsLabel(0), 'Sin correcciones pedidas')
  assert.equal(correctionsLabel(1), '1 corrección pedida')
  assert.equal(correctionsLabel(7), '7 correcciones pedidas')
})

test('outcomeSummary reads noChanges and puts "Ya estaba bien" last, over the full total', () => {
  const help = { total: 4, edited: 0, accepted: 1, rejected: 1, undone: 0, unanswered: 0, noChanges: 2 }
  const summary = outcomeSummary(help)

  assert.deepEqual(summary.at(-1), { key: 'NO_CHANGES', label: 'Ya estaba bien', count: 2, pct: 50 })
  assert.equal(summary.find((item) => item.key === 'REJECTED').pct, 25)
})

test('outcomeSummary tolerates responses without noChanges (older backend)', () => {
  const help = { total: 1, edited: 0, accepted: 1, rejected: 0, undone: 0, unanswered: 0 }

  assert.deepEqual(outcomeSummary(help).at(-1), {
    key: 'NO_CHANGES',
    label: 'Ya estaba bien',
    count: 0,
    pct: 0,
  })
})

test('outcomeTags shows "Ya estaba bien" after every other outcome', () => {
  const tags = outcomeTags({ accepted: 1, unanswered: 1, noChanges: 3 })

  assert.deepEqual(
    tags.map((tag) => [tag.key, tag.count, tag.severity]),
    [
      ['ACCEPTED', 1, 'info'],
      ['UNANSWERED', 1, 'secondary'],
      ['NO_CHANGES', 3, 'secondary'],
    ],
  )
})
