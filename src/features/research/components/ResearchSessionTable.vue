<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import { statusLabel, statusSeverity } from '@/features/research/utils/overview'
import {
  annotationState,
  formatDuration,
  incidentSummary,
  runActions,
  runReason,
  truncateText,
} from '@/features/research/utils/sessions'
import { conditionLabel, taskLabel } from '@/features/research/utils/study'

const REASON_PREVIEW_LENGTH = 48

const props = defineProps({
  runs: {
    type: Array,
    required: true,
  },
  batches: {
    type: Array,
    required: true,
  },
  isFiltered: {
    type: Boolean,
    required: true,
  },
  isLoading: {
    type: Boolean,
    required: true,
  },
  isBusy: {
    type: Boolean,
    required: true,
  },
  pendingAction: {
    type: Object,
    default: null,
  },
})

defineEmits(['cancel', 'fail', 'exclude', 'clear-filters'])

// Ninguna acción mientras haya una mutación en curso o el estudio aún esté cargando.
const isLocked = computed(() => props.isBusy || props.isLoading)

const rows = computed(() =>
  props.runs.map((run) => {
    const reason = runReason(run)

    return {
      id: run.id,
      pseudonym: run.pseudonym,
      task: taskLabel(run.task),
      condition: conditionLabel(run.condition),
      status: { label: statusLabel(run.status), severity: statusSeverity(run.status) },
      excluded: Boolean(run.excluded),
      duration: formatDuration(run.durationMs),
      appVersion: run.appVersion || '—',
      modelVersion: run.modelVersion || '—',
      backendVersion: run.backendVersion ? `Versión del servicio: ${run.backendVersion}` : '',
      incidentCount: run.incidentCount ?? 0,
      incidents: incidentSummary(run),
      annotation: annotationState(run, props.batches),
      reason,
      reasonPreview: truncateText(reason, REASON_PREVIEW_LENGTH),
      actions: runActions(run),
      run,
    }
  }),
)

function rowClass(data) {
  return data.excluded ? 'research-session-row--excluded' : ''
}

function isRowPending(kind, runId) {
  return props.pendingAction?.kind === kind && props.pendingAction?.runId === runId
}
</script>

<template>
  <section class="panel table-panel research-sessions" aria-label="Sesiones del estudio">
    <div class="panel__header">
      <div>
        <p class="overline">Control de calidad</p>
        <h2>Sesiones</h2>
      </div>
      <span class="research-sessions__count" aria-live="polite">
        {{ rows.length }} {{ rows.length === 1 ? 'sesión' : 'sesiones' }}
      </span>
    </div>

    <div v-if="isLoading && !runs.length" class="directory-loading" aria-busy="true">
      <Skeleton v-for="item in 5" :key="item" height="3rem" />
    </div>
    <div v-else-if="!runs.length && isFiltered" class="research-table-empty">
      <p>Ninguna sesión coincide con los filtros elegidos.</p>
      <Button
        label="Quitar filtros"
        icon="pi pi-filter-slash"
        severity="secondary"
        text
        size="small"
        @click="$emit('clear-filters')"
      />
    </div>
    <p v-else-if="!runs.length" class="research-table-empty">
      Aún no hay sesiones. Aparecerán aquí cuando emitas códigos de acceso a los participantes.
    </p>
    <DataTable
      v-else
      :value="rows"
      data-key="id"
      size="small"
      scrollable
      scroll-height="min(64vh, 40rem)"
      :row-class="rowClass"
      class="research-session-table"
      table-style="min-width: 78rem"
    >
      <Column header="Participante" frozen>
        <template #body="{ data }">
          <strong class="research-pseudonym">{{ data.pseudonym }}</strong>
        </template>
      </Column>
      <Column field="task" header="Tarea" />
      <Column field="condition" header="Condición" />
      <Column header="Estado">
        <template #body="{ data }">
          <div class="research-session-table__tags">
            <Tag :value="data.status.label" :severity="data.status.severity" rounded />
            <Tag v-if="data.excluded" value="Excluida" severity="danger" rounded />
          </div>
        </template>
      </Column>
      <Column header="Duración">
        <template #body="{ data }">
          <span class="research-session-table__number">{{ data.duration }}</span>
        </template>
      </Column>
      <Column header="Versiones">
        <template #body="{ data }">
          <span
            v-tooltip.bottom="data.backendVersion || undefined"
            class="research-session-table__versions"
          >
            {{ data.appVersion }} · {{ data.modelVersion }}
          </span>
        </template>
      </Column>
      <Column header="Incidencias">
        <template #body="{ data }">
          <span
            v-tooltip.bottom="data.incidents || undefined"
            class="research-session-table__number"
            :class="{ 'research-session-table__number--alert': data.incidentCount > 0 }"
          >
            {{ data.incidentCount }}
          </span>
        </template>
      </Column>
      <Column header="Anotación">
        <template #body="{ data }">
          <span v-if="data.annotation" class="research-session-table__muted">
            {{ data.annotation }}
          </span>
          <span v-else class="research-session-table__muted">—</span>
        </template>
      </Column>
      <Column header="Motivo">
        <template #body="{ data }">
          <span
            v-if="data.reason"
            v-tooltip.bottom="data.reason !== data.reasonPreview ? data.reason : undefined"
            class="research-session-table__reason"
          >
            {{ data.reasonPreview }}
          </span>
          <span v-else class="research-session-table__muted">—</span>
        </template>
      </Column>
      <Column header="Acciones">
        <template #body="{ data }">
          <div class="research-directory__actions">
            <Button
              v-if="data.actions.canCancel"
              label="Cancelar"
              icon="pi pi-ban"
              size="small"
              severity="secondary"
              text
              :disabled="isLocked"
              :loading="isRowPending('cancel', data.id)"
              @click="$emit('cancel', data.run)"
            />
            <Button
              v-if="data.actions.canFail"
              label="Fallo técnico"
              icon="pi pi-bolt"
              size="small"
              severity="danger"
              text
              :disabled="isLocked"
              :loading="isRowPending('fail', data.id)"
              @click="$emit('fail', data.run)"
            />
            <Button
              v-if="data.actions.canExclude"
              label="Excluir"
              icon="pi pi-eye-slash"
              size="small"
              severity="danger"
              text
              :disabled="isLocked"
              :loading="isRowPending('exclude', data.id)"
              @click="$emit('exclude', data.run)"
            />
            <span
              v-if="!data.actions.canCancel && !data.actions.canFail && !data.actions.canExclude"
              class="research-session-table__muted"
              >—</span
            >
          </div>
        </template>
      </Column>
    </DataTable>
  </section>
</template>
