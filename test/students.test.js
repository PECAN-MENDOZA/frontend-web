import test from 'node:test'
import assert from 'node:assert/strict'
import {
  backLabel,
  canGoBackTo,
  classroomLabel,
  filterStudents,
  normalizeSearch,
  studentCountLabel,
} from '../src/features/students/utils/students.js'

const students = [
  { realName: 'Niña Pérez', username: 'panda-53' },
  { realName: 'Nina Rojas', username: 'cometa-17' },
  { realName: '', username: 'arbol-24' },
]

test('normalizeSearch ignores case and accents', () => {
  assert.equal(normalizeSearch('  NIÑA Pérez '), 'nina perez')
  assert.equal(normalizeSearch(null), '')
})

test('filterStudents matches accents and case in both directions, by name or alias', () => {
  const names = (query) => filterStudents(students, query).map((s) => s.username)

  assert.deepEqual(names('nina'), ['panda-53', 'cometa-17'])
  assert.deepEqual(names('NIÑA'), ['panda-53', 'cometa-17'])
  assert.deepEqual(names('perez'), ['panda-53'])
  assert.deepEqual(names('ARBOL'), ['arbol-24'])
  assert.deepEqual(names('zzz'), [])
  assert.equal(filterStudents(students, '  ').length, 3)
})

test('studentCountLabel shows "M de N" only while filtering', () => {
  assert.equal(studentCountLabel(3, 3), '3 estudiantes vinculados')
  assert.equal(studentCountLabel(1, 1), '1 estudiante vinculado')
  assert.equal(studentCountLabel(0, 12, true), '0 de 12 estudiantes vinculados')
  assert.equal(studentCountLabel(2, 12, true), '2 de 12 estudiantes vinculados')
})

test('classroomLabel marks archived classrooms', () => {
  assert.equal(classroomLabel('5.º B'), '5.º B')
  assert.equal(classroomLabel('5.º B', true), '5.º B (archivado)')
  assert.equal(classroomLabel('', true), 'Sin salón')
})

test('the ficha goes back only to teacher pages and names where it goes', () => {
  assert.equal(canGoBackTo('/students?q=nina'), true)
  assert.equal(canGoBackTo('/classrooms/abc'), true)
  assert.equal(canGoBackTo('/dashboard'), true)
  assert.equal(canGoBackTo('/auth/login?redirect=/students/x'), false)
  assert.equal(canGoBackTo('/studentsx'), false)
  assert.equal(canGoBackTo(null), false)

  assert.equal(backLabel('/classrooms/abc'), 'Volver al salón')
  assert.equal(backLabel('/dashboard'), 'Volver a Salón hoy')
  assert.equal(backLabel('/students?q=nina'), 'Volver a estudiantes')
  assert.equal(backLabel(null), 'Volver a estudiantes')
})
