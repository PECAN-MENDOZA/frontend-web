<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import StudentCredentialDialog from '@/features/students/components/StudentCredentialDialog.vue'
import { useReportDownload } from '@/features/reports/composables/useReportDownload'
import { useStudentDetail } from '@/features/students/composables/useStudentDetail'
import { formatPercentage } from '@/features/dashboard/utils/formatters'
import AcceptanceTrendPanel from '@/shared/components/insights/AcceptanceTrendPanel.vue'
import ErrorTypesPanel from '@/shared/components/insights/ErrorTypesPanel.vue'
import FeedbackMixPanel from '@/shared/components/insights/FeedbackMixPanel.vue'
import MetricCard from '@/shared/components/insights/MetricCard.vue'
import TopWordsTable from '@/shared/components/insights/TopWordsTable.vue'

const router = useRouter()
const { studentsStore, selectedMonth, monthOptions, refreshStudent } = useStudentDetail()
const student = computed(() => studentsStore.selectedStudent)
const studentId = computed(() => student.value?.id)
const resetCredential = computed(() =>
  studentsStore.resetPinCredentials
    ? { ...studentsStore.resetPinCredentials, studentRealName: student.value?.name }
    : null,
)
const {
  buttonLabel: reportButtonLabel,
  errorMessage: reportErrorMessage,
  isLoading: isReportLoading,
  isReportAvailable,
  downloadReport,
} = useReportDownload(studentId, selectedMonth)

function resetPin() {
  if (!studentId.value) return
  studentsStore.resetStudentPin(studentId.value)
}
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

    <Message v-if="studentsStore.resetPinErrorMessage" severity="warn" :closable="false">
      {{ studentsStore.resetPinErrorMessage }}
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
            label="Regenerar PIN"
            icon="pi pi-key"
            severity="secondary"
            outlined
            :loading="studentsStore.isResettingPin"
            @click="resetPin"
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

      <section class="metrics-grid" aria-label="Metricas de aprendizaje del estudiante">
        <MetricCard
          label="Aceptacion de sugerencias"
          :value="formatPercentage(student.acceptanceRate)"
          :change="`${student.acceptedSuggestions} de ${student.totalSubmissions} aceptadas`"
          icon="pi pi-check-circle"
          tone="ocean"
        />
        <MetricCard
          label="Envios del mes"
          :value="student.totalSubmissions"
          change="Solicitudes hechas desde el teclado"
          icon="pi pi-send"
          tone="coral"
        />
        <MetricCard
          label="Palabra recurrente"
          :value="student.primarySignal"
          change="Principal refuerzo aceptado"
          icon="pi pi-sparkles"
          tone="amber"
        />
      </section>

      <AcceptanceTrendPanel
        :trend="studentsStore.acceptanceTrend"
        :loading="studentsStore.isInsightsLoading"
      />

      <div class="student-detail-grid">
        <FeedbackMixPanel
          :items="student.feedbackMix"
          title="Como respondio este estudiante"
          eyebrow="Feedback individual"
        />

        <section class="panel student-context">
          <p class="overline">Contexto docente</p>
          <h2>Notas para la proxima conversacion</h2>
          <p>{{ student.notes || 'Aun no se agregaron notas docentes.' }}</p>
          <dl>
            <div>
              <dt>Aceptadas</dt>
              <dd>{{ student.acceptedSuggestions }}</dd>
            </div>
            <div>
              <dt>Ignoradas</dt>
              <dd>{{ student.rejectedSuggestions }}</dd>
            </div>
            <div>
              <dt>Sin respuesta</dt>
              <dd>{{ student.unansweredSuggestions }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <ErrorTypesPanel
        :error-types="studentsStore.errorTypes"
        :loading="studentsStore.isInsightsLoading"
      />

      <TopWordsTable :words="student.topWords" />

      <StudentCredentialDialog
        :credential="resetCredential"
        header="Nuevo PIN temporal"
        intro="Entrega este nuevo PIN al estudiante. El alias se mantiene igual."
        action-label="Ya entregue el nuevo PIN"
        @close="studentsStore.clearResetPinCredentials"
      />
    </template>
  </div>
</template>
