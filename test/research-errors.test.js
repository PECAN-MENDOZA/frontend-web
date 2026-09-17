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
    'Another test is in progress': 'El alumno tiene otra prueba en curso.',
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
  assert.equal(translateBackendMessage('Student not found: abc-1'), 'No encontramos al alumno abc-1.')
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
    'La solicitud no pasó la validación; revisa los campos: title, sentences.',
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
  assert.equal(
    requestErrorMessage({ status: 500, message: 'Unexpected failure' }, fallback),
    'Unexpected failure',
  )
  assert.equal(requestErrorMessage({ status: 400, message: '' }, fallback), fallback)
  assert.equal(requestErrorMessage(new TypeError('Failed to fetch'), fallback), fallback)
  assert.equal(requestErrorMessage(null, fallback), fallback)
})
