<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import { useToast } from 'primevue/usetoast'
import PageHeader from '@/shared/components/PageHeader.vue'
import ReasonDialog from '@/features/research/components/ReasonDialog.vue'
import ResearchSessionTable from '@/features/research/components/ResearchSessionTable.vue'
import StudySelector from '@/features/research/components/StudySelector.vue'
import { useResearchStore } from '@/features/research/store/research.store'
import { StudyChangedError } from '@/features/research/utils/mutations'
import { statusLabel } from '@/features/research/utils/overview'
import { READINESS_OPTIONS, filterRuns } from '@/features/research/utils/sessions'
import { conditionLabel } from '@/features/research/utils/study'

const TOAST_LIFE_MS = 4000
const RUN_STATUSES = ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'TECHNICAL_FAILURE']
const CONDITIONS = ['ASSISTED', 'UNASSISTED']

const STATUS_OPTIONS = RUN_STATUSES.map((value) => ({ value, label: statusLabel(value) }))
const CONDITION_OPTIONS = CONDITIONS.map((value) => ({ value, label: conditionLabel(value) }))

// Cada decisión: qué se le dice al investigador, qué acción del store la ejecuta y cómo se confirma.
const DECISIONS = {
  cancel: {
    title: 'Cancelar sesión',
    icon: 'pi pi-ban',
    confirmLabel: 'Cancelar sesión',
    description:
      'La sesión quedará cancelada y su código dejará de funcionar. El participante podrá recibir un código nuevo para esta condición.',
    action: 'cancelRun',
    successSummary: 'Sesión cancelada',
    failureSummary: 'No pudimos cancelar la sesión',
  },
  fail: {
    title: 'Declarar fallo técnico',
    icon: 'pi pi-bolt',
    confirmLabel: 'Declarar fallo',
    description:
      'La sesión se cerrará como fallo técnico y quedará fuera del análisis. El motivo se guardará junto con la incidencia.',
    action: 'failRunTechnically',
    successSummary: 'Fallo técnico registrado',
    failureSummary: 'No pudimos registrar el fallo técnico',
  },
  exclude: {
    title: 'Excluir del análisis',
    icon: 'pi pi-eye-slash',
    confirmLabel: 'Excluir sesión',
    description:
      'La sesión seguirá visible, pero no contará para ningún resultado. Esta exclusión no se puede revertir.',
    action: 'excludeRun',
    successSummary: 'Sesión excluida',
    failureSummary: 'No pudimos excluir la sesión',
  },
}

const researchStore = useResearchStore()
const toast = useToast()
const filters = reactive({ status: null, condition: null, readiness: null })
// Decisión en curso: { kind, run } mientras el diálogo de motivo está abierto.
const decision = ref(null)
const decisionError = ref('')
// Qué acción (y de qué fila) está en curso: solo ese botón muestra el spinner.
const pendingAction = ref(null)

const study = computed(() => researchStore.selectedStudy)
const isFiltered = computed(() => Boolean(filters.status || filters.condition || filters.readiness))
const filteredRuns = computed(() => filterRuns(researchStore.runs, filters))
const activeDecision = computed(() => (decision.value ? DECISIONS[decision.value.kind] : null))
const decisionTitle = computed(() =>
  decision.value ? `${activeDecision.value.title} · ${decision.value.run.pseudonym}` : '',
)

onMounted(() => {
  if (!researchStore.studies.length) {
    researchStore.loadStudies()
  }
})

function clearFilters() {
  filters.status = null
  filters.condition = null
  filters.readiness = null
}

function openDecision(kind, run) {
  decisionError.value = ''
  decision.value = { kind, run }
}

function closeDecision() {
  decision.value = null
}

async function confirmDecision(reason) {
  if (!decision.value) return

  const { kind, run } = decision.value
  const config = DECISIONS[kind]

  decisionError.value = ''
  pendingAction.value = { kind, runId: run.id }

  try {
    await researchStore[config.action](run.id, reason)

    decision.value = null
    notify('success', config.successSummary, `${run.pseudonym} quedó registrada con su motivo.`)
  } catch (error) {
    // Cambiar de estudio durante la operación no es un fallo: el backend ya la aplicó.
    if (error instanceof StudyChangedError) {
      decision.value = null
      notify('info', 'Estudio cambiado', error.message)
    } else {
      decisionError.value = error.message || config.failureSummary
    }
  } finally {
    pendingAction.value = null
  }
}

function notify(severity, summary, detail) {
  toast.add({ severity, summary, detail, life: TOAST_LIFE_MS })
}
</script>

<template>
  <div class="research-page">
    <PageHeader
      eyebrow="Panel de investigación"
      title="Sesiones"
      description="Revisa cada sesión experimental, sus versiones e incidencias, y decide cuáles entran al análisis."
    >
      <template #actions>
        <StudySelector
          v-if="researchStore.studies.length"
          :studies="researchStore.studies"
          :model-value="researchStore.selectedStudyId"
          :disabled="researchStore.isMutating"
          @update:model-value="researchStore.selectStudy"
        />
        <Button
          label="Actualizar"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          :loading="researchStore.isLoading"
          :disabled="!researchStore.selectedStudyId || researchStore.isMutating"
          @click="researchStore.refreshAll"
        />
      </template>
    </PageHeader>

    <template v-if="researchStore.isLoading && !researchStore.studies.length">
      <Skeleton height="3.5rem" border-radius="1.25rem" />
      <Skeleton height="22rem" border-radius="1.25rem" />
    </template>

    <div
      v-else-if="researchStore.error && !researchStore.studies.length"
      class="panel research-empty-state"
    >
      <i class="pi pi-exclamation-triangle research-empty-state__icon"></i>
      <h2>No pudimos cargar tus estudios</h2>
      <p>{{ researchStore.error }}</p>
      <Button label="Reintentar" icon="pi pi-refresh" @click="researchStore.loadStudies" />
    </div>

    <div v-else-if="!researchStore.studies.length" class="panel research-empty-state">
      <i class="pi pi-compass research-empty-state__icon"></i>
      <h2>Aún no hay un estudio</h2>
      <p>
        Crea un estudio desde <strong>Estudio</strong> para empezar a registrar sesiones
        experimentales.
      </p>
      <RouterLink
        :to="{ name: 'research-study' }"
        class="p-button p-component research-link-button"
      >
        <i class="pi pi-book p-button-icon p-button-icon-left" aria-hidden="true"></i>
        <span class="p-button-label">Ir a Estudio</span>
      </RouterLink>
    </div>

    <div v-else-if="!study" class="panel research-empty-state">
      <i class="pi pi-compass research-empty-state__icon"></i>
      <h2>Elige un estudio</h2>
      <p>Selecciona un estudio arriba para revisar sus sesiones.</p>
    </div>

    <div
      v-else-if="researchStore.error && !researchStore.runs.length"
      class="panel research-empty-state"
    >
      <i class="pi pi-exclamation-triangle research-empty-state__icon"></i>
      <h2>No pudimos cargar las sesiones</h2>
      <p>{{ researchStore.error }}</p>
      <Button
        label="Reintentar"
        icon="pi pi-refresh"
        :loading="researchStore.isLoading"
        @click="researchStore.loadOverview()"
      />
    </div>

    <template v-else>
      <Message v-if="researchStore.error" severity="error">
        {{ researchStore.error }}
      </Message>

      <div class="research-filters" role="group" aria-label="Filtrar sesiones">
        <label class="research-filters__field">
          <span>Estado</span>
          <Select
            v-model="filters.status"
            :options="STATUS_OPTIONS"
            option-label="label"
            option-value="value"
            placeholder="Todos"
            show-clear
            size="small"
          />
        </label>
        <label class="research-filters__field">
          <span>Condición</span>
          <Select
            v-model="filters.condition"
            :options="CONDITION_OPTIONS"
            option-label="label"
            option-value="value"
            placeholder="Todas"
            show-clear
            size="small"
          />
        </label>
        <label class="research-filters__field">
          <span>Disposición</span>
          <Select
            v-model="filters.readiness"
            :options="READINESS_OPTIONS"
            option-label="label"
            option-value="value"
            placeholder="Todas"
            show-clear
            size="small"
          />
        </label>
        <span class="research-filters__summary">
          {{ filteredRuns.length }} de {{ researchStore.runs.length }}
        </span>
        <Button
          v-if="isFiltered"
          label="Quitar filtros"
          icon="pi pi-filter-slash"
          severity="secondary"
          text
          size="small"
          @click="clearFilters"
        />
      </div>

      <ResearchSessionTable
        :runs="filteredRuns"
        :batches="researchStore.batches"
        :is-filtered="isFiltered"
        :is-loading="researchStore.isLoading"
        :is-busy="researchStore.isMutating"
        :pending-action="pendingAction"
        @cancel="openDecision('cancel', $event)"
        @fail="openDecision('fail', $event)"
        @exclude="openDecision('exclude', $event)"
        @clear-filters="clearFilters"
      />
    </template>

    <ReasonDialog
      :visible="Boolean(decision)"
      :title="decisionTitle"
      :description="activeDecision?.description ?? ''"
      :confirm-label="activeDecision?.confirmLabel ?? ''"
      :icon="activeDecision?.icon ?? 'pi pi-exclamation-triangle'"
      :is-saving="Boolean(pendingAction)"
      :error-message="decisionError"
      @update:visible="closeDecision"
      @submit="confirmDecision"
    />
  </div>
</template>
