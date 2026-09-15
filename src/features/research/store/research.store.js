import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  activateProtocol as activateProtocolRequest,
  cancelRun as cancelRunRequest,
  createAnnotationBatch as createAnnotationBatchRequest,
  createParticipant as createParticipantRequest,
  createProtocol as createProtocolRequest,
  createStudy as createStudyRequest,
  createTechnicalEvaluation as createTechnicalEvaluationRequest,
  downloadAnalysisCsv as downloadAnalysisCsvRequest,
  downloadAnnotationExport as downloadAnnotationExportRequest,
  excludeRun as excludeRunRequest,
  failRunTechnically as failRunTechnicallyRequest,
  generateAccessCode as generateAccessCodeRequest,
  getStudyResults,
  importAnnotation as importAnnotationRequest,
  listAnnotationBatches,
  listParticipants,
  listProtocols,
  listRuns,
  listStudies,
  listTechnicalEvaluations,
  revokeAccessCode as revokeAccessCodeRequest,
} from '@/features/research/services/research.service'
import { requestErrorMessage } from '@/features/research/utils/errors'
import {
  StudyChangedError,
  createGuardedLoader,
  createPendingCounter,
  issueThenRefresh,
} from '@/features/research/utils/mutations'
import { overviewCounts, pairRows, versionStrip } from '@/features/research/utils/overview'

const SELECTED_STUDY_KEY = 'florisboard_research_study'
const GENERIC_ACTION_ERROR = 'No pudimos completar la acción. Inténtalo nuevamente.'
const GENERIC_STUDIES_ERROR = 'No pudimos cargar tus estudios. Inténtalo nuevamente.'
const GENERIC_OVERVIEW_ERROR = 'No pudimos cargar el resumen del estudio. Inténtalo nuevamente.'
const GENERIC_REFRESH_ERROR =
  'No pudimos actualizar la lista de estudios. Usa Actualizar para reintentar.'
const GENERIC_RESULTS_ERROR = 'No pudimos cargar los resultados del estudio. Inténtalo nuevamente.'
const GENERIC_EVALUATIONS_ERROR =
  'No pudimos cargar las evaluaciones técnicas. Inténtalo nuevamente.'
const GENERIC_DOWNLOAD_ERROR = 'No pudimos descargar el archivo. Inténtalo nuevamente.'

export const useResearchStore = defineStore('research', () => {
  const studies = ref([])
  const selectedStudyId = ref(localStorage.getItem(SELECTED_STUDY_KEY) || null)
  const participants = ref([])
  const runs = ref([])
  const batches = ref([])
  const protocols = ref([])
  const results = ref(null)
  const technicalEvaluations = ref([])
  // Cada carga tiene su propio indicador: ninguna apaga una carga que no inició.
  const isLoadingStudies = ref(false)
  const isLoadingOverview = ref(false)
  const isLoadingResults = ref(false)
  const isLoadingEvaluations = ref(false)
  const pendingOperations = ref(0)
  const error = ref('')
  const resultsError = ref('')
  const evaluationsError = ref('')
  // Estudio cuyos resultados se pidieron: solo ese se recarga tras una mutación o "Actualizar".
  let resultsStudyId = null

  // Cargas con guarda de generación: solo la petición más reciente publica datos, error y
  // apaga su indicador; las de estudio descartan además respuestas de una selección anterior.
  const studiesLoader = createGuardedLoader({
    setLoading: (value) => {
      isLoadingStudies.value = value
    },
    setError: (message) => {
      error.value = message
    },
  })
  const overviewLoader = createGuardedLoader({
    getSelectedStudyId: () => selectedStudyId.value,
    setLoading: (value) => {
      isLoadingOverview.value = value
    },
    setError: (message) => {
      error.value = message
    },
  })
  const resultsLoader = createGuardedLoader({
    getSelectedStudyId: () => selectedStudyId.value,
    setLoading: (value) => {
      isLoadingResults.value = value
    },
    setError: (message) => {
      resultsError.value = message
    },
  })
  const evaluationsLoader = createGuardedLoader({
    setLoading: (value) => {
      isLoadingEvaluations.value = value
    },
    setError: (message) => {
      evaluationsError.value = message
    },
  })
  // isMutating cubre el POST y la recarga posterior, incluso con operaciones solapadas.
  const pendingCounter = createPendingCounter((pending) => {
    pendingOperations.value = pending
  })

  const selectedStudy = computed(
    () => studies.value.find((study) => study.id === selectedStudyId.value) ?? null,
  )
  const isLoading = computed(() => isLoadingStudies.value || isLoadingOverview.value)
  const isMutating = computed(() => pendingOperations.value > 0)
  const rows = computed(() => pairRows(participants.value, runs.value))
  const counts = computed(() => overviewCounts(rows.value, runs.value, batches.value))
  const versions = computed(() => versionStrip(selectedStudy.value, runs.value))
  const activeProtocol = computed(
    () => protocols.value.find((protocol) => protocol.status === 'ACTIVE') ?? null,
  )
  const latestProtocol = computed(() => protocols.value[0] ?? null)

  // Carga inicial: la lista y, con selección, su resumen. La carga de la lista sigue activa
  // mientras espera ese resumen; una selección posterior lo reemplaza sin apagar nada ajeno.
  function loadStudies() {
    return studiesLoader.load({
      request: listStudies,
      fallback: GENERIC_STUDIES_ERROR,
      apply: async (data) => {
        studies.value = data

        if (selectedStudyId.value && !data.some((study) => study.id === selectedStudyId.value)) {
          persistSelection(null)
        }

        if (!selectedStudyId.value && data.length === 1) {
          persistSelection(data[0].id)
        }

        if (selectedStudyId.value) {
          await loadOverview(selectedStudyId.value)
        }
      },
    })
  }

  function selectStudy(studyId) {
    persistSelection(studyId)
    clearStudyData()

    return loadOverview(studyId)
  }

  // Todas las cargas devuelven { ok } para que la recarga posterior a una mutación informe un
  // fallo parcial sin negar el POST ya aplicado.
  function loadOverview(studyId = selectedStudyId.value) {
    if (!studyId) return Promise.resolve({ ok: false })

    return overviewLoader.load({
      studyId,
      fallback: GENERIC_OVERVIEW_ERROR,
      request: () =>
        Promise.all([
          listParticipants(studyId),
          listRuns(studyId),
          listAnnotationBatches(studyId),
          listProtocols(studyId),
        ]),
      apply: ([participantsData, runsData, batchesData, protocolsData]) => {
        participants.value = participantsData
        runs.value = runsData
        batches.value = batchesData
        protocols.value = protocolsData
      },
    })
  }

  // Resultados del estudio (PEO, PPM, TAS, anotación, procedencia): se piden aparte del resumen
  // porque solo la vista de resultados los necesita.
  function loadResults(studyId = selectedStudyId.value) {
    if (!studyId) return Promise.resolve({ ok: false })

    resultsStudyId = studyId

    return resultsLoader.load({
      studyId,
      fallback: GENERIC_RESULTS_ERROR,
      request: () => getStudyResults(studyId),
      apply: (data) => {
        results.value = data
      },
    })
  }

  function loadTechnicalEvaluations() {
    return evaluationsLoader.load({
      fallback: GENERIC_EVALUATIONS_ERROR,
      request: listTechnicalEvaluations,
      apply: (data) => {
        technicalEvaluations.value = data
      },
    })
  }

  // "Actualizar": recarga la lista de estudios (estado, versión activa), el resumen y, si la
  // vista de resultados ya los pidió, los resultados.
  async function refreshAll() {
    const studyId = selectedStudyId.value
    const refreshes = [refreshStudies(), loadOverview(studyId)]

    if (studyId && resultsStudyId === studyId) {
      refreshes.push(loadResults(studyId))
    }

    return allOk(await Promise.all(refreshes))
  }

  function addStudy({ code, title }) {
    return pendingCounter.track(async () => {
      const study = await post(
        () => createStudyRequest({ code, title }),
        (requestError) =>
          requestError.status === 409 ? 'Ya existe un estudio con ese código' : null,
      )

      // Una lista pedida antes del POST ya no representa el estado: no puede quitar el estudio.
      studiesLoader.invalidate()
      studies.value = [study, ...studies.value]
      await selectStudy(study.id)

      return study
    })
  }

  function saveProtocolDraft({ taskAPrompt, taskBPrompt }) {
    const studyId = selectedStudyId.value

    return pendingCounter.track(async () => {
      const protocol = await post(() =>
        createProtocolRequest(studyId, { taskAPrompt, taskBPrompt }),
      )

      await refreshAfterMutation(studyId)

      return protocol
    })
  }

  function activateStudyProtocol(protocolId) {
    const studyId = selectedStudyId.value

    return pendingCounter.track(async () => {
      const protocol = await post(() => activateProtocolRequest(studyId, protocolId))

      // Activar un protocolo activa el estudio: reflejarlo aunque la recarga de la lista falle.
      studies.value = studies.value.map((study) =>
        study.id === studyId
          ? { ...study, status: 'ACTIVE', activeProtocolVersion: protocol.version }
          : study,
      )
      await refreshAfterMutation(studyId, { includeStudies: true })

      return protocol
    })
  }

  function addParticipant() {
    const studyId = selectedStudyId.value

    return pendingCounter.track(async () => {
      const participant = await post(() => createParticipantRequest(studyId))

      await refreshAfterMutation(studyId)

      return participant
    })
  }

  // El código en claro se entrega por callback en cuanto el POST resuelve y nunca se conserva
  // en el store ni se devuelve como resultado de la acción.
  function issueAccessCode(participantId, onCredential) {
    const studyId = selectedStudyId.value
    const studyCode = selectedStudy.value?.code ?? null

    return pendingCounter.track(async () => {
      await issueThenRefresh(
        () => issueCredential(studyId, studyCode, participantId),
        () => refreshAfterMutation(studyId),
        onCredential,
      )
    })
  }

  function revokeParticipantCode(runId) {
    const studyId = selectedStudyId.value

    return pendingCounter.track(async () => {
      await post(() => revokeAccessCodeRequest(studyId, runId))
      await refreshAfterMutation(studyId)
    })
  }

  // Regenerar = revocar el pendiente y, solo si eso funciona, emitir uno nuevo; todo con los
  // identificadores capturados al inicio, aunque la selección cambie mientras tanto.
  function reissueAccessCode(participantId, runId, onCredential) {
    const studyId = selectedStudyId.value
    const studyCode = selectedStudy.value?.code ?? null

    return pendingCounter.track(async () => {
      await post(() => revokeAccessCodeRequest(studyId, runId))
      await issueThenRefresh(
        () => issueCredential(studyId, studyCode, participantId),
        () => refreshAfterMutation(studyId),
        onCredential,
      )
    })
  }

  // Decisiones analíticas sobre una ejecución: motivo obligatorio, ligadas al estudio de origen.
  function cancelRun(runId, reason) {
    return applyRunDecision((studyId) => cancelRunRequest(studyId, runId, reason))
  }

  function failRunTechnically(runId, reason) {
    return applyRunDecision((studyId) => failRunTechnicallyRequest(studyId, runId, reason))
  }

  function excludeRun(runId, reason) {
    return applyRunDecision((studyId) => excludeRunRequest(studyId, runId, reason))
  }

  function applyRunDecision(requestFn) {
    const studyId = selectedStudyId.value

    return pendingCounter.track(async () => {
      const run = await post(() => requestFn(studyId))

      await refreshAfterMutation(studyId)

      return run
    })
  }

  // Anotación ciega: crear un lote congela las ejecuciones completadas de este momento.
  // Devuelve el resultado del POST junto con el de la recarga ({ ok }) para que la vista no
  // afirme una actualización que no ocurrió.
  function createBatch(kind) {
    const studyId = selectedStudyId.value

    return pendingCounter.track(async () => {
      const batch = await post(() => createAnnotationBatchRequest(studyId, kind))
      const refresh = await refreshAfterMutation(studyId, { includeResults: true })

      return { batch, refresh }
    })
  }

  function importAnnotationFile(batchId, { slot, rater, file }) {
    const studyId = selectedStudyId.value

    return pendingCounter.track(async () => {
      const summary = await post(() =>
        importAnnotationRequest(studyId, batchId, { slot, rater: rater.trim(), file }),
      )
      const refresh = await refreshAfterMutation(studyId, { includeResults: true })

      return { summary, refresh }
    })
  }

  // Descargas: devuelven { blob, filename } para que la vista las entregue al navegador.
  function downloadExport(batchId) {
    const studyId = selectedStudyId.value

    return post(() => downloadAnnotationExportRequest(studyId, batchId), downloadError)
  }

  function downloadAnalysis() {
    const studyId = selectedStudyId.value

    return post(() => downloadAnalysisCsvRequest(studyId), downloadError)
  }

  // Evaluación técnica del modelo: independiente del estudio seleccionado.
  function recordTechnicalEvaluation(payload) {
    return pendingCounter.track(async () => {
      const evaluation = await post(() => createTechnicalEvaluationRequest(payload))

      technicalEvaluations.value = [evaluation, ...technicalEvaluations.value]
      const refresh = await loadTechnicalEvaluations()

      return { evaluation, refresh }
    })
  }

  function downloadError(requestError) {
    return typeof requestError?.status === 'number' ? null : GENERIC_DOWNLOAD_ERROR
  }

  async function issueCredential(studyId, studyCode, participantId) {
    const credential = await post(() => generateAccessCodeRequest(studyId, participantId))

    return { ...credential, studyId, studyCode }
  }

  async function post(requestFn, mapError = () => null) {
    try {
      return await requestFn()
    } catch (requestError) {
      throw new Error(
        mapError(requestError) || requestErrorMessage(requestError, GENERIC_ACTION_ERROR),
        { cause: requestError },
      )
    }
  }

  // Recarga solo el estudio de origen; si la selección cambió, el resultado se ignora.
  // Devuelve { ok: true } solo si todos los GET de la recarga respondieron.
  async function refreshAfterMutation(
    studyId,
    { includeStudies = false, includeResults = false } = {},
  ) {
    const refreshes = []

    if (includeStudies) {
      refreshes.push(refreshStudies())
    }

    if (selectedStudyId.value === studyId) {
      refreshes.push(loadOverview(studyId))

      if (includeResults) {
        refreshes.push(loadResults(studyId))
      }
    }

    const outcomes = await Promise.all(refreshes)

    if (selectedStudyId.value !== studyId) {
      throw new StudyChangedError()
    }

    return allOk(outcomes)
  }

  function refreshStudies() {
    return studiesLoader.load({
      request: listStudies,
      fallback: GENERIC_REFRESH_ERROR,
      apply: (data) => {
        studies.value = data
      },
    })
  }

  function allOk(outcomes) {
    return { ok: outcomes.every((outcome) => outcome.ok) }
  }

  function clearStudyData() {
    participants.value = []
    runs.value = []
    batches.value = []
    protocols.value = []
    results.value = null
    resultsError.value = ''
    resultsStudyId = null
  }

  function persistSelection(studyId) {
    selectedStudyId.value = studyId

    if (studyId) {
      localStorage.setItem(SELECTED_STUDY_KEY, studyId)
    } else {
      localStorage.removeItem(SELECTED_STUDY_KEY)
    }
  }

  return {
    studies,
    selectedStudyId,
    selectedStudy,
    participants,
    runs,
    batches,
    protocols,
    results,
    technicalEvaluations,
    activeProtocol,
    latestProtocol,
    isLoading,
    isLoadingStudies,
    isLoadingOverview,
    isLoadingResults,
    isLoadingEvaluations,
    isMutating,
    error,
    resultsError,
    evaluationsError,
    rows,
    counts,
    versions,
    loadStudies,
    selectStudy,
    loadOverview,
    loadResults,
    loadTechnicalEvaluations,
    refreshAll,
    addStudy,
    saveProtocolDraft,
    activateStudyProtocol,
    addParticipant,
    issueAccessCode,
    revokeParticipantCode,
    reissueAccessCode,
    cancelRun,
    failRunTechnically,
    excludeRun,
    createBatch,
    importAnnotationFile,
    downloadExport,
    downloadAnalysis,
    recordTechnicalEvaluation,
  }
})
