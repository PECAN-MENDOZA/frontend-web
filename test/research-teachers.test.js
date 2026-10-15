import test from 'node:test'
import assert from 'node:assert/strict'
import {
  passwordResetConfirmation,
  teacherDisplayName,
  teacherFormErrors,
  teacherLabel,
  teacherStatusLabel,
  temporaryPasswordNotice,
} from '../src/features/research/utils/teachers.js'

test('teacherFormErrors requires name, valid email and institution', () => {
  assert.deepEqual(
    teacherFormErrors({ fullName: 'Ana Pérez', email: 'ana@colegio.edu.pe', institution: 'Colegio' }),
    {},
  )
  assert.deepEqual(teacherFormErrors({ fullName: '', email: 'no-es-correo', institution: ' ' }), {
    fullName: 'El nombre es obligatorio.',
    email: 'Escribe un correo válido.',
    institution: 'La institución es obligatoria.',
  })
})

test('teacherStatusLabel distinguishes temporary passwords', () => {
  assert.equal(teacherStatusLabel({ mustChangePassword: true }), 'Contraseña temporal')
  assert.equal(teacherStatusLabel({ mustChangePassword: false }), 'Activo')
})

test('temporaryPasswordNotice is ready to paste', () => {
  assert.equal(
    temporaryPasswordNotice({ email: 'ana@colegio.edu.pe' }, 'Abc23456xy'),
    'Correo: ana@colegio.edu.pe\nContraseña temporal: Abc23456xy\nDeberá cambiarla al entrar.',
  )
})

test('teacherDisplayName tolerates a missing fullName', () => {
  assert.equal(teacherDisplayName({ fullName: 'Ana Pérez' }), 'Ana Pérez')
  assert.equal(teacherDisplayName({ fullName: null }), '—')
  assert.equal(teacherDisplayName({ fullName: '   ' }), '—')
  assert.equal(teacherDisplayName(undefined), '—')
})

test('teacherLabel prefers the full name and falls back to the email', () => {
  assert.equal(teacherLabel({ fullName: ' Ana QA Torres ', email: 'ana@x.pe' }), 'Ana QA Torres')
  assert.equal(teacherLabel({ fullName: null, email: 'ana@x.pe' }), 'ana@x.pe')
  assert.equal(teacherLabel(null), 'el docente')
})

test('passwordResetConfirmation names the teacher and warns about the open session', () => {
  const confirmation = passwordResetConfirmation({ fullName: 'Ana QA Torres', email: 'a@x.pe' })

  assert.equal(confirmation.header, 'Reiniciar la contraseña de Ana QA Torres')
  assert.equal(confirmation.acceptLabel, 'Reiniciar contraseña')
  assert.match(confirmation.message, /dejará de servir/)
})
