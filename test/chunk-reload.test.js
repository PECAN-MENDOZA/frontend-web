import test from 'node:test'
import assert from 'node:assert/strict'
import { isChunkLoadError, reloadOnceForChunkError } from '../src/app/router/chunkReload.js'

function memoryStorage() {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) }
}

test('reconoce los errores de trozo que ya no existe tras un despliegue', () => {
  assert.equal(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/TestsListView-56BHsA6l.js')), true)
  assert.equal(isChunkLoadError(new TypeError('Importing a module script failed.')), true)
  assert.equal(isChunkLoadError(new Error('Request failed with status code 401')), false)
  assert.equal(isChunkLoadError(undefined), false)
})

test('recarga una sola vez hacia la ruta de destino', () => {
  const storage = memoryStorage()
  const reloads = []
  const error = new TypeError('Failed to fetch dynamically imported module: x.js')
  assert.equal(reloadOnceForChunkError(error, { storage, reload: (p) => reloads.push(p), now: 1000, targetPath: '/research/tests' }), true)
  // Un segundo fallo inmediato (despliegue roto de verdad) no entra en bucle.
  assert.equal(reloadOnceForChunkError(error, { storage, reload: (p) => reloads.push(p), now: 5000 }), false)
  // Pasada la guarda, vuelve a intentarlo.
  assert.equal(reloadOnceForChunkError(error, { storage, reload: (p) => reloads.push(p), now: 20000 }), true)
  assert.deepEqual(reloads, ['/research/tests', undefined])
})

test('otros errores de navegación no recargan', () => {
  const reloads = []
  assert.equal(reloadOnceForChunkError(new Error('boom'), { storage: memoryStorage(), reload: () => reloads.push(1) }), false)
  assert.equal(reloads.length, 0)
})

test('sin sessionStorage disponible recarga igual', () => {
  const broken = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  const reloads = []
  assert.equal(reloadOnceForChunkError(new TypeError('Importing a module script failed.'), { storage: broken, reload: () => reloads.push(1), now: 50000 }), true)
  assert.equal(reloads.length, 1)
})
