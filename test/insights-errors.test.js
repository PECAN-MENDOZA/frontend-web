import test from 'node:test'
import assert from 'node:assert/strict'
import {
  exampleLabel,
  practiceSheet,
  sortTypes,
} from '../src/features/insights/utils/errors.js'

test('exampleLabel pluralizes "veces" and keeps "vez" for a single occurrence', () => {
  assert.equal(
    exampleLabel({ original: 'bolver', corrected: 'volver', count: 4 }),
    'bolver → volver (4 veces)',
  )
  assert.equal(
    exampleLabel({ original: 'bolver', corrected: 'volver', count: 1 }),
    'bolver → volver (1 vez)',
  )
})

test('practiceSheet lists each word with the original mistake and the count', () => {
  const words = [
    { original: 'bolver', corrected: 'volver', count: 4 },
    { original: 'aver', corrected: 'a ver', count: 2 },
  ]

  assert.equal(
    practiceSheet(words, 'Ana'),
    'Palabras para practicar — Ana\n' +
      'volver (escribió bolver, 4 veces)\n' +
      'a ver (escribió aver, 2 veces)',
  )
})

test('practiceSheet omits the name in the title when studentName is empty', () => {
  const words = [{ original: 'bolver', corrected: 'volver', count: 4 }]

  assert.equal(
    practiceSheet(words, ''),
    'Palabras para practicar\nvolver (escribió bolver, 4 veces)',
  )
  assert.equal(practiceSheet(words, undefined), 'Palabras para practicar\nvolver (escribió bolver, 4 veces)')
  assert.equal(practiceSheet([], 'Ana'), 'Palabras para practicar — Ana')
})

test('sortTypes orders by count descending and keeps a stable order for ties', () => {
  const types = [
    { type: 'ACENTUACION', count: 2 },
    { type: 'ORTOGRAFIA', count: 5 },
    { type: 'CONCORDANCIA', count: 5 },
    { type: 'PUNTUACION', count: 1 },
  ]

  assert.deepEqual(
    sortTypes(types).map((item) => item.type),
    ['ORTOGRAFIA', 'CONCORDANCIA', 'ACENTUACION', 'PUNTUACION'],
  )
  // No muta el arreglo original.
  assert.equal(types[0].type, 'ACENTUACION')
})
