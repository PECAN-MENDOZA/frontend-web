import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const nativeSetInterval = globalThis.setInterval
const nativeClearInterval = globalThis.clearInterval
const windowTarget = new EventTarget()
const storage = new Map()
let vite
let useInsightsStore

windowTarget.setInterval = nativeSetInterval
windowTarget.clearInterval = nativeClearInterval
globalThis.window = windowTarget
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
}

test.before(async () => {
  vite = await createServer({
    configFile: false,
    root: projectRoot,
    logLevel: 'silent',
    appType: 'custom',
    server: { middlewareMode: true },
    resolve: { alias: { '@': path.join(projectRoot, 'src') } },
  })
  ;({ useInsightsStore } = await vite.ssrLoadModule('/src/features/insights/store/insights.store.js'))
})

test.after(async () => {
  await vite.close()
})

test.afterEach(() => {
  globalThis.fetch = undefined
  storage.clear()
})

function store() {
  setActivePinia(createPinia())
  return useInsightsStore()
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const classrooms = [
  { id: 'room-a', name: 'Salón A', archivedAt: null },
  { id: 'room-b', name: 'Salón B', archivedAt: null },
]

function routeFetch(routes) {
  return async (url) => {
    const { pathname } = new URL(url)
    for (const [suffix, body] of routes) {
      if (pathname.endsWith(suffix)) return json(body)
    }
    throw new Error(`Unexpected request: ${pathname}`)
  }
}

test('classroomLoadedFor keeps the loaded classroom/period after the selection changes', async () => {
  globalThis.fetch = routeFetch([
    ['/teachers/classrooms', classrooms],
    ['/activity', { classroomId: 'room-a', classroomName: 'Salón A', students: [] }],
    ['/corrections/recent', []],
    ['/errors', { types: [] }],
  ])
  const insightsStore = store()
  insightsStore.setPeriod({ from: '2026-09-10', to: '2026-09-10', preset: 'custom' })

  await insightsStore.loadClassroomToday()

  assert.deepEqual(insightsStore.classroomLoadedFor, {
    classroomId: 'room-a',
    from: '2026-09-10',
    to: '2026-09-10',
  })

  // El docente cambia de salón y de periodo, pero no vuelve a pulsar Actualizar: loadedFor debe
  // seguir describiendo los datos que de verdad están en pantalla.
  insightsStore.selectClassroom('room-b')
  insightsStore.setPeriod({ from: '2026-09-11', to: '2026-09-11', preset: 'custom' })

  assert.deepEqual(insightsStore.classroomLoadedFor, {
    classroomId: 'room-a',
    from: '2026-09-10',
    to: '2026-09-10',
  })
  assert.notEqual(insightsStore.classroomLoadedFor.classroomId, insightsStore.selectedClassroomId)
})

test('studentLoadedFor records the student/period of the last successful load', async () => {
  globalThis.fetch = routeFetch([
    ['/errors', { types: [], practiceWords: [] }],
    ['/help', { total: 0, edited: 0, accepted: 0, rejected: 0, undone: 0, unanswered: 0 }],
    ['/writings', []],
    ['/tests', []],
  ])
  const insightsStore = store()
  insightsStore.setPeriod({ from: '2026-09-10', to: '2026-09-10', preset: 'custom' })

  await insightsStore.loadStudentToday('student-1')

  assert.deepEqual(insightsStore.studentLoadedFor, {
    studentId: 'student-1',
    from: '2026-09-10',
    to: '2026-09-10',
  })

  insightsStore.setPeriod({ from: '2026-09-11', to: '2026-09-11', preset: 'custom' })

  assert.deepEqual(insightsStore.studentLoadedFor, {
    studentId: 'student-1',
    from: '2026-09-10',
    to: '2026-09-10',
  })
})

test('reset() clears loadedFor bookkeeping along with the data it describes', async () => {
  globalThis.fetch = routeFetch([
    ['/teachers/classrooms', classrooms],
    ['/activity', { classroomId: 'room-a', classroomName: 'Salón A', students: [] }],
    ['/corrections/recent', []],
    ['/errors', { types: [] }],
  ])
  const insightsStore = store()
  await insightsStore.loadClassroomToday()
  assert.ok(insightsStore.classroomLoadedFor)

  insightsStore.reset()

  assert.equal(insightsStore.classroomLoadedFor, null)
  assert.equal(insightsStore.studentLoadedFor, null)
})

test('a corrupted persisted period falls back to the default (today)', () => {
  storage.set('insights_period', JSON.stringify({ from: 'not-a-date', preset: 'today' }))
  const insightsStore = store()

  assert.equal(insightsStore.period.preset, 'today')
  assert.equal(insightsStore.period.from, insightsStore.period.to)
  assert.match(insightsStore.period.from, /^\d{4}-\d{2}-\d{2}$/)
})

test('a persisted period with an unknown preset falls back to the default', () => {
  storage.set(
    'insights_period',
    JSON.stringify({ from: '2026-01-01', to: '2026-01-02', preset: 'month' }),
  )
  const insightsStore = store()

  assert.equal(insightsStore.period.preset, 'today')
})

test('a valid persisted custom period is kept as-is', () => {
  storage.set(
    'insights_period',
    JSON.stringify({ from: '2026-01-01', to: '2026-01-05', preset: 'custom' }),
  )
  const insightsStore = store()

  assert.deepEqual(insightsStore.period, { from: '2026-01-01', to: '2026-01-05', preset: 'custom' })
})
