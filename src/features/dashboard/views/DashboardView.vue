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
import FeedbackMixPanel from '@/shared/components/insights/FeedbackMixPanel.vue'
import MetricCard from '@/shared/components/insights/MetricCard.vue'
import TopWordsTable from '@/shared/components/insights/TopWordsTable.vue'

const { dashboardStore, selectedMonth, monthOptions, refreshDashboard } = useDashboard()
const authStore = useAuthStore()

const teacherFirstName = computed(() => authStore.user?.name.split(' ')[0] ?? 'docente')
const recurrentWord = computed(() => dashboardStore.dashboard?.recurrentWord)
const focusStudent = computed(() => dashboardStore.dashboard?.focusStudent)
const focusTitle = computed(() => {
  if (recurrentWord.value) return `"${recurrentWord.value.word}" merece refuerzo breve esta semana.`
  if (focusStudent.value) return `${focusStudent.value.name} necesita una mirada cercana.`
  return 'Cuando haya envíos, este panel marcará la prioridad del aula.'
})
const focusDescription = computed(() => {
  if (recurrentWord.value) {
    return `Aparece ${recurrentWord.value.frequency} veces entre las correcciones aceptadas. Conviene preparar una actividad corta con ejemplos similares.`
  }

  if (focusStudent.value) {
    return `${focusStudent.value.name} acumula ${focusStudent.value.recurringWords} palabras recurrentes este mes.`
  }

  return 'El backend ya no clasifica tipos de error; ahora la lectura se centra en aceptación y palabras corregidas.'
})
</script>

<template>
  <div class="dashboard-page">
    <PageHeader
      eyebrow="Seguimiento mensual"
      :title="`Buenos días, ${teacherFirstName}.`"
      description="Una vista docente centrada en lo que el backend ahora puede medir: aceptación de sugerencias, palabras recurrentes y estudiantes que necesitan acompañamiento."
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
      severity="info"
      :closable="false"
    >
      Aún no hay envíos para el mes seleccionado. La vista se actualizará cuando los estudiantes usen el
      teclado.
    </Message>

    <template v-if="dashboardStore.isLoading && !dashboardStore.dashboard">
      <div class="metrics-grid metrics-grid--four">
        <Skeleton v-for="item in 4" :key="item" height="9rem" border-radius="1.25rem" />
      </div>
      <div class="dashboard-grid">
        <Skeleton height="23rem" border-radius="1.25rem" />
        <Skeleton height="23rem" border-radius="1.25rem" />
      </div>
    </template>

    <template v-else-if="dashboardStore.dashboard">
      <section class="metrics-grid metrics-grid--four" aria-label="Métricas del aula">
        <MetricCard
          label="Estudiantes vinculados"
          :value="dashboardStore.metrics.activeStudents.value"
          :change="dashboardStore.metrics.activeStudents.change"
          icon="pi pi-users"
          tone="ocean"
        />
        <MetricCard
          label="Aceptación global"
          :value="dashboardStore.metrics.acceptanceRate.value"
          :change="dashboardStore.metrics.acceptanceRate.change"
          icon="pi pi-check-circle"
          tone="coral"
        />
        <MetricCard
          label="Palabras recurrentes"
          :value="dashboardStore.metrics.recurringWords.value"
          :change="dashboardStore.metrics.recurringWords.change"
          icon="pi pi-list-check"
          tone="amber"
        />
        <MetricCard
          label="Acompañamiento"
          :value="dashboardStore.metrics.studentsToSupport.value"
          :change="dashboardStore.metrics.studentsToSupport.change"
          icon="pi pi-heart"
          tone="moss"
        />
      </section>

      <div class="dashboard-grid dashboard-grid--redesign">
        <FeedbackMixPanel
          :items="dashboardStore.feedbackMix"
          title="Cómo respondió el aula"
          eyebrow="Aceptadas e ignoradas"
        />

        <section class="panel insight-panel">
          <div class="insight-panel__icon">
            <i class="pi pi-lightbulb"></i>
          </div>
          <p class="overline">Prioridad docente</p>
          <h2>{{ focusTitle }}</h2>
          <p>{{ focusDescription }}</p>
          <span>Actualizado {{ dashboardStore.dashboard.updatedAt }}</span>
        </section>
      </div>

      <StudentTable :students="dashboardStore.students" />
      <TopWordsTable :words="dashboardStore.topWords" />
    </template>
  </div>
</template>
