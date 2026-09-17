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

const GENERIC_ERROR = 'No pudimos completar la acción. Inténtalo nuevamente.'
const DUPLICATE_CODE_ERROR = 'Ese código ya existe.'

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
  let assignmentsPolling = null

  async function load(action, apply, failureMessage) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      apply(await action())
      return true
    } catch {
      errorMessage.value = failureMessage
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function mutate(
    action,
    successMessage,
    failureMessage = GENERIC_ERROR,
    conflictMessage = failureMessage,
  ) {
    isMutating.value = true
    mutationMessage.value = ''
    try {
      await action()
      mutationMessage.value = successMessage
      return true
    } catch (error) {
      mutationMessage.value = error?.status === 409 ? conflictMessage : failureMessage
      return false
    } finally {
      isMutating.value = false
    }
  }

  function replaceTest(test) {
    const index = tests.value.findIndex((item) => item.id === test.id)
    tests.value = index === -1 ? [...tests.value, test] : tests.value.with(index, test)
    if (selectedTest.value?.id === test.id) selectedTest.value = test
  }

  function loadTests() {
    return load(
      listTests,
      (data) => {
        tests.value = data
      },
      'No pudimos cargar las pruebas. Inténtalo nuevamente.',
    )
  }

  function createTest(body) {
    return mutate(
      async () => replaceTest(await createTestRequest(body)),
      'Prueba creada.',
      'No pudimos crear la prueba. Inténtalo nuevamente.',
      DUPLICATE_CODE_ERROR,
    )
  }

  function loadTest(id) {
    return load(
      () => getTest(id),
      (data) => {
        selectedTest.value = data
        draftSentences.value = (data.sentences ?? []).map((sentence) => ({ ...sentence }))
      },
      'No pudimos cargar la prueba. Inténtalo nuevamente.',
    )
  }

  function saveTest(id) {
    return mutate(
      async () => {
        const saved = await saveTestRequest(id, {
          title: selectedTest.value.title,
          notes: selectedTest.value.notes,
          sentences: draftSentences.value,
        })
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
      async () => replaceTest(await activateTestRequest(id)),
      'Prueba activada.',
      'No pudimos activar la prueba. Revisa las oraciones e inténtalo nuevamente.',
    )
  }

  function closeTest(id) {
    return mutate(
      async () => replaceTest(await closeTestRequest(id)),
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
      async () => {
        assignments.value = await assignTest(id, body)
      },
      'Prueba asignada.',
      'No pudimos asignar la prueba. Inténtalo nuevamente.',
    )
  }

  function loadAssignments(id) {
    return load(
      () => listAssignments(id),
      (data) => {
        assignments.value = data
        if (!hasAttemptsInProgress(data)) stopAssignmentsPolling()
      },
      'No pudimos cargar las asignaciones. Inténtalo nuevamente.',
    )
  }

  function loadAttempt(id, attemptId) {
    return load(
      () => getAttempt(id, attemptId),
      (data) => {
        selectedAttempt.value = data
      },
      'No pudimos cargar el intento. Inténtalo nuevamente.',
    )
  }

  function excludeAttempt(id, attemptId, reason) {
    return mutate(
      async () => {
        selectedAttempt.value = await excludeAttemptRequest(id, attemptId, reason)
        assignments.value = await listAssignments(id)
        if (results.value?.testId === id) results.value = await getResults(id)
      },
      'Intento excluido.',
      'No pudimos excluir el intento. Inténtalo nuevamente.',
    )
  }

  function annotate(responseId, errorCount) {
    return mutate(
      async () => {
        const annotated = await annotateResponse(responseId, errorCount)
        if (selectedAttempt.value) {
          selectedAttempt.value = {
            ...selectedAttempt.value,
            responses: selectedAttempt.value.responses.map((response) =>
              response.responseId === responseId ? annotated : response,
            ),
          }
        }
        if (results.value) results.value = await getResults(results.value.testId)
      },
      'Anotación guardada.',
      'No pudimos guardar la anotación. Inténtalo nuevamente.',
    )
  }

  function loadResults(id) {
    return load(
      () => getResults(id),
      (data) => {
        results.value = data
      },
      'No pudimos cargar los resultados. Inténtalo nuevamente.',
    )
  }

  function downloadExport(id) {
    return mutate(
      async () => saveBlob(await downloadExportRequest(id), `prueba-${id}.csv`),
      'Archivo descargado.',
      'No pudimos descargar el archivo. Inténtalo nuevamente.',
    )
  }

  function startAssignmentsPolling(id) {
    stopAssignmentsPolling()
    if (!hasAttemptsInProgress(assignments.value)) return
    assignmentsPolling = window.setInterval(() => loadAssignments(id), 5000)
  }

  function stopAssignmentsPolling() {
    if (assignmentsPolling !== null) window.clearInterval(assignmentsPolling)
    assignmentsPolling = null
  }

  function reset() {
    stopAssignmentsPolling()
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
