import test from 'node:test'
import assert from 'node:assert/strict'
import { canAccessRoute, homeForRole } from '../src/features/auth/utils/access.js'

test('maps each staff role to its own workspace', () => {
  assert.equal(homeForRole('TEACHER'), '/dashboard')
  assert.equal(homeForRole('RESEARCHER'), '/research')
})

test('rejects a role outside route metadata', () => {
  assert.equal(canAccessRoute('TEACHER', ['RESEARCHER']), false)
  assert.equal(canAccessRoute('RESEARCHER', ['RESEARCHER']), true)
})
