import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessRoute,
  changePasswordErrorMessage,
  homeForRole,
  nextRouteAfterPasswordChange,
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

test('requiresPasswordChange only applies to teachers', () => {
  assert.equal(
    requiresPasswordChange({ role: 'RESEARCHER', mustChangePassword: true }, 'research-tests'),
    false,
  )
  assert.equal(requiresPasswordChange({ mustChangePassword: true }, 'dashboard'), false)
})

test('nextRouteAfterPasswordChange keeps an internal redirect and falls back to the home', () => {
  assert.equal(nextRouteAfterPasswordChange('/students/7?tab=tests', 'TEACHER'), '/students/7?tab=tests')
  assert.equal(nextRouteAfterPasswordChange(undefined, 'TEACHER'), '/dashboard')
  assert.equal(nextRouteAfterPasswordChange('', 'TEACHER'), '/dashboard')
  assert.equal(nextRouteAfterPasswordChange(['/a', '/b'], 'TEACHER'), '/dashboard')
})

test('nextRouteAfterPasswordChange rejects external URLs and the change-password page itself', () => {
  assert.equal(nextRouteAfterPasswordChange('https://evil.example', 'TEACHER'), '/dashboard')
  assert.equal(nextRouteAfterPasswordChange('//evil.example', 'TEACHER'), '/dashboard')
  assert.equal(nextRouteAfterPasswordChange('/change-password', 'TEACHER'), '/dashboard')
  assert.equal(nextRouteAfterPasswordChange('/change-password?redirect=/x', 'RESEARCHER'), '/research')
})
