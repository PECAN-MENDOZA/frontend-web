import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STUDENT_COUNT_MAX,
  classroomArchiveConfirmation,
  classroomFormErrors,
  credentialsAsText,
  credentialsPrintHtml,
  credentialsTitle,
  formatDeactivatedAt,
  formatLastAccess,
  inactiveInClassroom,
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
  assert.equal(text, 'Salón 3.º B\nalias: tigre-07 · PIN: 1234\nalias: luna-12 · PIN: 0042')
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

test('formatLastAccess matches the students directory: relative, or "Sin actividad"', () => {
  assert.equal(formatLastAccess(null), 'Sin actividad')
  assert.equal(formatLastAccess('no-es-fecha'), 'Sin actividad')
  const now = new Date('2026-09-17T15:30:00Z')
  assert.equal(formatLastAccess('2026-09-17T15:04:00Z', now), 'hace 26 min')
  assert.match(formatLastAccess('2026-09-01T15:04:00Z', now), /2026/)
})

test('inactiveInClassroom keeps only that classroom, most recent deactivation first', () => {
  const links = [
    { studentId: 'a', classroomId: 'room-1', deactivatedAt: '2026-10-01T10:00:00Z' },
    { studentId: 'b', classroomId: 'room-2', deactivatedAt: '2026-10-05T10:00:00Z' },
    { studentId: 'c', classroomId: 'room-1', deactivatedAt: '2026-10-03T10:00:00Z' },
  ]

  assert.deepEqual(
    inactiveInClassroom(links, 'room-1').map((link) => link.studentId),
    ['c', 'a'],
  )
  assert.deepEqual(inactiveInClassroom(null, 'room-1'), [])
})

test('formatDeactivatedAt shows a dash when the date is missing', () => {
  assert.equal(formatDeactivatedAt(null), '—')
  assert.equal(formatDeactivatedAt('no-es-fecha'), '—')
  // Mismo formato que el resto del portal: dd/mm/aaaa HH:mm en Lima (UTC-5).
  assert.equal(formatDeactivatedAt('2026-10-15T15:04:00Z'), '15/10/2026 10:04')
  assert.equal(formatDeactivatedAt('2026-10-16T03:30:00Z'), '15/10/2026 22:30')
})

test('credentialsPrintHtml prints a heading, an instruction and an escaped alias/PIN table', () => {
  const html = credentialsPrintHtml(
    [
      { username: 'panda-53', pin: '1234', studentRealName: 'Ana Pérez' },
      { username: '<b>x</b>', pin: '0001' },
    ],
    '3.º B',
  )

  assert.equal(credentialsTitle('3.º B'), 'Credenciales – Salón 3.º B')
  assert.equal(credentialsTitle(''), 'Credenciales')
  assert.match(html, /<h1>Credenciales – Salón 3\.º B<\/h1>/)
  assert.match(html, /<p>Recorta cada fila/)
  assert.match(html, /<th>Alias<\/th><th>PIN<\/th>/)
  assert.match(html, /<tr><td>panda-53<\/td><td>1234<\/td><\/tr>/)
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/)
  assert.doesNotMatch(html, /Ana Pérez/)
})

test('classroomArchiveConfirmation names the classroom', () => {
  const confirmation = classroomArchiveConfirmation('4.º A')

  assert.equal(confirmation.header, 'Archivar 4.º A')
  assert.equal(confirmation.acceptLabel, 'Archivar')
})
