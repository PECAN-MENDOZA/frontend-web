import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  activateProtocol as activateProtocolRequest,
  createParticipant as createParticipantRequest,
  createProtocol as createProtocolRequest,
  createStudy as createStudyRequest,
  generateAccessCode as generateAccessCodeRequest,
  listAnnotationBatches,
  listParticipants,
  listProtocols,
  listRuns,
  listStudies,
  revokeAccessCode as revokeAccessCodeRequest,
} from '@/features/research/services/research.service'
import { overviewCounts, pairRows, versionStrip } from '@/features/research/utils/overview'

const SELECTED_STUDY_KEY = 'florisboard_research_study'
const GENERIC_ACTION_ERROR = 'No pudimos completar la acción. Inténtalo nuevamente.'

export const useResearchStore = defineStore('research', () => {
  const studies = ref([])
  const selectedStudyId = ref(localStorage.getItem(SELECTED_STUDY_KEY) || null)
  const participants = ref([])
  const runs = ref([])
  const batches = ref([])
  const protocols = ref([])
  const isLoading = ref(false)
  const isMutating = ref(false)
  const error = ref('')

  const selectedStudy = computed(
    () => studies.value.find((study) => study.id === selectedStudyId.value) ?? null,
  )
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

      if (selectedStudyId.value && !studies.value.some((study) => study.id === selectedStudyId.value)) {
        persistSelection(null)
      }

      if (!selectedStudyId.value && studies.value.length === 1) {
        persistSelection(studies.value[0].id)
      }

      if (selectedStudyId.value) {
        await loadOverview()
      }
    } catch {
      error.value = 'No pudimos cargar tus estudios. Inténtalo nuevamente.'
    } finally {
      isLoading.value = false
    }
  }

  function selectStudy(studyId) {
    persistSelection(studyId)
    clearStudyData()
    loadOverview()
  }

  async function loadOverview() {
    if (!selectedStudyId.value) return

    isLoading.value = true
    error.value = ''

    try {
      const [participantsData, runsData, batchesData, protocolsData] = await Promise.all([
        listParticipants(selectedStudyId.value),
        listRuns(selectedStudyId.value),
        listAnnotationBatches(selectedStudyId.value),
        listProtocols(selectedStudyId.value),
      ])

      participants.value = participantsData
      runs.value = runsData
      batches.value = batchesData
      protocols.value = protocolsData
    } catch {
      error.value = 'No pudimos cargar el resumen del estudio. Inténtalo nuevamente.'
    } finally {
      isLoading.value = false
    }
  }

  async function addStudy({ code, title }) {
    const study = await runAction(
      () => createStudyRequest({ code, title }),
      (requestError) =>
        requestError.status === 409 ? 'Ya existe un estudio con ese código' : requestError.message,
    )

    studies.value = [study, ...studies.value]
    selectStudy(study.id)

    return study
  }

  async function saveProtocolDraft({ taskAPrompt, taskBPrompt }) {
    const protocol = await runAction(() =>
      createProtocolRequest(selectedStudyId.value, { taskAPrompt, taskBPrompt }),
    )

    await loadOverview()

    return protocol
  }

  async function activateStudyProtocol(protocolId) {
    const protocol = await runAction(() =>
      activateProtocolRequest(selectedStudyId.value, protocolId),
    )

    await Promise.all([refreshStudies(), loadOverview()])

    return protocol
  }

  async function addParticipant() {
    const participant = await runAction(() => createParticipantRequest(selectedStudyId.value))

    await loadOverview()

    return participant
  }

  // Devuelve el código en claro al llamador: nunca se conserva en el store.
  async function issueAccessCode(participantId) {
    const credential = await runAction(() =>
      generateAccessCodeRequest(selectedStudyId.value, participantId),
    )

    await loadOverview()

    return credential
  }

  async function revokeParticipantCode(runId) {
    await runAction(() => revokeAccessCodeRequest(selectedStudyId.value, runId))
    await loadOverview()
  }

  // Regenerar = revocar el código pendiente y, solo si eso funciona, emitir uno nuevo.
  async function reissueAccessCode(participantId, runId) {
    await runAction(() => revokeAccessCodeRequest(selectedStudyId.value, runId))

    return issueAccessCode(participantId)
  }

  async function runAction(requestFn, mapError = (requestError) => requestError.message) {
    isMutating.value = true

    try {
      return await requestFn()
    } catch (requestError) {
      throw new Error(mapError(requestError) || GENERIC_ACTION_ERROR, { cause: requestError })
    } finally {
      isMutating.value = false
    }
  }

  async function refreshStudies() {
    try {
      studies.value = await listStudies()
    } catch {
      // El estudio seleccionado conserva sus datos; el estado se actualizará en la próxima carga.
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
    addStudy,
    saveProtocolDraft,
    activateStudyProtocol,
    addParticipant,
    issueAccessCode,
    revokeParticipantCode,
    reissueAccessCode,
  }
})
