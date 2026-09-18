import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  downloadPeriodReport,
  getClassroomActivity,
  getClassroomErrors,
  getLiveTests,
  getRecentCorrections,
  getStudentErrors,
  getStudentHelp,
  getStudentTests,
  getStudentWritings,
  listClassrooms,
} from '@/features/insights/services/insights.service.js'
import { presetRange } from '@/features/insights/utils/period.js'
import { saveBlob } from '@/features/research/utils/download.js'
import { requestErrorMessage } from '@/features/research/utils/errors.js'
import { createGuardedLoader } from '@/features/research/utils/mutations.js'

const PERIOD_KEY = 'insights_period'
const CLASSROOM_KEY = 'insights_selected_classroom_id'
const RECENT_LIMIT = 50
const LIVE_POLL_MS = 5000
const GENERIC_ERROR = 'No pudimos completar la acción. Inténtalo nuevamente.'

// Persistencia en localStorage: conveniencia para el docente (recordar su periodo y salón), no
// estado de sesión. Se envuelve en try/catch porque puede fallar (modo privado, cuota, SSR).
function readStored(key) {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStored(key, value) {
  try {
    if (value == null) globalThis.localStorage?.removeItem(key)
    else globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    // Sin persistencia disponible: la selección solo dura la sesión en memoria.
  }
}

function defaultPeriod() {
  return { ...presetRange('today'), preset: 'today' }
}

function emptyStudent() {
  return { errors: null, help: null, writings: [], tests: [] }
}

export const useInsightsStore = defineStore('insights', () => {
  const period = ref(readStored(PERIOD_KEY) ?? defaultPeriod())
  const selectedClassroomId = ref(readStored(CLASSROOM_KEY))
  const classrooms = ref([])
  const activity = ref(null)
  const recent = ref([])
  const classroomErrors = ref(null)
  const student = ref(emptyStudent())
  const live = ref([])
  const isLoading = ref(false)
  const isDownloading = ref(false)
  const errorMessage = ref('')
  const downloadMessage = ref('')
  const loadingStates = { classrooms: false, classroom: false, student: false, live: false }
  let livePolling = null
  let livePollingRequest = null

  function setLoading(name, value) {
    loadingStates[name] = value
    isLoading.value = Object.values(loadingStates).some(Boolean)
  }

  function loader(name, getSelectedStudyId) {
    return createGuardedLoader({
      getSelectedStudyId,
      setLoading: (value) => setLoading(name, value),
      setError: (message) => {
        errorMessage.value = message
      },
    })
  }

  const classroomsLoader = loader('classrooms')
  const classroomLoader = loader('classroom', () => selectedClassroomId.value)
  let studentLoaderId = null
  const studentLoader = loader('student', () => studentLoaderId)
  const liveLoader = loader('live')

  function setPeriod(nextPeriod) {
    period.value = nextPeriod
    writeStored(PERIOD_KEY, nextPeriod)
  }

  function selectClassroom(classroomId) {
    selectedClassroomId.value = classroomId
    writeStored(CLASSROOM_KEY, classroomId)
  }

  async function loadClassrooms() {
    const outcome = await classroomsLoader.load({
      request: listClassrooms,
      apply: (data) => {
        classrooms.value = data
        // Primer ingreso: se preselecciona el primer salón para no dejar la vista vacía.
        if (!selectedClassroomId.value && data.length > 0) {
          selectClassroom(data[0].id)
        }
      },
      fallback: 'No pudimos cargar tus salones. Inténtalo nuevamente.',
    })
    return outcome.ok
  }

  async function loadClassroomToday() {
    if (!selectedClassroomId.value) {
      const ok = await loadClassrooms()
      if (!ok || !selectedClassroomId.value) return false
    }

    const id = selectedClassroomId.value
    const outcome = await classroomLoader.load({
      studyId: id,
      request: () =>
        Promise.all([
          getClassroomActivity(id, period.value),
          getRecentCorrections(id, period.value, RECENT_LIMIT),
          getClassroomErrors(id, period.value),
        ]),
      apply: ([activityData, recentData, errorsData]) => {
        activity.value = activityData
        recent.value = recentData
        classroomErrors.value = errorsData
      },
      fallback: 'No pudimos cargar el salón. Inténtalo nuevamente.',
    })
    return outcome.ok
  }

  async function loadStudentToday(studentId) {
    studentLoaderId = studentId
    const outcome = await studentLoader.load({
      studyId: studentId,
      request: () =>
        Promise.all([
          getStudentErrors(studentId, period.value),
          getStudentHelp(studentId, period.value),
          getStudentWritings(studentId, period.value),
          getStudentTests(studentId),
        ]),
      apply: ([errors, help, writings, tests]) => {
        student.value = { errors, help, writings, tests }
      },
      fallback: 'No pudimos cargar la ficha del alumno. Inténtalo nuevamente.',
    })
    return outcome.ok
  }

  async function loadLive() {
    const outcome = await liveLoader.load({
      request: getLiveTests,
      apply: (data) => {
        live.value = data
      },
      fallback: 'No pudimos cargar las pruebas en curso. Inténtalo nuevamente.',
    })
    return outcome.ok
  }

  // Único polling del panel docente (spec §5): solo mientras /tests/live está montada.
  function startLivePolling() {
    stopLivePolling()
    livePolling = window.setInterval(() => {
      if (livePollingRequest) return livePollingRequest

      const request = loadLive()
      livePollingRequest = request
      return request.finally(() => {
        if (livePollingRequest === request) livePollingRequest = null
      })
    }, LIVE_POLL_MS)
  }

  function stopLivePolling() {
    if (livePolling !== null) window.clearInterval(livePolling)
    livePolling = null
    livePollingRequest = null
  }

  async function downloadReport(studentId) {
    isDownloading.value = true
    downloadMessage.value = ''

    try {
      const download = await downloadPeriodReport(studentId, period.value)
      saveBlob(download, `reporte-${studentId}-${period.value.from}_${period.value.to}.pdf`)
      return true
    } catch (error) {
      downloadMessage.value = requestErrorMessage(error, GENERIC_ERROR)
      return false
    } finally {
      isDownloading.value = false
    }
  }

  function reset() {
    stopLivePolling()
    classroomsLoader.invalidate()
    classroomLoader.invalidate()
    studentLoader.invalidate()
    liveLoader.invalidate()
    for (const name of Object.keys(loadingStates)) loadingStates[name] = false
    studentLoaderId = null

    classrooms.value = []
    selectedClassroomId.value = null
    activity.value = null
    recent.value = []
    classroomErrors.value = null
    student.value = emptyStudent()
    live.value = []
    isLoading.value = false
    isDownloading.value = false
    errorMessage.value = ''
    downloadMessage.value = ''
    // El salón elegido es de este docente; el periodo es solo preferencia de UI y se conserva.
    writeStored(CLASSROOM_KEY, null)
  }

  window.addEventListener('auth:signed-out', reset)

  return {
    period,
    selectedClassroomId,
    classrooms,
    activity,
    recent,
    classroomErrors,
    student,
    live,
    isLoading,
    isDownloading,
    errorMessage,
    downloadMessage,
    setPeriod,
    selectClassroom,
    loadClassrooms,
    loadClassroomToday,
    loadStudentToday,
    loadLive,
    startLivePolling,
    stopLivePolling,
    downloadReport,
    reset,
  }
})
