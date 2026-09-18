import test from 'node:test'
import assert from 'node:assert/strict'
import { createMountGuard } from '../src/features/insights/utils/mountGuard.js'

test('createMountGuard starts mounted and flips to unmounted once', () => {
  const guard = createMountGuard()
  assert.equal(guard.mounted, true)

  guard.unmount()
  assert.equal(guard.mounted, false)

  // Idempotente: un segundo unmount (p. ej. HMR o un efecto que se dispara dos veces) no revive
  // el guard ni lanza.
  guard.unmount()
  assert.equal(guard.mounted, false)
})

test('two guards are independent (one per component instance)', () => {
  const first = createMountGuard()
  const second = createMountGuard()

  first.unmount()

  assert.equal(first.mounted, false)
  assert.equal(second.mounted, true)
})
