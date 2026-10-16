import test from 'node:test'
import assert from 'node:assert/strict'
import {
  requestErrorMessage,
  translateBackendMessage,
} from '../src/features/research/utils/errors.js'

test('translateBackendMessage maps the sentence-test messages to Spanish', () => {
  const translations = {
    'Test not found': 'No encontramos la prueba.',
    'Test code already exists': 'Ese código ya existe.',
    'Test is not editable once activated': 'La prueba ya está activada.',
    'Test is not active': 'La prueba no está activa.',
    'Only an active test can be closed': 'Solo se puede cerrar una prueba activa.',
    'Another test is in progress': 'El estudiante tiene otra prueba en curso.',
    'Sentence out of order': 'La oración no es la siguiente.',
    'Annotation only applies to free sentences': 'Solo se anotan las oraciones libres.',
    'Attempt is not completed': 'El intento no está completado.',
    'Exclusion reason must have between 10 and 500 characters':
      'El motivo debe tener entre 10 y 500 caracteres.',
    'Email is already in use': 'Ese correo ya está en uso.',
    'Request validation failed': 'La solicitud no pasó la validación.',
  }

  for (const [message, expected] of Object.entries(translations)) {
    assert.equal(translateBackendMessage(message), expected, message)
  }
})

test('translateBackendMessage keeps the variable part of dynamic messages', () => {
  assert.equal(
    translateBackendMessage('Sentence out of order: expected 3'),
    'La oración no es la siguiente (se esperaba la 3).',
  )
  assert.equal(translateBackendMessage('Student not found: abc-1'), 'No encontramos al estudiante abc-1.')
})

test('translateBackendMessage returns unknown or empty messages untouched', () => {
  assert.equal(translateBackendMessage('Algo salió mal'), 'Algo salió mal')
  assert.equal(translateBackendMessage('  Test not found  '), 'No encontramos la prueba.')
  assert.equal(translateBackendMessage(''), '')
  assert.equal(translateBackendMessage(undefined), '')
})

test('requestErrorMessage lists the invalid fields when the response exposes them', () => {
  const fallback = 'No pudimos completar la acción.'
  const error = Object.assign(new Error('Request validation failed'), {
    status: 400,
    validationErrors: { title: 'must not be blank', sentences: 'size must be between 1 and 60' },
  })

  assert.equal(
    requestErrorMessage(error, fallback),
    'La solicitud no pasó la validación; revisa los campos Título, Oraciones.',
  )
  assert.equal(
    requestErrorMessage(
      Object.assign(new Error('Request validation failed'), { status: 400, validationErrors: {} }),
      fallback,
    ),
    'La solicitud no pasó la validación.',
  )
})

test('requestErrorMessage keeps the backend message and falls back when there is none', () => {
  const fallback = 'No pudimos completar la acción.'

  assert.equal(
    requestErrorMessage({ status: 409, message: 'Test is not active' }, fallback),
    'La prueba no está activa.',
  )
  assert.equal(requestErrorMessage({ status: 500, message: 'Unexpected failure' }, fallback), fallback)
  assert.equal(requestErrorMessage({ status: 400, message: '' }, fallback), fallback)
  assert.equal(requestErrorMessage(new TypeError('Failed to fetch'), fallback), fallback)
  assert.equal(requestErrorMessage(null, fallback), fallback)
})

test('requestErrorMessage never shows an untranslated backend message', () => {
  const fallback = 'No pudimos completar la acción.'

  assert.equal(
    requestErrorMessage({ status: 403, message: 'Some new English message' }, fallback),
    'No tienes acceso a esta información.',
  )
  assert.equal(
    requestErrorMessage({ status: 404, message: 'Whatever not found' }, fallback),
    'No encontramos lo que buscas.',
  )
  assert.equal(requestErrorMessage({ status: 409, message: 'Conflict' }, fallback), fallback)
})

test('translateBackendMessage covers the teacher panel messages', () => {
  assert.equal(
    translateBackendMessage('Teacher does not have access to this student'),
    'Este estudiante no está entre tus estudiantes.',
  )
  assert.equal(
    translateBackendMessage('Teacher does not have access to this classroom'),
    'No encontramos este salón.',
  )
  assert.equal(
    translateBackendMessage('Period must not exceed 92 days'),
    'El periodo no puede pasar de 92 días.',
  )
})

test('requestErrorMessage names fields in Spanish, without duplicates or unknown backend names', () => {
  const fallback = 'No pudimos completar la acción.'
  const validation = (validationErrors) =>
    Object.assign(new Error('Request validation failed'), { status: 400, validationErrors })

  assert.equal(
    requestErrorMessage(validation({ fullName: 'x', email: 'y' }), fallback),
    'La solicitud no pasó la validación; revisa los campos Nombre, Correo.',
  )
  assert.equal(
    requestErrorMessage(validation({ name: 'x' }), fallback),
    'La solicitud no pasó la validación; revisa el campo Nombre del salón.',
  )
  assert.equal(
    requestErrorMessage(validation({ 'sentences[0].text': 'x', 'sentences[1].text': 'y' }), fallback),
    'La solicitud no pasó la validación; revisa el campo Oraciones.',
  )
  assert.equal(
    requestErrorMessage(validation({ someInternalField: 'x' }), fallback),
    'La solicitud no pasó la validación.',
  )
})
