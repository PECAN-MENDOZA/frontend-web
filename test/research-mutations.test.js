import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STUDY_CHANGED_MESSAGE,
  StudyChangedError,
  createPendingCounter,
  createRequestGuard,
  issueThenRefresh,
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
