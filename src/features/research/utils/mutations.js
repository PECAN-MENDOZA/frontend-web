import { requestErrorMessage } from './errors.js'

export const STUDY_CHANGED_MESSAGE = 'El estudio cambió durante la operación'
export const RESULTS_UPDATED_MESSAGE = 'Los resultados se actualizaron.'
export const RESULTS_NOT_UPDATED_MESSAGE = 'No se pudieron actualizar los resultados'

// La petición terminó en el backend, pero la selección ya no es el estudio de origen:
// el resultado se ignora y la vista lo informa sin tratarlo como un fallo.
export class StudyChangedError extends Error {
  constructor() {
    super(STUDY_CHANGED_MESSAGE)
    this.name = 'StudyChangedError'
  }
}

// Entrega la credencial en cuanto el POST resuelve y solo después espera la recarga:
// el código de un solo uso nunca queda retenido detrás de un refresh lento.
export async function issueThenRefresh(issue, refresh, onCredential = () => {}) {
  const credential = await issue()

  onCredential(credential)
  await refresh(credential)

  return credential
}

// Contador de generación para descartar respuestas obsoletas de otra selección.
export function createRequestGuard(getSelectedStudyId) {
  let latestGeneration = 0

  return {
    begin() {
      latestGeneration += 1
      return latestGeneration
    },
    isLatest(generation) {
      return generation === latestGeneration
    },
    isCurrent(generation, studyId) {
      return generation === latestGeneration && studyId === getSelectedStudyId()
    },
  }
}

// Carga con guarda de generación: solo la petición más reciente publica datos o error y apaga
// su indicador; una respuesta obsoleta no toca nada. Devuelve { ok } para que la recarga
// posterior a una mutación informe un fallo sin confundirlo con el éxito del POST.
export function createGuardedLoader({
  getSelectedStudyId = () => null,
  setLoading = () => {},
  setError = () => {},
  toMessage = requestErrorMessage,
} = {}) {
  const guard = createRequestGuard(getSelectedStudyId)

  async function load({ studyId = null, request, apply = () => {}, fallback = '' }) {
    const generation = guard.begin()

    setLoading(true)
    setError('')

    try {
      const data = await request()

      // Una petición más reciente (u otra selección) ya reemplazó a esta.
      if (!guard.isCurrent(generation, studyId)) return { ok: false }

      await apply(data)

      return { ok: true }
    } catch (requestError) {
      if (guard.isCurrent(generation, studyId)) {
        setError(toMessage(requestError, fallback))
      }

      return { ok: false }
    } finally {
      // Solo la petición más reciente apaga la carga (aunque la selección haya quedado vacía).
      if (guard.isLatest(generation)) {
        setLoading(false)
      }
    }
  }

  // Una mutación local (p. ej. crear un estudio) deja obsoletas las cargas en curso: ya no
  // publican ni apagan nada, así que la carga se libera aquí.
  function invalidate() {
    guard.begin()
    setLoading(false)
  }

  return { load, invalidate }
}

// Tras un POST exitoso, la actualización de la vista solo se afirma si todos los GET de la
// recarga respondieron; si alguno falló, el aviso ofrece reintentar sin negar el POST.
export function refreshOutcomeMessage(
  refresh,
  { detail = '', updated = RESULTS_UPDATED_MESSAGE, failed = RESULTS_NOT_UPDATED_MESSAGE } = {},
) {
  if (refresh?.ok === true) {
    return { detail: [detail, updated].filter(Boolean).join(' '), warning: '' }
  }

  return { detail, warning: failed }
}

// Contador de operaciones pendientes: sigue activo hasta que la última termina.
export function createPendingCounter(onChange = () => {}) {
  let pending = 0

  return {
    get pending() {
      return pending
    },
    isPending() {
      return pending > 0
    },
    async track(operation) {
      pending += 1
      onChange(pending)

      try {
        return await operation()
      } finally {
        pending -= 1
        onChange(pending)
      }
    },
  }
}
