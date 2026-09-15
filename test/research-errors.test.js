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
