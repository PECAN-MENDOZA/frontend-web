import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDate, formatDateTime } from '../src/features/research/utils/dates.js'

test('formatDate and formatDateTime render es-PE dates and a dash for missing values', () => {
  const value = '2026-09-17T14:05:00Z'

  assert.match(formatDate(value), /2026/)
  assert.match(formatDateTime(value), /\d{2}:\d{2}/)
  assert.equal(formatDate(null), '—')
  assert.equal(formatDateTime('not a date'), '—')
})
