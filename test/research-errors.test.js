import test from 'node:test'
import assert from 'node:assert/strict'
import {
  requestErrorMessage,
  translateBackendMessage,
} from '../src/features/research/utils/errors.js'

test('translateBackendMessage maps the known research messages to Spanish', () => {
  const translations = {
    'Study not found': 'No encontramos el estudio.',
    'Study is not active': 'El estudio no está activo.',
    'Participant already has an open run': 'El participante ya tiene una sesión abierta.',
    'Participant already completed both conditions':
      'El participante ya completó ambas condiciones.',
    'Only pending or active runs can be cancelled':
      'Solo se pueden cancelar sesiones pendientes o en curso.',
    'Study is already closed': 'El estudio ya está cerrado.',
    'Only an active study can be closed': 'Solo se puede cerrar un estudio activo.',
    'Access code expired before start': 'El código de acceso venció antes de iniciar la sesión.',
    'Study code already exists': 'Ya existe un estudio con ese código',
  }

  for (const [message, expected] of Object.entries(translations)) {
    assert.equal(translateBackendMessage(message), expected, message)
  }
})

test('translateBackendMessage covers the annotation and technical evaluation messages', () => {
  assert.equal(
    translateBackendMessage('Adjudication requires two complete rater imports'),
    'La adjudicación requiere las importaciones completas de ambos evaluadores.',
  )
  assert.equal(
    translateBackendMessage('RATER_1 and RATER_2 must be distinct raters'),
    'Los evaluadores 1 y 2 deben ser personas distintas.',
  )
  assert.equal(
    translateBackendMessage('Missing scores for 3 sample(s): T-AAAAAAAA, T-BBBBBBBB, T-CCCCCCCC'),
    'Faltan puntajes en 3 muestra(s): T-AAAAAAAA, T-BBBBBBBB, T-CCCCCCCC',
  )
  assert.equal(
    translateBackendMessage('Score exceeds the word count of sample T-AAAAAAAA'),
    'El puntaje supera el número de palabras de la muestra T-AAAAAAAA',
  )
  assert.equal(
    translateBackendMessage('This file is already the current import for slot RATER_1'),
    'Este archivo ya es la importación vigente de la ranura RATER_1',
  )
  assert.equal(
    translateBackendMessage('Unknown sample code in row 4: T-ZZZZZZZZ'),
    'Código de muestra desconocido en la fila 4: T-ZZZZZZZZ',
  )
  assert.equal(
    translateBackendMessage('F0.5 does not match precision and recall (expected 0.714286)'),
    'F0.5 no coincide con precisión y recall (esperado 0.714286)',
  )
  assert.equal(
    translateBackendMessage("Category 'ortografia': Precision/recall do not match TP/FP/FN"),
    'Categoría «ortografia»: Precisión y recall no coinciden con TP/FP/FN.',
  )
  assert.equal(
    translateBackendMessage("Category 'x' is repeated"),
    'La categoría «x» está repetida',
  )
  assert.equal(
    translateBackendMessage('No orthography annotation batch exists for this study'),
    'No existe ningún lote de anotación ortográfica para este estudio.',
  )
})

test('translateBackendMessage covers the dynamic annotation status messages', () => {
  assert.equal(
    translateBackendMessage(
      'Batch b1 is the most recent orthography batch but has no current adjudication over the current rater imports; import its rater and adjudication files',
    ),
    'El lote b1 es el más reciente de ortografía pero no tiene una adjudicación vigente sobre las importaciones actuales de los evaluadores; importa sus archivos de evaluadores y adjudicación',
  )
  assert.equal(
    translateBackendMessage(
      'Batch b2 is the most recent semantic batch but has no current adjudication over the current rater imports; import its rater and adjudication files; the older adjudicated batch b1 is not used because only 3 of 5 included suggestions have an adjudicated semantic score',
    ),
    'El lote b2 es el más reciente de semántica pero no tiene una adjudicación vigente sobre las importaciones actuales de los evaluadores; importa sus archivos de evaluadores y adjudicación; el lote adjudicado anterior b1 no se usa porque solo 3 de 5 sugerencias incluidas tienen puntaje adjudicado',
  )
  assert.equal(
    translateBackendMessage(
      '4 of 6 included runs have an adjudicated orthography score in the current batch; create and adjudicate a new orthography batch',
    ),
    'Solo 4 de 6 sesiones incluidas tienen puntaje adjudicado de ortografía en el lote vigente; crea y adjudica un lote nuevo',
  )
})

test('translateBackendMessage returns unknown or empty messages untouched', () => {
  assert.equal(translateBackendMessage('Algo salió mal'), 'Algo salió mal')
  assert.equal(translateBackendMessage('  Study not found  '), 'No encontramos el estudio.')
  assert.equal(translateBackendMessage(''), '')
  assert.equal(translateBackendMessage(undefined), '')
})

test('requestErrorMessage keeps the backend message and falls back when there is none', () => {
  const fallback = 'No pudimos completar la acción.'

  assert.equal(
    requestErrorMessage({ status: 409, message: 'Study is not active' }, fallback),
    'El estudio no está activo.',
  )
  assert.equal(
    requestErrorMessage({ status: 500, message: 'Unexpected failure' }, fallback),
    'Unexpected failure',
  )
  assert.equal(requestErrorMessage({ status: 400, message: '' }, fallback), fallback)
  assert.equal(requestErrorMessage(new TypeError('Failed to fetch'), fallback), fallback)
  assert.equal(requestErrorMessage(null, fallback), fallback)
})
