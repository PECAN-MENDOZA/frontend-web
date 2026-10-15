import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessRoute,
  changePasswordErrorMessage,
  changePasswordFormError,
  displayNameFor,
  homeForRole,
  loginErrorMessage,
  nextRouteAfterPasswordChange,
  normalizeEmail,
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

test('changePasswordErrorMessage tells the same-password 400 apart from the validation 400', () => {
  assert.equal(
    changePasswordErrorMessage(400, 'New password must be different'),
    'La contraseña nueva debe ser distinta de la actual.',
  )
  assert.equal(
    changePasswordErrorMessage(400, 'Request validation failed'),
    'La contraseña debe tener entre 8 y 72 caracteres.',
  )
  assert.equal(changePasswordErrorMessage(400), 'La contraseña debe tener entre 8 y 72 caracteres.')
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

test('changePasswordFormError validates the current password, 8 to 72 characters and the match', () => {
  const valid = { currentPassword: 'vieja', newPassword: 'nueva-123', confirmPassword: 'nueva-123' }

  assert.equal(changePasswordFormError(valid), '')
  assert.equal(
    changePasswordFormError({ ...valid, currentPassword: '' }),
    'Escribe tu contraseña actual.',
  )
  assert.equal(
    changePasswordFormError({ ...valid, newPassword: 'corta', confirmPassword: 'corta' }),
    'La contraseña debe tener entre 8 y 72 caracteres.',
  )
  const long = 'x'.repeat(73)
  assert.equal(
    changePasswordFormError({ ...valid, newPassword: long, confirmPassword: long }),
    'La contraseña debe tener entre 8 y 72 caracteres.',
  )
  const max = 'x'.repeat(72)
  assert.equal(changePasswordFormError({ ...valid, newPassword: max, confirmPassword: max }), '')
  assert.equal(
    changePasswordFormError({ ...valid, confirmPassword: 'otra-cosa' }),
    'Las contraseñas no coinciden.',
  )
})

test('loginErrorMessage explains the lockout on 429 and stays generic otherwise', () => {
  assert.equal(
    loginErrorMessage(429),
    'Demasiados intentos. Espera 15 minutos o pide al administrador que reinicie tu contraseña.',
  )
  assert.equal(
    loginErrorMessage(401),
    'No pudimos iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.',
  )
  assert.equal(
    loginErrorMessage(undefined),
    'No pudimos iniciar sesión. Verifica tus credenciales e inténtalo nuevamente.',
  )
})

test('normalizeEmail trims and lowercases', () => {
  assert.equal(normalizeEmail('  ANA.QA@Colegio.edu.pe '), 'ana.qa@colegio.edu.pe')
  assert.equal(normalizeEmail(undefined), '')
})

test('displayNameFor uses the login displayName and falls back to the email', () => {
  assert.equal(displayNameFor('Ana QA Torres', 'ana.qa@colegio.edu.pe'), 'Ana QA Torres')
  assert.equal(displayNameFor(null, 'ana.qa@colegio.edu.pe'), 'Ana Qa')
  assert.equal(displayNameFor('   ', 'investigador@tesis.pe'), 'Investigador')
})

test('the change-password route is open to researchers without forcing them there', () => {
  assert.equal(canAccessRoute('RESEARCHER', ['TEACHER', 'RESEARCHER']), true)
  assert.equal(
    requiresPasswordChange({ role: 'RESEARCHER', mustChangePassword: false }, 'research-teachers'),
    false,
  )
})
