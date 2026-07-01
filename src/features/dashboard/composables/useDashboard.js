import { onMounted, ref, watch } from 'vue'
import { useDashboardStore } from '@/features/dashboard/store/dashboard.store'
import { getCurrentMonthValue, getMonthOptions } from '@/shared/utils/month'

export function useDashboard() {
  const dashboardStore = useDashboardStore()
  const selectedMonth = ref(getCurrentMonthValue())
  const monthOptions = getMonthOptions()

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
