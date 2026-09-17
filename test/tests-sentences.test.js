import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ASSISTANCE_LABELS,
  KIND_LABELS,
  REFERENCE_MAX_LENGTH,
  SENTENCE_MAX,
  STATUS_LABELS,
  TEST_CODE_PATTERN,
  canActivate,
  countsSummary,
  moveSentence,
  newSentence,
  sentenceCounts,
  sentenceErrors,
  testFormErrors,
} from '../src/features/tests/utils/sentences.js'

test('labels and limits expose the sentence-test contract', () => {
  assert.equal(SENTENCE_MAX, 60)
  assert.equal(REFERENCE_MAX_LENGTH, 500)
  assert.equal(TEST_CODE_PATTERN.test('LECTURA-01'), true)
  assert.equal(TEST_CODE_PATTERN.test('lectura'), false)
  assert.deepEqual(KIND_LABELS, { DICTATED: 'Dictada', FREE: 'Libre' })
  assert.deepEqual(ASSISTANCE_LABELS, { ASSISTED: 'Con ayuda', UNASSISTED: 'Sin ayuda' })
  assert.deepEqual(STATUS_LABELS, { DRAFT: 'Borrador', ACTIVE: 'Activa', CLOSED: 'Cerrada' })
})

test('testFormErrors validates code and required title', () => {
  assert.deepEqual(testFormErrors({ code: 'LECTURA-01', title: 'Prueba inicial' }), {})
  assert.deepEqual(testFormErrors({ code: 'lectura', title: '   ' }), {
    code: 'Usa mayúsculas, números y guiones (3–40).',
    title: 'El título es obligatorio.',
  })
})

test('newSentence creates a fresh sentence with configurable defaults', () => {
  assert.deepEqual(newSentence(), {
    kind: 'DICTATED',
    referenceText: '',
    assistance: 'ASSISTED',
  })
  assert.deepEqual(newSentence('FREE', 'UNASSISTED'), {
    kind: 'FREE',
    referenceText: '',
    assistance: 'UNASSISTED',
  })
  assert.notEqual(newSentence(), newSentence())
})

test('sentenceErrors covers empty lists, empty text and the 60/500 limits', () => {
  assert.deepEqual(sentenceErrors([]), [{ index: -1, message: 'Añade al menos una oración.' }])
  assert.deepEqual(sentenceErrors([{ referenceText: '   ' }]), [
    { index: 0, message: 'La oración 1 está vacía.' },
  ])
  assert.deepEqual(sentenceErrors([{ referenceText: 'x'.repeat(501) }]), [
    { index: 0, message: 'La oración 1 supera 500 caracteres.' },
  ])
  assert.deepEqual(
    sentenceErrors(Array.from({ length: SENTENCE_MAX }, () => ({ referenceText: 'Válida' }))),
    [],
  )
  assert.deepEqual(
    sentenceErrors(Array.from({ length: SENTENCE_MAX + 1 }, () => ({ referenceText: 'Válida' }))),
    [{ index: -1, message: 'Máximo 60 oraciones.' }],
  )
  assert.deepEqual(sentenceErrors([{ referenceText: 'x'.repeat(REFERENCE_MAX_LENGTH) }]), [])
})

test('sentenceCounts counts every kind and assistance independently', () => {
  assert.deepEqual(
    sentenceCounts([
      { kind: 'DICTATED', assistance: 'ASSISTED' },
      { kind: 'DICTATED', assistance: 'UNASSISTED' },
      { kind: 'FREE', assistance: 'ASSISTED' },
    ]),
    { total: 3, dictated: 2, free: 1, assisted: 2, unassisted: 1 },
  )
  assert.deepEqual(sentenceCounts([]), {
    total: 0,
    dictated: 0,
    free: 0,
    assisted: 0,
    unassisted: 0,
  })
})

test('countsSummary formats the sentence distribution', () => {
  assert.equal(
    countsSummary({ total: 20, dictated: 16, free: 4, assisted: 10, unassisted: 10 }),
    '20 oraciones · 16 dictadas / 4 libres · 10 con ayuda / 10 sin',
  )
  assert.equal(
    countsSummary({ total: 0, dictated: 0, free: 0, assisted: 0, unassisted: 0 }),
    '0 oraciones · 0 dictadas / 0 libres · 0 con ayuda / 0 sin',
  )
})

test('moveSentence returns an immutable reordered list and ignores invalid indexes', () => {
  const original = [{ id: 1 }, { id: 2 }, { id: 3 }]
  const moved = moveSentence(original, 0, 2)

  assert.deepEqual(moved, [{ id: 2 }, { id: 3 }, { id: 1 }])
  assert.deepEqual(original, [{ id: 1 }, { id: 2 }, { id: 3 }])
  assert.notEqual(moved, original)
  assert.deepEqual(moveSentence(original, -1, 2), original)
  assert.notEqual(moveSentence(original, -1, 2), original)
})

test('canActivate requires a draft with valid sentences', () => {
  assert.equal(canActivate({ status: 'DRAFT' }, [{ referenceText: 'Texto válido' }]), true)
  assert.equal(canActivate({ status: 'ACTIVE' }, [{ referenceText: 'Texto válido' }]), false)
  assert.equal(canActivate({ status: 'DRAFT' }, []), false)
})
