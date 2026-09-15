import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  listAnnotationBatches,
  listParticipants,
  listRuns,
  listStudies,
} from '@/features/research/services/research.service'
import { overviewCounts, pairRows, versionStrip } from '@/features/research/utils/overview'

const SELECTED_STUDY_KEY = 'florisboard_research_study'

export const useResearchStore = defineStore('research', () => {
  const studies = ref([])
  const selectedStudyId = ref(localStorage.getItem(SELECTED_STUDY_KEY) || null)
  const participants = ref([])
  const runs = ref([])
  const batches = ref([])
  const isLoading = ref(false)
  const error = ref('')

  const selectedStudy = computed(
    () => studies.value.find((study) => study.id === selectedStudyId.value) ?? null,
  )
  const rows = computed(() => pairRows(participants.value, runs.value))
  const counts = computed(() => overviewCounts(rows.value, runs.value, batches.value))
  const versions = computed(() => versionStrip(selectedStudy.value, runs.value))

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
    loadOverview()
  }

  async function loadOverview() {
    if (!selectedStudyId.value) return

    isLoading.value = true
    error.value = ''

    try {
      const [participantsData, runsData, batchesData] = await Promise.all([
        listParticipants(selectedStudyId.value),
        listRuns(selectedStudyId.value),
        listAnnotationBatches(selectedStudyId.value),
      ])

      participants.value = participantsData
      runs.value = runsData
      batches.value = batchesData
    } catch {
      error.value = 'No pudimos cargar el resumen del estudio. Inténtalo nuevamente.'
    } finally {
      isLoading.value = false
    }
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
    isLoading,
    error,
    rows,
    counts,
    versions,
    loadStudies,
    selectStudy,
    loadOverview,
  }
})
