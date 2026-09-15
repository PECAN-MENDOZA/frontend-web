import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STUDY_CHANGED_MESSAGE,
  StudyChangedError,
  createGuardedLoader,
  createPendingCounter,
  createRequestGuard,
  issueThenRefresh,
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

test('issueThenRefresh hands the credential over before the refresh resolves', async () => {
  const refresh = deferred()
  const events = []
  const credential = { code: 'K7MP2XQ9', pseudonym: 'P-001' }

  const operation = issueThenRefresh(
    async () => credential,
    () => {
      events.push('refresh-start')
      return refresh.promise
    },
    (delivered) => events.push(`credential:${delivered.code}`),
  )

  await flush()
  assert.deepEqual(events, ['credential:K7MP2XQ9', 'refresh-start'])

  let settled = false
  operation.then(() => {
    settled = true
  })
  await flush()
  assert.equal(settled, false, 'the operation waits for the refresh')

  refresh.resolve()
  await operation
  assert.equal(settled, true)
})

test('issueThenRefresh does not deliver anything when the issue request fails', async () => {
  let delivered = 0
  let refreshed = 0

  await assert.rejects(
    issueThenRefresh(
      async () => {
        throw new Error('Study is not active')
      },
      async () => {
        refreshed += 1
      },
      () => {
        delivered += 1
      },
    ),
    /Study is not active/,
  )

  assert.equal(delivered, 0)
  assert.equal(refreshed, 0)
})

test('issueThenRefresh still delivers the credential when the refresh fails', async () => {
  let delivered = null

  await assert.rejects(
    issueThenRefresh(
      async () => ({ code: 'ABCD1234' }),
      async () => {
        throw new StudyChangedError()
      },
      (credential) => {
        delivered = credential
      },
    ),
    (error) => error instanceof StudyChangedError && error.message === STUDY_CHANGED_MESSAGE,
  )

  assert.deepEqual(delivered, { code: 'ABCD1234' })
})

test('createRequestGuard ignores the response of study A when it resolves after B', () => {
  let selectedStudyId = 'A'
  const guard = createRequestGuard(() => selectedStudyId)

  const generationA = guard.begin('A')
  selectedStudyId = 'B'
  const generationB = guard.begin('B')

  // B resolves first and is applied.
  assert.equal(guard.isCurrent(generationB, 'B'), true)
  assert.equal(guard.isLatest(generationB), true)

  // A resolves last: neither its data nor its loading state may be applied.
  assert.equal(guard.isCurrent(generationA, 'A'), false)
  assert.equal(guard.isLatest(generationA), false)
})

test('createRequestGuard rejects a latest generation whose study is no longer selected', () => {
  let selectedStudyId = 'A'
  const guard = createRequestGuard(() => selectedStudyId)
  const generation = guard.begin('A')

  selectedStudyId = null

  assert.equal(guard.isCurrent(generation, 'A'), false)
  assert.equal(guard.isLatest(generation), true, 'the latest request may still release loading')
})

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
      throw Object.assign(new Error('Study not found'), { status: 404 })
    },
    apply: (data) => {
      state.data = data
    },
    fallback: 'Fallo genérico',
  })

  assert.deepEqual(outcome, { ok: false })
  assert.equal(state.data, null)
  assert.equal(state.error, 'No encontramos el estudio.')
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

test('createGuardedLoader ignores errors and data of a request whose study is no longer selected', async () => {
  const state = fakeState()
  let selectedStudyId = 'A'
  const loader = loaderFor(state, () => selectedStudyId)
  const request = deferred()

  const load = loader.load({
    studyId: 'A',
    request: () => request.promise,
    apply: (data) => {
      state.data = data
    },
  })

  selectedStudyId = 'B'
  request.reject(Object.assign(new Error('Study not found'), { status: 404 }))

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

  state.data = ['new-study']
  loader.invalidate()
  assert.equal(state.loading.at(-1), false)

  request.resolve(['old-list'])
  assert.deepEqual(await load, { ok: false })
  assert.deepEqual(state.data, ['new-study'], 'the stale list does not remove the new study')
})

// Composition mirrored from the store: a list load that starts an overview load, two flags
// and a computed "either" — the finally of the list must never switch off a newer overview.
function studyLoaders() {
  const state = {
    studies: [],
    selectedStudyId: null,
    overview: null,
    isLoadingStudies: false,
    isLoadingOverview: false,
    requests: {},
  }
  const studiesLoader = createGuardedLoader({
    setLoading: (isLoading) => {
      state.isLoadingStudies = isLoading
    },
  })
  const overviewLoader = createGuardedLoader({
    getSelectedStudyId: () => state.selectedStudyId,
    setLoading: (isLoading) => {
      state.isLoadingOverview = isLoading
    },
  })

  function overviewRequest(studyId) {
    const request = deferred()

    state.requests[studyId] = request

    return request.promise
  }

  function loadOverview(studyId) {
    return overviewLoader.load({
      studyId,
      request: () => overviewRequest(studyId),
      apply: (data) => {
        state.overview = data
      },
    })
  }

  function selectStudy(studyId) {
    state.selectedStudyId = studyId
    state.overview = null

    return loadOverview(studyId)
  }

  function loadStudies(listStudies) {
    return studiesLoader.load({
      request: listStudies,
      apply: async (studies) => {
        state.studies = studies
        state.selectedStudyId = studies[0]?.id ?? null

        if (state.selectedStudyId) await loadOverview(state.selectedStudyId)
      },
    })
  }

  return {
    state,
    studiesLoader,
    loadStudies,
    selectStudy,
    isLoading: () => state.isLoadingStudies || state.isLoadingOverview,
  }
}

test('overview A started from loadStudies cannot switch off the loading owned by overview B', async () => {
  const { state, loadStudies, selectStudy, isLoading } = studyLoaders()

  const studiesLoad = loadStudies(async () => [{ id: 'A' }, { id: 'B' }])

  await flush()
  assert.equal(state.selectedStudyId, 'A')
  assert.ok(state.requests.A, 'overview A is in flight')

  const overviewB = selectStudy('B')

  assert.equal(isLoading(), true)

  state.requests.A.resolve({ study: 'A' })
  await studiesLoad
  assert.equal(state.isLoadingStudies, false, 'the list load finished')
  assert.equal(isLoading(), true, 'overview B is still pending')
  assert.equal(state.overview, null, 'overview A is stale and not applied')

  state.requests.B.resolve({ study: 'B' })
  await overviewB
  assert.equal(isLoading(), false)
  assert.deepEqual(state.overview, { study: 'B' })
})

test('a stale studies GET resolving after addStudy does not remove the new study', async () => {
  const { state, studiesLoader, loadStudies } = studyLoaders()
  const list = deferred()

  const refresh = loadStudies(() => list.promise)

  assert.equal(state.isLoadingStudies, true)

  // addStudy: the POST resolved, the new study is inserted and in-flight lists are invalid.
  studiesLoader.invalidate()
  state.studies = [{ id: 'NEW' }, ...state.studies]
  assert.equal(state.isLoadingStudies, false)

  list.resolve([{ id: 'A' }])
  assert.deepEqual(await refresh, { ok: false })
  assert.deepEqual(state.studies, [{ id: 'NEW' }])
})

// ------------------------------------------------------------------ refreshOutcomeMessage

test('refreshOutcomeMessage claims the update only when every refresh succeeded', () => {
  const ok = refreshOutcomeMessage({ ok: true }, { detail: 'Evaluador 1 · Ana.' })

  assert.deepEqual(ok, {
    detail: 'Evaluador 1 · Ana. Los resultados se actualizaron.',
    warning: '',
  })

  const failed = refreshOutcomeMessage({ ok: false }, { detail: 'Evaluador 1 · Ana.' })

  assert.deepEqual(failed, {
    detail: 'Evaluador 1 · Ana.',
    warning: 'No se pudieron actualizar los resultados',
  })
  assert.doesNotMatch(failed.detail, /actualizaron/)
})

test('refreshOutcomeMessage treats a missing outcome as a failure and accepts custom copy', () => {
  const missing = refreshOutcomeMessage(undefined, { detail: '' })

  assert.equal(missing.detail, '')
  assert.equal(missing.warning, 'No se pudieron actualizar los resultados')

  const custom = refreshOutcomeMessage(
    { ok: true },
    { detail: 'v2 · F0.5 0.7500.', updated: 'La lista de evaluaciones se actualizó.' },
  )

  assert.equal(custom.detail, 'v2 · F0.5 0.7500. La lista de evaluaciones se actualizó.')
  assert.equal(
    refreshOutcomeMessage({ ok: false }, { failed: 'No se pudo actualizar la lista' }).warning,
    'No se pudo actualizar la lista',
  )
})
