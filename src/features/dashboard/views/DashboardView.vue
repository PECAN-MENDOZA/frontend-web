<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import ErrorDistribution from '@/features/dashboard/components/ErrorDistribution.vue'
import MetricCard from '@/features/dashboard/components/MetricCard.vue'
import StudentTable from '@/features/dashboard/components/StudentTable.vue'
import TopWordsTable from '@/features/dashboard/components/TopWordsTable.vue'
import { useDashboard } from '@/features/dashboard/composables/useDashboard'
import { useAuthStore } from '@/features/auth/store/auth.store'
import PageHeader from '@/shared/components/PageHeader.vue'

const { dashboardStore, selectedMonth, monthOptions, refreshDashboard } = useDashboard()
const authStore = useAuthStore()

const teacherFirstName = computed(() => authStore.user?.name.split(' ')[0] ?? 'teacher')
const leadingError = computed(() => dashboardStore.errorDistribution[0])
</script>

<template>
  <div class="dashboard-page">
    <PageHeader
      eyebrow="May learning review"
      :title="`Good morning, ${teacherFirstName}.`"
      description="A focused view of the signals that can shape your next classroom conversation."
    >
      <template #actions>
        <Select
          v-model="selectedMonth"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          aria-label="Select report month"
        />
        <Button
          label="Refresh"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="dashboardStore.isLoading"
          @click="refreshDashboard"
        />
      </template>
    </PageHeader>

    <Message v-if="dashboardStore.errorMessage" severity="error">
      {{ dashboardStore.errorMessage }}
    </Message>

    <Message
      v-if="dashboardStore.dashboard && !dashboardStore.dashboard.hasAcceptanceData"
      severity="warn"
      :closable="false"
    >
      Acceptance rate is temporarily unavailable from the API. The remaining classroom signals are
      live.
    </Message>

    <template v-if="dashboardStore.isLoading && !dashboardStore.dashboard">
      <div class="metrics-grid">
        <Skeleton v-for="item in 3" :key="item" height="9rem" border-radius="1.25rem" />
      </div>
      <div class="dashboard-grid">
        <Skeleton height="23rem" border-radius="1.25rem" />
        <Skeleton height="23rem" border-radius="1.25rem" />
      </div>
    </template>

    <template v-else-if="dashboardStore.dashboard">
      <section class="metrics-grid" aria-label="Classroom metrics">
        <MetricCard
          label="Active students"
          :value="dashboardStore.metrics.activeStudents.value"
          :change="dashboardStore.metrics.activeStudents.change"
          icon="pi pi-users"
          tone="ocean"
        />
        <MetricCard
          label="Suggestion acceptance"
          :value="dashboardStore.metrics.acceptanceRate.value"
          :change="dashboardStore.metrics.acceptanceRate.change"
          icon="pi pi-check-circle"
          tone="coral"
        />
        <MetricCard
          label="Detected errors"
          :value="dashboardStore.metrics.detectedErrors.value"
          :change="dashboardStore.metrics.detectedErrors.change"
          icon="pi pi-compass"
          tone="amber"
        />
      </section>

      <div class="dashboard-grid">
        <ErrorDistribution :items="dashboardStore.errorDistribution" />

        <section class="panel insight-panel">
          <div class="insight-panel__icon">
            <i class="pi pi-lightbulb"></i>
          </div>
          <p class="overline">Teaching note</p>
          <h2>{{ leadingError.type }} is the clearest opportunity this month.</h2>
          <p>
            {{ leadingError.percentage }}% of detected signals are
            {{ leadingError.type.toLowerCase() }}-related. A short focused exercise could make the
            next writing session easier.
          </p>
          <Button label="Open suggested activity" icon="pi pi-arrow-up-right" icon-pos="right" />
          <span>Updated {{ dashboardStore.dashboard.updatedAt }}</span>
        </section>
      </div>

      <StudentTable :students="dashboardStore.students" />
      <TopWordsTable :words="dashboardStore.topWords" />
    </template>
  </div>
</template>
