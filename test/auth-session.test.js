import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const storage = new Map()
let vite
let useAuthStore
let api

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
  ;({ useAuthStore } = await vite.ssrLoadModule('/src/features/auth/store/auth.store.js'))
  ;({ api } = await vite.ssrLoadModule('/src/shared/services/api.js'))
})

test.after(async () => {
  await vite.close()
})

test.afterEach(() => {
  globalThis.fetch = undefined
  storage.clear()
})

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const loginResponse = {
  userId: 'teacher-1',
  token: 'jwt',
  expiresAt: '2999-01-01T00:00:00Z',
  role: 'TEACHER',
  mustChangePassword: false,
  displayName: 'Ana QA Torres',
}

async function signedInStore() {
  setActivePinia(createPinia())
  globalThis.fetch = async () => json(loginResponse)
  const authStore = useAuthStore()
  await authStore.signIn({ email: 'ana.qa@colegio.edu.pe', password: 'secreta123' })
  return authStore
}

test('signIn sends the email trimmed and lowercased and shows the displayName', async () => {
  setActivePinia(createPinia())
  let sentBody = null
  globalThis.fetch = async (url, options) => {
    sentBody = JSON.parse(options.body)
    return json(loginResponse)
  }
  const authStore = useAuthStore()

  await authStore.signIn({ email: '  ANA.QA@Colegio.edu.pe ', password: 'secreta123' })

  assert.equal(sentBody.email, 'ana.qa@colegio.edu.pe')
  assert.equal(authStore.user.name, 'Ana QA Torres')
  assert.equal(authStore.user.email, 'ana.qa@colegio.edu.pe')
})

test('without displayName the name is derived from the email', async () => {
  setActivePinia(createPinia())
  globalThis.fetch = async () => json({ ...loginResponse, displayName: null })
  const authStore = useAuthStore()

  await authStore.signIn({ email: 'ana.qa@colegio.edu.pe', password: 'secreta123' })

  assert.equal(authStore.user.name, 'Ana Qa')
})

test('a 429 on login shows the lockout message', async () => {
  setActivePinia(createPinia())
  globalThis.fetch = async () => json({ message: 'Too many login attempts' }, 429)
  const authStore = useAuthStore()

  await assert.rejects(authStore.signIn({ email: 'ana@x.pe', password: 'x' }))

  assert.equal(
    authStore.errorMessage,
    'Demasiados intentos. Espera 15 minutos o pide al administrador que reinicie tu contraseña.',
  )
})

test('a 403 "Password change required" signs out and leaves the notice for the login', async () => {
  const authStore = await signedInStore()
  globalThis.fetch = async () => json({ message: 'Password change required' }, 403)

  await assert.rejects(api.get('/teachers/classrooms'))

  assert.equal(authStore.isAuthenticated, false)
  assert.equal(
    authStore.notice,
    'Tu contraseña fue reiniciada. Entra con la contraseña temporal que te dieron.',
  )

  // El siguiente intento de entrar limpia el aviso.
  globalThis.fetch = async () => json(loginResponse)
  await authStore.signIn({ email: 'ana.qa@colegio.edu.pe', password: 'Temporal123' })
  assert.equal(authStore.notice, '')
})

test('any other 403 keeps the session open', async () => {
  const authStore = await signedInStore()
  globalThis.fetch = async () =>
    json({ message: 'Teacher does not have access to this student' }, 403)

  await assert.rejects(api.get('/teachers/students/x/help'))

  assert.equal(authStore.isAuthenticated, true)
  assert.equal(authStore.notice, '')
})

test('changePassword maps the backend errors to Spanish', async () => {
  const authStore = await signedInStore()

  globalThis.fetch = async () => json({ message: 'Invalid staff credentials' }, 401)
  assert.equal(await authStore.changePassword({ currentPassword: 'x', newPassword: 'y' }), false)
  assert.equal(authStore.errorMessage, 'La contraseña actual no es correcta.')
  assert.equal(authStore.isAuthenticated, true)

  globalThis.fetch = async () => json({ message: 'New password must be different' }, 400)
  await authStore.changePassword({ currentPassword: 'x', newPassword: 'y' })
  assert.equal(authStore.errorMessage, 'La contraseña nueva debe ser distinta de la actual.')

  let calledPath = ''
  globalThis.fetch = async (url) => {
    calledPath = new URL(url).pathname
    return new Response(null, { status: 204 })
  }
  assert.equal(await authStore.changePassword({ currentPassword: 'x', newPassword: 'y' }), true)
  assert.ok(calledPath.endsWith('/auth/staff/change-password'))
})
