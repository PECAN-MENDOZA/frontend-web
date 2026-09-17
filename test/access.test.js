import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canAccessRoute,
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
