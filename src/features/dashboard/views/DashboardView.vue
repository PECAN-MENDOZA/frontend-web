<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import StudentTable from '@/features/dashboard/components/StudentTable.vue'
import { useDashboard } from '@/features/dashboard/composables/useDashboard'
import { useAuthStore } from '@/features/auth/store/auth.store'
import PageHeader from '@/shared/components/PageHeader.vue'
import ErrorDistribution from '@/shared/components/insights/ErrorDistribution.vue'
import MetricCard from '@/shared/components/insights/MetricCard.vue'
import TopWordsTable from '@/shared/components/insights/TopWordsTable.vue'

const { dashboardStore, selectedMonth, monthOptions, refreshDashboard } = useDashboard()
const authStore = useAuthStore()

const teacherFirstName = computed(() => authStore.user?.name.split(' ')[0] ?? 'docente')
const leadingError = computed(() => dashboardStore.errorDistribution[0])
</script>

<template>
  <div class="dashboard-page">
    <PageHeader
      eyebrow="Revisión de aprendizaje de mayo"
      :title="`Buenos días, ${teacherFirstName}.`"
      description="Una vista enfocada en las señales que pueden orientar tu próxima conversación en el aula."
    >
      <template #actions>
        <Select
          v-model="selectedMonth"
          :options="monthOptions"
          option-label="label"
          option-value="value"
          aria-label="Seleccionar mes del reporte"
        />
        <Button
          label="Actualizar"
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
      La tasa de aceptación no está disponible temporalmente desde la API. Las demás señales del aula
      están actualizadas.
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
      <section class="metrics-grid" aria-label="Métricas del aula">
        <MetricCard
          label="Estudiantes activos"
          :value="dashboardStore.metrics.activeStudents.value"
          :change="dashboardStore.metrics.activeStudents.change"
          icon="pi pi-users"
          tone="ocean"
        />
        <MetricCard
          label="Aceptación de sugerencias"
          :value="dashboardStore.metrics.acceptanceRate.value"
          :change="dashboardStore.metrics.acceptanceRate.change"
          icon="pi pi-check-circle"
          tone="coral"
        />
        <MetricCard
          label="Errores detectados"
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
          <p class="overline">Nota docente</p>
          <h2>{{ leadingError.type }} es la principal oportunidad de mejora este mes.</h2>
          <p>
            {{ leadingError.percentage }}% de las señales detectadas corresponden a errores de tipo
            {{ leadingError.type.toLowerCase() }}. Una actividad breve y enfocada puede facilitar la
            siguiente sesión de escritura.
          </p>
          <Button label="Ver actividad sugerida" icon="pi pi-arrow-up-right" icon-pos="right" />
          <span>Actualizado {{ dashboardStore.dashboard.updatedAt }}</span>
        </section>
      </div>

      <StudentTable :students="dashboardStore.students" />
      <TopWordsTable :words="dashboardStore.topWords" />
    </template>
  </div>
</template>
