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

test('OUTCOME_LABELS and OUTCOME_SEVERITIES cover the five outcomes in Spanish', () => {
  assert.deepEqual(Object.keys(OUTCOME_LABELS), [
    'EDITED',
    'ACCEPTED',
    'REJECTED',
    'UNDONE',
    'UNANSWERED',
  ])
  assert.equal(OUTCOME_LABELS.EDITED, 'Resolvió solo')
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

test('correctionsLabel counts corrections in Spanish', () => {
  assert.equal(correctionsLabel(0), 'Sin correcciones')
  assert.equal(correctionsLabel(1), '1 corrección')
  assert.equal(correctionsLabel(7), '7 correcciones')
})
