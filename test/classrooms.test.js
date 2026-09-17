import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STUDENT_COUNT_MAX,
  classroomFormErrors,
  credentialsAsText,
  formatLastAccess,
  sortClassrooms,
  studentsFormErrors,
} from '../src/features/classrooms/utils/classrooms.js'

test('classroomFormErrors requires a name up to 80 chars', () => {
  assert.deepEqual(classroomFormErrors({ name: '3.º B' }), {})
  assert.deepEqual(classroomFormErrors({ name: '   ' }), { name: 'El nombre del salón es obligatorio.' })
  assert.deepEqual(classroomFormErrors({ name: 'x'.repeat(81) }), { name: 'Máximo 80 caracteres.' })
})

test('studentsFormErrors validates by mode', () => {
  assert.deepEqual(studentsFormErrors({ mode: 'named', studentRealName: 'Ana Torres' }), {})
  assert.deepEqual(studentsFormErrors({ mode: 'named', studentRealName: '' }), {
    studentRealName: 'El nombre del estudiante es obligatorio.',
  })
  assert.deepEqual(studentsFormErrors({ mode: 'count', count: 5 }), {})
  assert.deepEqual(studentsFormErrors({ mode: 'count', count: 0 }), {
    count: `Indica entre 1 y ${STUDENT_COUNT_MAX} estudiantes.`,
  })
  assert.deepEqual(studentsFormErrors({ mode: 'count', count: 41 }), {
    count: `Indica entre 1 y ${STUDENT_COUNT_MAX} estudiantes.`,
  })
})

test('credentialsAsText lists one line per student without real names', () => {
  const text = credentialsAsText(
    [
      { username: 'tigre-07', pin: '1234', studentRealName: 'Ana' },
      { username: 'luna-12', pin: '0042', studentRealName: '' },
    ],
    '3.º B',
  )
  assert.equal(text, 'Salón 3.º B\nusuario: tigre-07 · PIN: 1234\nusuario: luna-12 · PIN: 0042')
  assert.equal(text.includes('Ana'), false)
})

test('sortClassrooms puts active classrooms first, then by name', () => {
  const sorted = sortClassrooms([
    { name: '5.º A', archivedAt: '2026-01-01T00:00:00Z' },
    { name: '3.º B', archivedAt: null },
    { name: '1.º C', archivedAt: null },
  ])
  assert.deepEqual(
    sorted.map((c) => c.name),
    ['1.º C', '3.º B', '5.º A'],
  )
})

test('formatLastAccess shows a placeholder when the student never signed in', () => {
  assert.equal(formatLastAccess(null), 'Sin ingresos')
  assert.equal(formatLastAccess('no-es-fecha'), 'Sin ingresos')
  assert.match(formatLastAccess('2026-09-17T15:04:00Z'), /2026/)
})
