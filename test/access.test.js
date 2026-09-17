import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessRoute,
  changePasswordErrorMessage,
  homeForRole,
  requiresPasswordChange,
} from '../src/features/auth/utils/access.js'

test('maps each staff role to its own workspace', () => {
  assert.equal(homeForRole('TEACHER'), '/dashboard')
  assert.equal(homeForRole('RESEARCHER'), '/research')
})

test('rejects a role outside route metadata', () => {
  assert.equal(canAccessRoute('TEACHER', ['RESEARCHER']), false)
  assert.equal(canAccessRoute('RESEARCHER', ['RESEARCHER']), true)
})

test('a teacher with a temporary password is sent to change-password everywhere else', () => {
  const user = { role: 'TEACHER', mustChangePassword: true }
  assert.equal(requiresPasswordChange(user, 'dashboard'), true)
  assert.equal(requiresPasswordChange(user, 'change-password'), false)
})

test('researchers and teachers with their own password are not redirected', () => {
  assert.equal(requiresPasswordChange({ role: 'RESEARCHER', mustChangePassword: false }, 'research-overview'), false)
  assert.equal(requiresPasswordChange({ role: 'TEACHER', mustChangePassword: false }, 'dashboard'), false)
  assert.equal(requiresPasswordChange(null, 'dashboard'), false)
})

test('changePasswordErrorMessage maps a 401 to a wrong-current-password message', () => {
  assert.equal(changePasswordErrorMessage(401), 'La contraseña actual no es correcta.')
})

test('changePasswordErrorMessage maps a 400 to a same-password message', () => {
  assert.equal(
    changePasswordErrorMessage(400),
    'La contraseña nueva debe ser distinta de la actual.',
  )
})

test('changePasswordErrorMessage falls back to a generic message for any other status', () => {
  assert.equal(
    changePasswordErrorMessage(500),
    'No pudimos cambiar la contraseña. Inténtalo nuevamente.',
  )
  assert.equal(
    changePasswordErrorMessage(undefined),
    'No pudimos cambiar la contraseña. Inténtalo nuevamente.',
  )
})
