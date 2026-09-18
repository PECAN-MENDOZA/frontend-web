import test from 'node:test'
import assert from 'node:assert/strict'
import {
  teacherDisplayName,
  teacherFormErrors,
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
    'Usuario: ana@colegio.edu.pe\nContraseña temporal: Abc23456xy\nDeberá cambiarla al entrar.',
  )
})

test('teacherDisplayName tolerates a missing fullName', () => {
  assert.equal(teacherDisplayName({ fullName: 'Ana Pérez' }), 'Ana Pérez')
  assert.equal(teacherDisplayName({ fullName: null }), '—')
  assert.equal(teacherDisplayName({ fullName: '   ' }), '—')
  assert.equal(teacherDisplayName(undefined), '—')
})
