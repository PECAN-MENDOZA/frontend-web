export const STUDY_CHANGED_MESSAGE = 'El estudio cambió durante la operación'

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
