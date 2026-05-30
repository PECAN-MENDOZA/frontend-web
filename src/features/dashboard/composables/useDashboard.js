import { onMounted, ref, watch } from 'vue'
import { useDashboardStore } from '@/features/dashboard/store/dashboard.store'

export function useDashboard() {
  const dashboardStore = useDashboardStore()
  const selectedMonth = ref('2026-05')
  const monthOptions = [
    { label: 'Mayo 2026', value: '2026-05' },
    { label: 'Abril 2026', value: '2026-04' },
    { label: 'Marzo 2026', value: '2026-03' },
  ]

  onMounted(() => {
    if (!dashboardStore.dashboard) {
      dashboardStore.loadDashboard(selectedMonth.value)
    }
  })

  watch(selectedMonth, (month) => dashboardStore.loadDashboard(month))

  function refreshDashboard() {
    dashboardStore.loadDashboard(selectedMonth.value)
  }

  return {
    dashboardStore,
    selectedMonth,
    monthOptions,
    refreshDashboard,
  }
}
