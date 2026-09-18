import test from 'node:test'
import assert from 'node:assert/strict'
import { mutationFeedback } from '../src/features/tests/utils/mutations.js'

test('mutationFeedback is a success when the action and its refresh both worked', () => {
  assert.deepEqual(mutationFeedback('Prueba activada.', undefined), {
    message: 'Prueba activada.',
    severity: 'success',
  })
  assert.deepEqual(mutationFeedback('Intento excluido.', { refreshOk: true }), {
    message: 'Intento excluido.',
    severity: 'success',
  })
})

test('mutationFeedback warns when the action worked but the refresh failed', () => {
  assert.deepEqual(mutationFeedback('Intento excluido.', { refreshOk: false }), {
    message: 'Intento excluido. No pudimos actualizar los datos. Usa Actualizar para reintentar.',
    severity: 'warn',
  })
})
