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
let useTestsStore

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
  ;({ useTestsStore } = await vite.ssrLoadModule('/src/features/tests/store/tests.store.js'))
})

test.after(async () => {
  await vite.close()
})

test.afterEach(() => {
  globalThis.fetch = undefined
  windowTarget.setInterval = nativeSetInterval
  windowTarget.clearInterval = nativeClearInterval
})

function store() {
  setActivePinia(createPinia())
  return useTestsStore()
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })
  return { promise, resolve, reject }
}

function detail(id, sentences = []) {
  return { id, code: id.toUpperCase(), title: `Prueba ${id}`, notes: '', status: 'DRAFT', sentences }
}

test('saveTest projects sentences to the exact PUT contract', async () => {
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options })
    return options.method === 'PUT'
      ? json(detail('a', [{ position: 1, kind: 'FREE', referenceText: 'Texto', assistance: 'ASSISTED' }]))
      : json(detail('a', [{ position: 1, kind: 'FREE', referenceText: 'Texto', assistance: 'ASSISTED' }]))
  }
  const testsStore = store()

  await testsStore.loadTest('a')
  assert.equal(await testsStore.saveTest('a'), true)

  const put = calls.find((call) => call.options.method === 'PUT')
  assert.deepEqual(JSON.parse(put.options.body).sentences, [
    { kind: 'FREE', referenceText: 'Texto', assistance: 'ASSISTED' },
  ])
})

test('a stale assignments response cannot replace another test or repopulate reset state', async () => {
  const requestA = deferred()
  const requestAfterReset = deferred()
  let aCalls = 0
  globalThis.fetch = (url) => {
    const pathname = new URL(url).pathname
    if (pathname.endsWith('/tests/a/assignments')) {
      aCalls += 1
      return aCalls === 1 ? requestA.promise : requestAfterReset.promise
    }
    return Promise.resolve(json([{ studentId: 'B', attemptStatus: 'PENDING', excluded: false }]))
  }
  const testsStore = store()

  const staleA = testsStore.loadAssignments('a')
  await testsStore.loadAssignments('b')
  requestA.resolve(json([{ studentId: 'A', attemptStatus: 'PENDING', excluded: false }]))
  await staleA
  assert.equal(testsStore.assignments[0].studentId, 'B')

  const staleAfterReset = testsStore.loadAssignments('a')
  windowTarget.dispatchEvent(new Event('auth:signed-out'))
  requestAfterReset.resolve(json([{ studentId: 'A2', attemptStatus: 'PENDING', excluded: false }]))
  await staleAfterReset
  assert.deepEqual(testsStore.assignments, [])
  assert.equal(testsStore.isLoading, false)
})

test('loading and mutation indicators remain active until overlapping operations finish', async () => {
  const list = deferred()
  const selected = deferred()
  const creates = [deferred(), deferred()]
  let createIndex = 0
  globalThis.fetch = (url, options) => {
    const pathname = new URL(url).pathname
    if (options.method === 'POST') return creates[createIndex++].promise
    if (pathname.endsWith('/tests/a')) return selected.promise
    return list.promise
  }
  const testsStore = store()

  const listLoad = testsStore.loadTests()
  const detailLoad = testsStore.loadTest('a')
  selected.resolve(json(detail('a')))
  await detailLoad
  assert.equal(testsStore.isLoading, true)
  list.resolve(json([]))
  await listLoad
  assert.equal(testsStore.isLoading, false)

  const firstCreate = testsStore.createTest({ code: 'AAA', title: 'A' })
  const secondCreate = testsStore.createTest({ code: 'BBB', title: 'B' })
  creates[0].resolve(json({ id: 'a', code: 'AAA', title: 'A' }, 201))
  await firstCreate
  assert.equal(testsStore.isMutating, true)
  creates[1].resolve(json({ id: 'b', code: 'BBB', title: 'B' }, 201))
  await secondCreate
  assert.equal(testsStore.isMutating, false)
})

test('polling never overlaps ticks and stops when no attempt remains in progress', async () => {
  const ticks = []
  const pollingRequests = []
  windowTarget.setInterval = (callback, delay) => {
    ticks.push({ callback, delay })
    return 7
  }
  windowTarget.clearInterval = () => {}
  let initial = true
  globalThis.fetch = () => {
    if (initial) {
      initial = false
      return Promise.resolve(
        json([{ studentId: 'A', attemptStatus: 'IN_PROGRESS', excluded: false }]),
      )
    }
    const request = deferred()
    pollingRequests.push(request)
    return request.promise
  }
  const testsStore = store()

  await testsStore.loadAssignments('a')
  testsStore.startAssignmentsPolling('a')
  assert.equal(ticks[0].delay, 5000)

  const firstTick = ticks[0].callback()
  const overlappingTick = ticks[0].callback()
  assert.equal(pollingRequests.length, 1)

  pollingRequests[0].resolve(json([]))
  await firstTick
  await overlappingTick
  assert.deepEqual(testsStore.assignments, [])
})

test('excludeAttempt keeps remote success when refreshing assignments fails', async () => {
  globalThis.fetch = async (url, options) => {
    if (options.method === 'POST') {
      return json({ attemptId: 'attempt-1', excludedAt: '2026-09-17T20:00:00Z', responses: [] })
    }
    return json({ message: 'refresh failed' }, 500)
  }
  const testsStore = store()

  assert.equal(await testsStore.excludeAttempt('a', 'attempt-1', 'Motivo suficiente'), true)
  assert.equal(testsStore.selectedAttempt.excludedAt, '2026-09-17T20:00:00Z')
  assert.match(testsStore.mutationMessage, /^Intento excluido\./)
  assert.doesNotMatch(testsStore.mutationMessage, /No pudimos excluir/)
  assert.match(testsStore.mutationMessage, /No pudimos actualizar/)
})

test('a late exclusion from test A cannot overwrite the selected attempt or assignments of B', async () => {
  const exclusionA = deferred()
  globalThis.fetch = (url, options) => {
    const pathname = new URL(url).pathname

    if (options.method === 'POST' && pathname.includes('/tests/a/attempts/attempt-a/exclude')) {
      return exclusionA.promise
    }
    if (pathname.endsWith('/tests/a')) return Promise.resolve(json(detail('a')))
    if (pathname.endsWith('/tests/b')) return Promise.resolve(json(detail('b')))
    if (pathname.endsWith('/tests/a/assignments')) {
      return Promise.resolve(
        json([{ studentId: 'student-a', attemptStatus: 'COMPLETED', excluded: false }]),
      )
    }
    if (pathname.endsWith('/tests/b/assignments')) {
      return Promise.resolve(
        json([{ studentId: 'student-b', attemptStatus: 'IN_PROGRESS', excluded: false }]),
      )
    }
    if (pathname.endsWith('/tests/b/attempts/attempt-b')) {
      return Promise.resolve(json({ attemptId: 'attempt-b', responses: [] }))
    }
    throw new Error(`Unexpected request: ${options.method} ${pathname}`)
  }
  const testsStore = store()

  await testsStore.loadTest('a')
  await testsStore.loadAssignments('a')
  const exclusion = testsStore.excludeAttempt('a', 'attempt-a', 'Motivo suficiente')

  await testsStore.loadTest('b')
  await testsStore.loadAssignments('b')
  await testsStore.loadAttempt('b', 'attempt-b')

  exclusionA.resolve(
    json({ attemptId: 'attempt-a', excludedAt: '2026-09-17T20:00:00Z', responses: [] }),
  )
  assert.equal(await exclusion, true, 'the remote exclusion still succeeded')
  assert.equal(testsStore.selectedTest.id, 'b')
  assert.equal(testsStore.selectedAttempt.attemptId, 'attempt-b')
  assert.equal(testsStore.assignments[0].studentId, 'student-b')
})

test('annotate keeps the updated row when refreshing loaded results fails', async () => {
  const annotated = {
    responseId: 'response-1',
    annotatedErrorCount: 3,
    effectiveErrorCount: 3,
    errorSource: 'ANNOTATED',
  }
  globalThis.fetch = async (url, options) => {
    if (options.method === 'PUT') return json(annotated)
    return json({ message: 'refresh failed' }, 500)
  }
  const testsStore = store()
  testsStore.selectedAttempt = { responses: [{ responseId: 'response-1', errorSource: 'PENDING' }] }
  testsStore.results = { testId: 'a' }

  assert.equal(await testsStore.annotate('response-1', 3), true)
  assert.deepEqual(testsStore.selectedAttempt.responses[0], annotated)
  assert.match(testsStore.mutationMessage, /^Anotación guardada\./)
  assert.doesNotMatch(testsStore.mutationMessage, /No pudimos guardar la anotación/)
  assert.match(testsStore.mutationMessage, /No pudimos actualizar/)
})
