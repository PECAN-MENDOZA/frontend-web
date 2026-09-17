<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { assignmentStatusLabel } from '@/features/tests/utils/attempts'
import { formatDateTime } from '@/features/research/utils/dates'

const props = defineProps({
  rows: { type: Array, required: true },
  classrooms: { type: Array, required: true },
  pendingAttemptId: { type: String, default: null },
})

const emit = defineEmits(['view', 'exclude'])
const classroomNames = computed(
  () => new Map(props.classrooms.map((classroom) => [classroom.id, classroom.name])),
)

function classroomName(row) {
  return classroomNames.value.get(row.classroomId) ?? 'Salón no disponible'
}

function statusSeverity(row) {
  if (row.excluded) return 'danger'

  return (
    { PENDING: 'secondary', IN_PROGRESS: 'warn', COMPLETED: 'success', CANCELLED: 'contrast' }[
      row.attemptStatus
    ] ?? 'secondary'
  )
}
</script>

<template>
  <DataTable
    :value="rows"
    data-key="studentId"
    class="attempts-table"
    :row-class="(row) => (row.excluded ? 'attempts-table__row--excluded' : '')"
    paginator
    :rows="15"
    :rows-per-page-options="[15, 30, 60]"
    table-style="min-width: 55rem"
  >
    <template #empty>
      <p class="table-empty">
        Todavía no hay alumnos asignados. Usa «Asignar» para elegir un salón o alumnos concretos.
      </p>
    </template>
    <Column header="Username">
      <template #body="{ data }">
        <code class="classroom-username">{{ data.studentUsername || 'Sin identificar' }}</code>
      </template>
    </Column>
    <Column header="Salón">
      <template #body="{ data }">
        {{ classroomName(data) }}
      </template>
    </Column>
    <Column header="Estado">
      <template #body="{ data }">
        <Tag :value="assignmentStatusLabel(data)" :severity="statusSeverity(data)" rounded />
      </template>
    </Column>
    <Column header="Inicio">
      <template #body="{ data }">
        <span class="test-number">{{ formatDateTime(data.startedAt) }}</span>
      </template>
    </Column>
    <Column header="Acciones">
      <template #body="{ data }">
        <div v-if="data.attemptId" class="row-actions">
          <Button
            label="Ver respuestas"
            icon="pi pi-arrow-right"
            icon-pos="right"
            text
            size="small"
            @click="emit('view', data)"
          />
          <Button
            v-if="!data.excluded"
            label="Excluir"
            icon="pi pi-ban"
            severity="danger"
            text
            size="small"
            :loading="pendingAttemptId === data.attemptId"
            @click="emit('exclude', data)"
          />
        </div>
        <span v-else class="attempts-table__muted">Sin intento</span>
      </template>
    </Column>
  </DataTable>
</template>
