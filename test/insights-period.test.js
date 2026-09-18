import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PRESETS,
  formatRelative,
  periodErrors,
  periodLabel,
  periodQuery,
  presetRange,
  todayLima,
} from '../src/features/insights/utils/period.js'

test('PRESETS lists the four options with es-PE labels', () => {
  assert.deepEqual(
    PRESETS.map((preset) => preset.key),
    ['today', 'yesterday', 'week', 'custom'],
  )
  assert.equal(PRESETS.find((preset) => preset.key === 'week').label, 'Últimos 7 días')
})

test('todayLima converts UTC to the Lima calendar day (UTC-5)', () => {
  // 2026-09-17 23:30 en Lima = 2026-09-18 04:30Z: "hoy" es el 17.
  assert.equal(todayLima(new Date('2026-09-18T04:30:00Z')), '2026-09-17')
  assert.equal(todayLima(new Date('2026-09-17T12:00:00Z')), '2026-09-17')
})

test('presetRange resolves today, yesterday and the last 7 days from the Lima date', () => {
  const now = new Date('2026-09-17T20:00:00Z') // 15:00 en Lima, 2026-09-17

  assert.deepEqual(presetRange('today', now), { from: '2026-09-17', to: '2026-09-17' })
  assert.deepEqual(presetRange('yesterday', now), { from: '2026-09-16', to: '2026-09-16' })
  assert.deepEqual(presetRange('week', now), { from: '2026-09-11', to: '2026-09-17' })
  assert.deepEqual(presetRange('custom', now), { from: '2026-09-17', to: '2026-09-17' })
})

test('periodQuery builds the from/to query string', () => {
  assert.equal(periodQuery({ from: '2026-09-10', to: '2026-09-17' }), 'from=2026-09-10&to=2026-09-17')
})

test('periodLabel formats a single day and a range in es-PE', () => {
  assert.equal(periodLabel({ from: '2026-09-17', to: '2026-09-17' }), '17 de septiembre')
  assert.equal(
    periodLabel({ from: '2026-09-10', to: '2026-09-17' }),
    '10 – 17 de septiembre de 2026',
  )
  assert.equal(
    periodLabel({ from: '2026-08-20', to: '2026-09-05' }),
    '20 de agosto – 5 de septiembre de 2026',
  )
})

test('periodErrors flags an inverted range, one over 92 days, and accepts a valid one', () => {
  assert.equal(periodErrors({ from: '2026-09-10', to: '2026-09-17' }), '')
  assert.equal(
    periodErrors({ from: '2026-09-17', to: '2026-09-10' }),
    'La fecha final es anterior a la inicial.',
  )
  assert.equal(periodErrors({ from: '2026-01-01', to: '2026-06-30' }), 'Máximo 92 días.')
})

test('formatRelative renders minutes, hours, "ayer", an absolute date, and a dash for null', () => {
  const now = new Date('2026-09-17T20:00:00Z') // 15:00 en Lima, 2026-09-17

  assert.equal(formatRelative(new Date(now.getTime() - 12 * 60_000), now), 'hace 12 min')
  assert.equal(formatRelative(new Date(now.getTime() - 3 * 3_600_000), now), 'hace 3 h')
  assert.equal(formatRelative(new Date(now.getTime() - 24 * 3_600_000), now), 'ayer')
  assert.equal(formatRelative('2026-09-10T20:00:00Z', now), '10/09/2026')
  assert.equal(formatRelative(null, now), '—')
  assert.equal(formatRelative('not a date', now), '—')
})
