import test from 'node:test'
import assert from 'node:assert/strict'
import { captureFocusOrigin, resolveReturnFocus } from '../src/features/research/utils/focus.js'

function element({ isConnected = true, disabled = false } = {}) {
  return { isConnected, disabled, focus() {} }
}

test('captureFocusOrigin keeps the active element only when it is focusable', () => {
  const button = element()

  assert.equal(captureFocusOrigin({ activeElement: button, body: {} }), button)
  const body = {}

  assert.equal(captureFocusOrigin({ activeElement: body, body }), null)
  assert.equal(captureFocusOrigin({ activeElement: null, body }), null)
  assert.equal(captureFocusOrigin(undefined), null)
})

test('resolveReturnFocus returns the origin once it is connected and enabled again', () => {
  const origin = element()

  assert.equal(resolveReturnFocus(origin), origin)
})

test('resolveReturnFocus gives up on an origin that left the DOM or is still disabled', () => {
  assert.equal(resolveReturnFocus(element({ isConnected: false })), null)
  assert.equal(resolveReturnFocus(element({ disabled: true })), null)
  assert.equal(resolveReturnFocus(null), null)
  assert.equal(resolveReturnFocus(undefined), null)
})
