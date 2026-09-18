import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RESULTS_NOT_UPDATED_MESSAGE,
  RESULTS_UPDATED_MESSAGE,
  createGuardedLoader,
  createPendingCounter,
  refreshOutcomeMessage,
} from '../src/features/research/utils/mutations.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })

  return { promise, resolve, reject }
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

// ------------------------------------------------------------------ createPendingCounter

test('createPendingCounter stays pending until every overlapping operation finishes', async () => {
  const changes = []
  const counter = createPendingCounter((pending) => changes.push(pending))
  const first = deferred()
  const second = deferred()

  const firstOperation = counter.track(() => first.promise)
  const secondOperation = counter.track(() => second.promise)

  assert.equal(counter.isPending(), true)
  assert.equal(counter.pending, 2)

  first.resolve('one')
  await firstOperation
  assert.equal(counter.isPending(), true, 'the second operation is still running')

  second.resolve('two')
  await secondOperation
  assert.equal(counter.isPending(), false)
  assert.deepEqual(changes, [1, 2, 1, 0])
})

test('createPendingCounter releases the operation even when it throws', async () => {
  const counter = createPendingCounter()

  await assert.rejects(
    counter.track(async () => {
      throw new Error('boom')
    }),
    /boom/,
  )

  assert.equal(counter.isPending(), false)
  assert.equal(await counter.track(async () => 'value'), 'value')
})

// ------------------------------------------------------------------ createGuardedLoader

function fakeState() {
  return { data: null, loading: [], error: '' }
}

function loaderFor(state, getSelectedStudyId) {
  return createGuardedLoader({
    getSelectedStudyId,
    setLoading: (isLoading) => state.loading.push(isLoading),
    setError: (message) => {
      state.error = message
    },
  })
}

test('createGuardedLoader publishes the response and reports ok', async () => {
  const state = fakeState()
  const loader = loaderFor(state)

  const outcome = await loader.load({
    request: async () => ['A'],
    apply: (data) => {
      state.data = data
    },
  })

  assert.deepEqual(outcome, { ok: true })
  assert.deepEqual(state.data, ['A'])
  assert.deepEqual(state.loading, [true, false])
  assert.equal(state.error, '')
})

test('createGuardedLoader keeps the error of the latest request and reports a failure', async () => {
  const state = fakeState()
  const loader = loaderFor(state)

  const outcome = await loader.load({
    request: async () => {
      throw Object.assign(new Error('Test not found'), { status: 404 })
    },
    apply: (data) => {
      state.data = data
    },
    fallback: 'Fallo genérico',
  })

  assert.deepEqual(outcome, { ok: false })
  assert.equal(state.data, null)
  assert.equal(state.error, 'No encontramos la prueba.')
  assert.deepEqual(state.loading, [true, false])

  const withoutStatus = await loader.load({
    request: async () => {
      throw new TypeError('Failed to fetch')
    },
    fallback: 'Fallo genérico',
  })

  assert.deepEqual(withoutStatus, { ok: false })
  assert.equal(state.error, 'Fallo genérico')
})

test('createGuardedLoader discards a stale response and lets only the latest release loading', async () => {
  const state = fakeState()
  const loader = loaderFor(state)
  const first = deferred()
  const second = deferred()

  const firstLoad = loader.load({
    request: () => first.promise,
    apply: (data) => {
      state.data = data
    },
  })
  const secondLoad = loader.load({
    request: () => second.promise,
    apply: (data) => {
      state.data = data
    },
  })

  second.resolve('second')
  assert.deepEqual(await secondLoad, { ok: true })
  assert.equal(state.data, 'second')
  assert.deepEqual(state.loading, [true, true, false])

  first.resolve('first')
  assert.deepEqual(await firstLoad, { ok: false })
  assert.equal(state.data, 'second', 'the stale response is not applied')
  assert.deepEqual(state.loading, [true, true, false], 'the stale request does not touch loading')

  // The reverse order: the first request resolves first, the second still owns loading.
  const third = deferred()
  const fourth = deferred()
  const thirdLoad = loader.load({ request: () => third.promise })
  const fourthLoad = loader.load({ request: () => fourth.promise })

  third.resolve('third')
  await thirdLoad
  assert.equal(state.loading.at(-1), true, 'loading stays on until the latest request resolves')

  fourth.resolve('fourth')
  await fourthLoad
  assert.equal(state.loading.at(-1), false)
})

test('createGuardedLoader ignores errors and data of a request whose selection changed', async () => {
  const state = fakeState()
  let selectedTestId = 'A'
  const loader = loaderFor(state, () => selectedTestId)
  const request = deferred()

  const load = loader.load({
    studyId: 'A',
    request: () => request.promise,
    apply: (data) => {
      state.data = data
    },
  })

  selectedTestId = 'B'
  request.reject(Object.assign(new Error('Test not found'), { status: 404 }))

  assert.deepEqual(await load, { ok: false })
  assert.equal(state.error, '', 'the error belongs to another selection')
  assert.equal(state.data, null)
  assert.deepEqual(state.loading, [true, false], 'the latest request still releases loading')
})

test('createGuardedLoader.invalidate makes an in-flight request stale and releases loading', async () => {
  const state = fakeState()
  const loader = loaderFor(state)
  const request = deferred()

  const load = loader.load({
    request: () => request.promise,
    apply: (data) => {
      state.data = data
    },
  })

  state.data = ['new-test']
  loader.invalidate()
  assert.equal(state.loading.at(-1), false)

  request.resolve(['old-list'])
  assert.deepEqual(await load, { ok: false })
  assert.deepEqual(state.data, ['new-test'], 'the stale list does not remove the new test')
})

// Composition mirrored from the tests store: a list load that starts a detail load, two flags
// and a computed "either" — the finally of the list must never switch off a newer detail load.
function testLoaders() {
  const state = {
    tests: [],
    selectedTestId: null,
    detail: null,
    isLoadingTests: false,
    isLoadingDetail: false,
    requests: {},
  }
  const testsLoader = createGuardedLoader({
    setLoading: (isLoading) => {
      state.isLoadingTests = isLoading
    },
  })
  const detailLoader = createGuardedLoader({
    getSelectedStudyId: () => state.selectedTestId,
    setLoading: (isLoading) => {
      state.isLoadingDetail = isLoading
    },
  })

  function detailRequest(testId) {
    const request = deferred()

    state.requests[testId] = request

    return request.promise
  }

  function loadDetail(testId) {
    return detailLoader.load({
      studyId: testId,
      request: () => detailRequest(testId),
      apply: (data) => {
        state.detail = data
      },
    })
  }

  function selectTest(testId) {
    state.selectedTestId = testId
    state.detail = null

    return loadDetail(testId)
  }

  function loadTests(listTests) {
    return testsLoader.load({
      request: listTests,
      apply: async (tests) => {
        state.tests = tests
        state.selectedTestId = tests[0]?.id ?? null

        if (state.selectedTestId) await loadDetail(state.selectedTestId)
      },
    })
  }

  return {
    state,
    testsLoader,
    loadTests,
    selectTest,
    isLoading: () => state.isLoadingTests || state.isLoadingDetail,
  }
}

test('detail A started from loadTests cannot switch off the loading owned by detail B', async () => {
  const { state, loadTests, selectTest, isLoading } = testLoaders()

  const testsLoad = loadTests(async () => [{ id: 'A' }, { id: 'B' }])

  await flush()
  assert.equal(state.selectedTestId, 'A')
  assert.ok(state.requests.A, 'detail A is in flight')

  const detailB = selectTest('B')

  assert.equal(isLoading(), true)

  state.requests.A.resolve({ test: 'A' })
  await testsLoad
  assert.equal(state.isLoadingTests, false, 'the list load finished')
  assert.equal(isLoading(), true, 'detail B is still pending')
  assert.equal(state.detail, null, 'detail A is stale and not applied')

  state.requests.B.resolve({ test: 'B' })
  await detailB
  assert.equal(isLoading(), false)
  assert.deepEqual(state.detail, { test: 'B' })
})

test('a stale list GET resolving after createTest does not remove the new test', async () => {
  const { state, testsLoader, loadTests } = testLoaders()
  const list = deferred()

  const refresh = loadTests(() => list.promise)

  assert.equal(state.isLoadingTests, true)

  // createTest: the POST resolved, the new test is inserted and in-flight lists are invalid.
  testsLoader.invalidate()
  state.tests = [{ id: 'NEW' }, ...state.tests]
  assert.equal(state.isLoadingTests, false)

  list.resolve([{ id: 'A' }])
  assert.deepEqual(await refresh, { ok: false })
  assert.deepEqual(state.tests, [{ id: 'NEW' }])
})

// ------------------------------------------------------------------ refreshOutcomeMessage

test('refreshOutcomeMessage claims the update only when every refresh succeeded', () => {
  const ok = refreshOutcomeMessage({ ok: true }, { detail: 'Docente creado.' })

  assert.deepEqual(ok, { detail: `Docente creado. ${RESULTS_UPDATED_MESSAGE}`, warning: '' })

  const failed = refreshOutcomeMessage({ ok: false }, { detail: 'Docente creado.' })

  assert.deepEqual(failed, { detail: 'Docente creado.', warning: RESULTS_NOT_UPDATED_MESSAGE })
})

test('refreshOutcomeMessage treats a missing outcome as a failure and accepts custom copy', () => {
  const missing = refreshOutcomeMessage(undefined, { detail: '' })

  assert.deepEqual(missing, { detail: '', warning: RESULTS_NOT_UPDATED_MESSAGE })
  assert.equal(
    refreshOutcomeMessage({ ok: false }, { failed: 'No se pudo actualizar la lista' }).warning,
    'No se pudo actualizar la lista',
  )
})
