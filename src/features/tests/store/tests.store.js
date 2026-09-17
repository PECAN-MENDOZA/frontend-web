import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  activateTest as activateTestRequest,
  annotateResponse,
  assignTest,
  closeTest as closeTestRequest,
  createTest as createTestRequest,
  downloadExport as downloadExportRequest,
  excludeAttempt as excludeAttemptRequest,
  getAttempt,
  getResults,
  getTest,
  listAssignments,
  listTests,
  saveTest as saveTestRequest,
} from '@/features/tests/services/tests.service'
import { hasAttemptsInProgress } from '@/features/tests/utils/attempts'
import { saveBlob } from '@/features/research/utils/download'
import {
  createGuardedLoader,
  createPendingCounter,
} from '@/features/research/utils/mutations'

const GENERIC_ERROR = 'No pudimos completar la acción. Inténtalo nuevamente.'
const DUPLICATE_CODE_ERROR = 'Ese código ya existe.'
const PARTIAL_REFRESH_MESSAGE = 'No pudimos actualizar los datos. Usa Actualizar para reintentar.'

export const useTestsStore = defineStore('tests', () => {
  const tests = ref([])
  const selectedTest = ref(null)
  const draftSentences = ref([])
  const assignments = ref([])
  const selectedAttempt = ref(null)
  const results = ref(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const errorMessage = ref('')
  const mutationMessage = ref('')
  const loadingStates = {
    tests: false,
    test: false,
    assignments: false,
    attempt: false,
    results: false,
  }
  let assignmentsPolling = null
  let pollingRequest = null
  let selectedTestId = null
  let assignmentsTestId = null
  let selectedAttemptKey = null
  let resultsTestId = null
  let storeGeneration = 0
  let latestMutation = 0
  let mutationCounter = newMutationCounter(storeGeneration)

  function setLoading(name, value) {
    loadingStates[name] = value
    isLoading.value = Object.values(loadingStates).some(Boolean)
  }

  function newMutationCounter(generation) {
    return createPendingCounter((pending) => {
      if (generation === storeGeneration) isMutating.value = pending > 0
    })
  }

  function loader(name, getSelectedId) {
    return createGuardedLoader({
      getSelectedStudyId: getSelectedId,
      setLoading: (value) => setLoading(name, value),
      setError: (message) => {
        errorMessage.value = message
      },
      toMessage: (_error, fallback) => fallback,
    })
  }

  const testsLoader = loader('tests')
  const testLoader = loader('test', () => selectedTestId)
  const assignmentsLoader = loader('assignments', () => assignmentsTestId)
  const attemptLoader = loader('attempt', () => selectedAttemptKey)
  const resultsLoader = loader('results', () => resultsTestId)
  const loaders = [testsLoader, testLoader, assignmentsLoader, attemptLoader, resultsLoader]

  async function runLoad(selectedLoader, options) {
    const outcome = await selectedLoader.load(options)
    return outcome.ok
  }

  function isStoreCurrent(generation) {
    return generation === storeGeneration
  }

  async function mutate(
    action,
    successMessage,
    failureMessage = GENERIC_ERROR,
    conflictMessage = failureMessage,
  ) {
    const generation = storeGeneration
    const operation = ++latestMutation
    const counter = mutationCounter
    const isCurrent = () => isStoreCurrent(generation)
    const isLatest = () => isCurrent() && operation === latestMutation

    if (isLatest()) mutationMessage.value = ''

    return counter.track(async () => {
      try {
        const outcome = await action(isCurrent)

        if (isLatest()) {
          mutationMessage.value =
            outcome?.refreshOk === false
              ? `${successMessage} ${PARTIAL_REFRESH_MESSAGE}`
              : successMessage
        }
        return true
      } catch (error) {
        if (isLatest()) {
          mutationMessage.value = error?.status === 409 ? conflictMessage : failureMessage
        }
        return false
      }
    })
  }

  function invalidateLoads() {
    for (const selectedLoader of loaders) selectedLoader.invalidate()
    for (const name of Object.keys(loadingStates)) {
      loadingStates[name] = false
    }
    isLoading.value = false
  }

  function replaceTest(test) {
    const index = tests.value.findIndex((item) => item.id === test.id)
    tests.value = index === -1 ? [...tests.value, test] : tests.value.with(index, test)
    if (selectedTest.value?.id === test.id) selectedTest.value = test
  }

  function loadTests() {
    return runLoad(testsLoader, {
      request: listTests,
      apply: (data) => {
        tests.value = data
      },
      fallback: 'No pudimos cargar las pruebas. Inténtalo nuevamente.',
    })
  }

  function createTest(body) {
    return mutate(
      async (isCurrent) => {
        const created = await createTestRequest(body)
        if (isCurrent()) {
          testsLoader.invalidate()
          replaceTest(created)
        }
      },
      'Prueba creada.',
      'No pudimos crear la prueba. Inténtalo nuevamente.',
      DUPLICATE_CODE_ERROR,
    )
  }

  function loadTest(id) {
    if (selectedTestId !== id) {
      stopAssignmentsPolling()
      assignmentsLoader.invalidate()
      attemptLoader.invalidate()
      resultsLoader.invalidate()
      assignmentsTestId = null
      selectedAttemptKey = null
      resultsTestId = null
      selectedTest.value = null
      draftSentences.value = []
      assignments.value = []
      selectedAttempt.value = null
      results.value = null
    }
    selectedTestId = id
    return runLoad(testLoader, {
      studyId: id,
      request: () => getTest(id),
      apply: (data) => {
        selectedTest.value = data
        draftSentences.value = (data.sentences ?? []).map((sentence) => ({ ...sentence }))
      },
      fallback: 'No pudimos cargar la prueba. Inténtalo nuevamente.',
    })
  }

  function saveTest(id) {
    return mutate(
      async (isCurrent) => {
        const saved = await saveTestRequest(id, {
          title: selectedTest.value.title,
          notes: selectedTest.value.notes,
          sentences: draftSentences.value.map(({ kind, referenceText, assistance }) => ({
            kind,
            referenceText,
            assistance,
          })),
        })
        if (!isCurrent() || selectedTestId !== id) return
        testsLoader.invalidate()
        testLoader.invalidate()
        selectedTest.value = saved
        draftSentences.value = (saved.sentences ?? []).map((sentence) => ({ ...sentence }))
        replaceTest(saved)
      },
      'Cambios guardados.',
      'No pudimos guardar la prueba. Inténtalo nuevamente.',
    )
  }

  function activateTest(id) {
    return mutate(
      async (isCurrent) => {
        const activated = await activateTestRequest(id)
        if (isCurrent()) {
          testsLoader.invalidate()
          testLoader.invalidate()
          replaceTest(activated)
        }
      },
      'Prueba activada.',
      'No pudimos activar la prueba. Revisa las oraciones e inténtalo nuevamente.',
    )
  }

  function closeTest(id) {
    return mutate(
      async (isCurrent) => {
        const closed = await closeTestRequest(id)
        if (isCurrent()) {
          testsLoader.invalidate()
          testLoader.invalidate()
          replaceTest(closed)
        }
      },
      'Prueba cerrada.',
      'No pudimos cerrar la prueba. Inténtalo nuevamente.',
    )
  }

  function assignByClassroom(id, classroomId) {
    return assign(id, { classroomId })
  }

  function assignStudents(id, studentIds) {
    return assign(id, { studentIds })
  }

  function assign(id, body) {
    return mutate(
      async (isCurrent) => {
        const assigned = await assignTest(id, body)
        if (isCurrent() && assignmentsTestId === id) {
          assignmentsLoader.invalidate()
          assignments.value = assigned
        }
      },
      'Prueba asignada.',
      'No pudimos asignar la prueba. Inténtalo nuevamente.',
    )
  }

  function loadAssignments(id) {
    if (assignmentsTestId !== id) {
      stopAssignmentsPolling()
      assignmentsTestId = id
      assignments.value = []
    }
    return runLoad(assignmentsLoader, {
      studyId: id,
      request: () => listAssignments(id),
      apply: (data) => {
        assignments.value = data
        if (!hasAttemptsInProgress(data)) stopAssignmentsPolling()
      },
      fallback: 'No pudimos cargar las asignaciones. Inténtalo nuevamente.',
    })
  }

  function loadAttempt(id, attemptId) {
    selectedAttemptKey = `${id}:${attemptId}`
    return runLoad(attemptLoader, {
      studyId: selectedAttemptKey,
      request: () => getAttempt(id, attemptId),
      apply: (data) => {
        selectedAttempt.value = data
      },
      fallback: 'No pudimos cargar el intento. Inténtalo nuevamente.',
    })
  }

  function excludeAttempt(id, attemptId, reason) {
    return mutate(
      async (isCurrent) => {
        const excluded = await excludeAttemptRequest(id, attemptId, reason)
        if (!isCurrent()) return

        selectedAttempt.value = excluded
        const refreshes = [loadAssignments(id)]
        if (results.value?.testId === id) refreshes.push(loadResults(id))
        const outcomes = await Promise.all(refreshes)
        return { refreshOk: outcomes.every(Boolean) }
      },
      'Intento excluido.',
      'No pudimos excluir el intento. Inténtalo nuevamente.',
    )
  }

  function annotate(responseId, errorCount) {
    return mutate(
      async (isCurrent) => {
        const annotated = await annotateResponse(responseId, errorCount)
        if (!isCurrent()) return

        if (selectedAttempt.value) {
          attemptLoader.invalidate()
          selectedAttempt.value = {
            ...selectedAttempt.value,
            responses: selectedAttempt.value.responses.map((response) =>
              response.responseId === responseId ? annotated : response,
            ),
          }
        }
        const resultsId = results.value?.testId
        const refreshOk = resultsId ? await loadResults(resultsId) : true
        return { refreshOk }
      },
      'Anotación guardada.',
      'No pudimos guardar la anotación. Inténtalo nuevamente.',
    )
  }

  function loadResults(id) {
    resultsTestId = id
    return runLoad(resultsLoader, {
      studyId: id,
      request: () => getResults(id),
      apply: (data) => {
        results.value = data
      },
      fallback: 'No pudimos cargar los resultados. Inténtalo nuevamente.',
    })
  }

  function downloadExport(id) {
    return mutate(
      async (isCurrent) => {
        const download = await downloadExportRequest(id)
        if (isCurrent()) saveBlob(download, `prueba-${id}.csv`)
      },
      'Archivo descargado.',
      'No pudimos descargar el archivo. Inténtalo nuevamente.',
    )
  }

  function startAssignmentsPolling(id) {
    stopAssignmentsPolling()
    if (assignmentsTestId !== id || !hasAttemptsInProgress(assignments.value)) return
    assignmentsPolling = window.setInterval(() => {
      if (pollingRequest) return pollingRequest

      const request = loadAssignments(id)
      pollingRequest = request
      return request.finally(() => {
        if (pollingRequest === request) pollingRequest = null
      })
    }, 5000)
  }

  function stopAssignmentsPolling() {
    if (assignmentsPolling !== null) window.clearInterval(assignmentsPolling)
    assignmentsPolling = null
    pollingRequest = null
  }

  function reset() {
    storeGeneration += 1
    latestMutation += 1
    mutationCounter = newMutationCounter(storeGeneration)
    stopAssignmentsPolling()
    selectedTestId = null
    assignmentsTestId = null
    selectedAttemptKey = null
    resultsTestId = null
    invalidateLoads()
    tests.value = []
    selectedTest.value = null
    draftSentences.value = []
    assignments.value = []
    selectedAttempt.value = null
    results.value = null
    isLoading.value = false
    isMutating.value = false
    errorMessage.value = ''
    mutationMessage.value = ''
  }

  window.addEventListener('auth:signed-out', reset)

  return {
    tests,
    selectedTest,
    draftSentences,
    assignments,
    selectedAttempt,
    results,
    isLoading,
    isMutating,
    errorMessage,
    mutationMessage,
    loadTests,
    createTest,
    loadTest,
    saveTest,
    activateTest,
    closeTest,
    assignByClassroom,
    assignStudents,
    loadAssignments,
    loadAttempt,
    excludeAttempt,
    annotate,
    loadResults,
    downloadExport,
    startAssignmentsPolling,
    stopAssignmentsPolling,
    reset,
  }
})
