import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isMissingResource,
  isPasswordChangeRequired,
  statusMessage,
} from '../src/shared/utils/http.js'
import {
  deactivateConfirmation,
  pinResetConfirmation,
  reactivateConfirmation,
} from '../src/features/students/utils/students.js'

test('isPasswordChangeRequired only matches the 403 of TemporaryPasswordFilter', () => {
  assert.equal(isPasswordChangeRequired(403, 'Password change required'), true)
  assert.equal(isPasswordChangeRequired(403, ' Password change required '), true)
  assert.equal(isPasswordChangeRequired(403, 'Teacher does not have access to this student'), false)
  assert.equal(isPasswordChangeRequired(401, 'Password change required'), false)
  assert.equal(isPasswordChangeRequired(403, undefined), false)
})

test('isMissingResource treats 403 and 404 as "not yours or does not exist"', () => {
  assert.equal(isMissingResource({ status: 403 }), true)
  assert.equal(isMissingResource({ status: 404 }), true)
  assert.equal(isMissingResource({ status: 400 }), false)
  assert.equal(isMissingResource({ status: 500 }), false)
  assert.equal(isMissingResource(new TypeError('Failed to fetch')), false)
  assert.equal(isMissingResource(null), false)
})

test('statusMessage gives Spanish text for 403, 404 and 429 and the fallback otherwise', () => {
  assert.equal(statusMessage(403, 'x'), 'No tienes acceso a esta información.')
  assert.equal(statusMessage(404, 'x'), 'No encontramos lo que buscas.')
  assert.match(statusMessage(429, 'x'), /^Demasiados intentos/)
  assert.equal(statusMessage(500, 'x'), 'x')
})

test('deactivateConfirmation uses the agreed text with the alias', () => {
  const confirmation = deactivateConfirmation('Mateo QA Quispe', 'luna-85')

  assert.equal(confirmation.header, 'Dar de baja a Mateo QA Quispe')
  assert.equal(
    confirmation.message,
    '«luna-85» ya no podrá entrar al teclado y dejará de aparecer en tus listas. Sus datos no se borran y puedes reactivarlo después.',
  )
  assert.equal(confirmation.acceptLabel, 'Dar de baja')
})

test('student confirmations fall back to the alias when there is no real name', () => {
  assert.equal(pinResetConfirmation('', 'tren-40').header, 'Reiniciar el PIN de tren-40')
  assert.equal(reactivateConfirmation(null, 'tren-40').header, 'Reactivar a tren-40')
  assert.match(pinResetConfirmation('', 'tren-40').message, /«tren-40»/)
})
