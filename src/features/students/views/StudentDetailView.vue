<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import { useReportDownload } from '@/features/reports/composables/useReportDownload'
import { useStudentDetail } from '@/features/students/composables/useStudentDetail'
import { formatPercentage } from '@/features/dashboard/utils/formatters'
import ErrorDistribution from '@/shared/components/insights/ErrorDistribution.vue'
import MetricCard from '@/shared/components/insights/MetricCard.vue'
import TopWordsTable from '@/shared/components/insights/TopWordsTable.vue'

const router = useRouter()
const { studentsStore, selectedMonth, monthOptions, refreshStudent } = useStudentDetail()
const student = computed(() => studentsStore.selectedStudent)
const studentId = computed(() => student.value?.id)
const {
  buttonLabel: reportButtonLabel,
  errorMessage: reportErrorMessage,
  isLoading: isReportLoading,
  isReportAvailable,
  downloadReport,
} = useReportDownload(studentId, selectedMonth)
</script>

<template>
  <div class="student-detail-page">
    <Button
      label="Volver a estudiantes"
      icon="pi pi-arrow-left"
      severity="secondary"
      text
      @click="router.push({ name: 'students' })"
    />

    <Message v-if="studentsStore.errorMessage" severity="error">
      {{ studentsStore.errorMessage }}
    </Message>

    <Message v-if="reportErrorMessage" severity="warn" :closable="false">
      {{ reportErrorMessage }}
    </Message>

    <template v-if="studentsStore.isDetailLoading && !student">
      <Skeleton height="12rem" border-radius="1.25rem" />
      <div class="metrics-grid">
        <Skeleton v-for="item in 3" :key="item" height="9rem" border-radius="1.25rem" />
      </div>
    </template>

    <template v-else-if="student">
      <section class="student-profile panel">
        <div class="student-profile__identity">
          <Avatar :label="student.initials" size="xlarge" shape="circle" />
          <div>
            <p class="overline">Perfil del estudiante</p>
            <h1>{{ student.name }}</h1>
            <span>{{ student.alias }}</span>
          </div>
        </div>
        <div class="student-profile__actions">
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
            :loading="studentsStore.isDetailLoading"
            @click="refreshStudent"
          />
          <Button
            :label="reportButtonLabel"
            icon="pi pi-download"
            :loading="isReportLoading"
            :disabled="!isReportAvailable || isReportLoading"
            @click="downloadReport"
          />
        </div>
      </section>

      <section class="metrics-grid" aria-label="Métricas de aprendizaje del estudiante">
        <MetricCard
          label="Aceptación de sugerencias"
          :value="formatPercentage(student.acceptanceRate)"
          :change="`${student.acceptedSuggestions} de ${student.totalSubmissions} aceptadas`"
          icon="pi pi-check-circle"
          tone="ocean"
        />
        <MetricCard
          label="Señales detectadas"
          :value="student.totalErrors"
          change="Durante el mes seleccionado"
          icon="pi pi-compass"
          tone="coral"
        />
        <MetricCard
          label="Señal principal"
          :value="student.primarySignal"
          change="Área de refuerzo más frecuente"
          icon="pi pi-chart-bar"
          tone="amber"
        />
      </section>

      <div class="student-detail-grid">
        <ErrorDistribution :items="student.errorDistribution" />

        <section class="panel student-context">
          <p class="overline">Contexto docente</p>
          <h2>Notas para la próxima conversación</h2>
          <p>{{ student.notes || 'Aún no se agregaron notas docentes.' }}</p>
          <dl>
            <div>
              <dt>Aceptadas</dt>
              <dd>{{ student.acceptedSuggestions }}</dd>
            </div>
            <div>
              <dt>Rechazadas</dt>
              <dd>{{ student.rejectedSuggestions }}</dd>
            </div>
            <div>
              <dt>Sin respuesta</dt>
              <dd>{{ student.unansweredSuggestions }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <TopWordsTable :words="student.topWords" />
    </template>
  </div>
</template>
