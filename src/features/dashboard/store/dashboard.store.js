import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getDashboardSummary } from '@/features/dashboard/services/dashboard.service'

export const useDashboardStore = defineStore('dashboard', () => {
  const dashboard = ref(null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  const metrics = computed(() => dashboard.value?.metrics ?? {})
  const students = computed(() => dashboard.value?.students ?? [])
  const feedbackMix = computed(() => dashboard.value?.feedbackMix ?? [])
  const topWords = computed(() => dashboard.value?.topWords ?? [])

  async function loadDashboard(month) {
    isLoading.value = true
    errorMessage.value = ''

    try {
      dashboard.value = await getDashboardSummary(month)
    } catch {
      errorMessage.value = 'No pudimos cargar el resumen del aula. Intentalo nuevamente.'
    } finally {
      isLoading.value = false
    }
  }

  return {
    dashboard,
    isLoading,
    errorMessage,
    metrics,
    students,
    feedbackMix,
    topWords,
    loadDashboard,
  }
})
