import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  activateProtocol as activateProtocolRequest,
  cancelRun as cancelRunRequest,
  createParticipant as createParticipantRequest,
  createProtocol as createProtocolRequest,
  createStudy as createStudyRequest,
  excludeRun as excludeRunRequest,
  failRunTechnically as failRunTechnicallyRequest,
  generateAccessCode as generateAccessCodeRequest,
  listAnnotationBatches,
  listParticipants,
  listProtocols,
  listRuns,
  listStudies,
  revokeAccessCode as revokeAccessCodeRequest,
} from '@/features/research/services/research.service'
import { requestErrorMessage } from '@/features/research/utils/errors'
import {
  StudyChangedError,
  createPendingCounter,
  createRequestGuard,
  issueThenRefresh,
} from '@/features/research/utils/mutations'
import { overviewCounts, pairRows, versionStrip } from '@/features/research/utils/overview'

const SELECTED_STUDY_KEY = 'florisboard_research_study'
const GENERIC_ACTION_ERROR = 'No pudimos completar la acción. Inténtalo nuevamente.'
const GENERIC_STUDIES_ERROR = 'No pudimos cargar tus estudios. Inténtalo nuevamente.'
const GENERIC_OVERVIEW_ERROR = 'No pudimos cargar el resumen del estudio. Inténtalo nuevamente.'
const GENERIC_REFRESH_ERROR =
  'No pudimos actualizar la lista de estudios. Usa Actualizar para reintentar.'

export const useResearchStore = defineStore('research', () => {
  const studies = ref([])
  const selectedStudyId = ref(localStorage.getItem(SELECTED_STUDY_KEY) || null)
  const participants = ref([])
  const runs = ref([])
  const batches = ref([])
  const protocols = ref([])
  const isLoading = ref(false)
  const pendingOperations = ref(0)
  const error = ref('')

  // Descarta respuestas de una selección anterior (A → B con A resolviendo al final).
  const overviewGuard = createRequestGuard(() => selectedStudyId.value)
  // isMutating cubre el POST y la recarga posterior, incluso con operaciones solapadas.
  const pendingCounter = createPendingCounter((pending) => {
    pendingOperations.value = pending
  })

  const selectedStudy = computed(
    () => studies.value.find((study) => study.id === selectedStudyId.value) ?? null,
  )
  const isMutating = computed(() => pendingOperations.value > 0)
  const rows = computed(() => pairRows(participants.value, runs.value))
  const counts = computed(() => overviewCounts(rows.value, runs.value, batches.value))
  const versions = computed(() => versionStrip(selectedStudy.value, runs.value))
  const activeProtocol = computed(
    () => protocols.value.find((protocol) => protocol.status === 'ACTIVE') ?? null,
  )
  const latestProtocol = computed(() => protocols.value[0] ?? null)

  async function loadStudies() {
    isLoading.value = true
    error.value = ''

    try {
      studies.value = await listStudies()

      if (
        selectedStudyId.value &&
        !studies.value.some((study) => study.id === selectedStudyId.value)
      ) {
        persistSelection(null)
      }

      if (!selectedStudyId.value && studies.value.length === 1) {
        persistSelection(studies.value[0].id)
      }

      if (selectedStudyId.value) {
        await loadOverview(selectedStudyId.value)
      }
    } catch (requestError) {
      error.value = requestErrorMessage(requestError, GENERIC_STUDIES_ERROR)
    } finally {
      isLoading.value = false
    }
  }

  function selectStudy(studyId) {
    persistSelection(studyId)
    clearStudyData()

    return loadOverview(studyId)
  }

  async function loadOverview(studyId = selectedStudyId.value) {
    if (!studyId) return

    const generation = overviewGuard.begin()

    isLoading.value = true
    error.value = ''

    try {
      const [participantsData, runsData, batchesData, protocolsData] = await Promise.all([
        listParticipants(studyId),
        listRuns(studyId),
        listAnnotationBatches(studyId),
        listProtocols(studyId),
      ])

      // Una selección o recarga más reciente ya reemplazó a esta petición.
      if (!overviewGuard.isCurrent(generation, studyId)) return

      participants.value = participantsData
      runs.value = runsData
      batches.value = batchesData
      protocols.value = protocolsData
    } catch (requestError) {
      if (overviewGuard.isCurrent(generation, studyId)) {
        error.value = requestErrorMessage(requestError, GENERIC_OVERVIEW_ERROR)
      }
    } finally {
      // Solo la petición más reciente apaga la carga (aunque la selección haya quedado vacía).
      if (overviewGuard.isLatest(generation)) {
        isLoading.value = false
      }
    }
  }

  // "Actualizar": recarga la lista de estudios (estado, versión activa) y el resumen.
  function refreshAll() {
    return Promise.all([refreshStudies(), loadOverview(selectedStudyId.value)])
  }

  function addStudy({ code, title }) {
    return pendingCounter.track(async () => {
      const study = await post(
        () => createStudyRequest({ code, title }),
        (requestError) =>
          requestError.status === 409 ? 'Ya existe un estudio con ese código' : null,
      )

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
  async function refreshAfterMutation(studyId, { includeStudies = false } = {}) {
    const refreshes = []

    if (includeStudies) {
      refreshes.push(refreshStudies())
    }

    if (selectedStudyId.value === studyId) {
      refreshes.push(loadOverview(studyId))
    }

    await Promise.all(refreshes)

    if (selectedStudyId.value !== studyId) {
      throw new StudyChangedError()
    }
  }

  async function refreshStudies() {
    try {
      studies.value = await listStudies()
    } catch (requestError) {
      error.value = requestErrorMessage(requestError, GENERIC_REFRESH_ERROR)
    }
  }

  function clearStudyData() {
    participants.value = []
    runs.value = []
    batches.value = []
    protocols.value = []
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
    activeProtocol,
    latestProtocol,
    isLoading,
    isMutating,
    error,
    rows,
    counts,
    versions,
    loadStudies,
    selectStudy,
    loadOverview,
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
  }
})
