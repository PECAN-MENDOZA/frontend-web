import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const storage = new Map()
let vite
let useClassroomsStore

globalThis.window = new EventTarget()
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
  ;({ useClassroomsStore } = await vite.ssrLoadModule(
    '/src/features/classrooms/store/classrooms.store.js',
  ))
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
  return useClassroomsStore()
}

function json(body, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Rutas por método + sufijo; la primera que coincide responde. Registra cada petición.
function routeFetch(routes, calls = []) {
  return async (url, options = {}) => {
    const { pathname } = new URL(url)
    const method = options.method ?? 'GET'
    calls.push(`${method} ${pathname}`)
    for (const [routeMethod, suffix, respond] of routes) {
      if (routeMethod === method && pathname.endsWith(suffix)) return respond()
    }
    throw new Error(`Unexpected request: ${method} ${pathname}`)
  }
}

const classrooms = [
  { id: 'room-a', name: '4.º A', archivedAt: null, studentCount: 1 },
  { id: 'room-b', name: '4.º B', archivedAt: null, studentCount: 0 },
]
const activeLink = {
  studentId: 'st-1',
  classroomId: 'room-a',
  studentUsername: 'luna-85',
  studentRealName: 'Mateo',
  deactivatedAt: null,
}
const inactiveLinks = [
  {
    studentId: 'st-2',
    classroomId: 'room-a',
    studentUsername: 'tren-40',
    deactivatedAt: '2026-10-14T10:00:00Z',
  },
  {
    studentId: 'st-3',
    classroomId: 'room-b',
    studentUsername: 'sol-11',
    deactivatedAt: '2026-10-15T10:00:00Z',
  },
]

function classroomRoutes(extra = []) {
  return [
    ...extra,
    ['GET', '/teachers/classrooms', () => json(classrooms)],
    ['GET', '/teachers/classrooms/room-a/students', () => json([activeLink])],
    ['GET', '/teachers/students/inactive', () => json(inactiveLinks)],
  ]
}

test('loadClassroom keeps only the inactive students of that classroom', async () => {
  globalThis.fetch = routeFetch(classroomRoutes())
  const classroomsStore = store()

  await classroomsStore.loadClassroom('room-a')

  assert.equal(classroomsStore.isNotFound, false)
  assert.deepEqual(
    classroomsStore.inactiveStudents.map((link) => link.studentId),
    ['st-2'],
  )
})

test('a failing inactive list does not break the classroom', async () => {
  globalThis.fetch = routeFetch(
    classroomRoutes([['GET', '/teachers/students/inactive', () => json({ message: 'boom' }, 500)]]),
  )
  const classroomsStore = store()

  await classroomsStore.loadClassroom('room-a')

  assert.equal(classroomsStore.errorMessage, '')
  assert.equal(classroomsStore.students.length, 1)
  assert.deepEqual(classroomsStore.inactiveStudents, [])
})

test('a classroom of another teacher (403) is reported as not found', async () => {
  globalThis.fetch = routeFetch([
    [
      'GET',
      '/teachers/classrooms/room-x/students',
      () => json({ message: 'Teacher does not have access to this classroom' }, 403),
    ],
    ['GET', '/teachers/classrooms', () => json(classrooms)],
    ['GET', '/teachers/students/inactive', () => json([])],
  ])
  const classroomsStore = store()

  await classroomsStore.loadClassroom('room-x')

  assert.equal(classroomsStore.isNotFound, true)
  assert.equal(classroomsStore.errorMessage, 'No encontramos este salón.')
})

test('a network failure is not mistaken for a missing classroom', async () => {
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch')
  }
  const classroomsStore = store()

  await classroomsStore.loadClassroom('room-a')

  assert.equal(classroomsStore.isNotFound, false)
  assert.equal(classroomsStore.errorMessage, 'No pudimos cargar el salón. Inténtalo nuevamente.')
})

test('deactivate moves the student to the inactive list and reactivate brings it back', async () => {
  const reactivated = { ...activeLink, deactivatedAt: null }
  globalThis.fetch = routeFetch(
    classroomRoutes([
      ['POST', '/teachers/students/st-1/deactivate', () => new Response(null, { status: 204 })],
      ['POST', '/teachers/students/st-1/reactivate', () => json(reactivated)],
    ]),
  )
  const classroomsStore = store()
  await classroomsStore.loadClassroom('room-a')

  assert.equal(await classroomsStore.deactivateStudent('st-1'), true)
  assert.deepEqual(classroomsStore.students, [])
  assert.equal(classroomsStore.selectedClassroom.studentCount, 0)
  assert.equal(classroomsStore.inactiveStudents[0].studentId, 'st-1')
  assert.ok(classroomsStore.inactiveStudents[0].deactivatedAt)

  assert.equal(await classroomsStore.reactivateStudent('st-1'), true)
  assert.deepEqual(
    classroomsStore.students.map((link) => link.studentId),
    ['st-1'],
  )
  assert.equal(classroomsStore.selectedClassroom.studentCount, 1)
  assert.deepEqual(
    classroomsStore.inactiveStudents.map((link) => link.studentId),
    ['st-2'],
  )
})

test('reactivating an already active student (409) reloads the active list', async () => {
  const calls = []
  globalThis.fetch = routeFetch(
    classroomRoutes([
      [
        'POST',
        '/teachers/students/st-2/reactivate',
        () => json({ message: 'Already active' }, 409),
      ],
    ]),
    calls,
  )
  const classroomsStore = store()
  await classroomsStore.loadClassroom('room-a')

  assert.equal(await classroomsStore.reactivateStudent('st-2'), true)
  assert.deepEqual(classroomsStore.inactiveStudents, [])
  assert.equal(
    calls.filter(
      (call) => call.startsWith('GET ') && call.endsWith('/teachers/classrooms/room-a/students'),
    ).length,
    2,
  )
})

test('restoring a classroom whose name is taken (409) explains the conflict', async () => {
  globalThis.fetch = routeFetch([
    [
      'PATCH',
      '/teachers/classrooms/room-a',
      () => json({ message: 'Classroom name is already in use' }, 409),
    ],
  ])
  const classroomsStore = store()

  assert.equal(await classroomsStore.archiveClassroom('room-a', false), false)
  assert.equal(
    classroomsStore.mutationErrorMessage,
    'Ya tienes un salón activo con ese nombre. Renombra uno de los dos.',
  )
})
