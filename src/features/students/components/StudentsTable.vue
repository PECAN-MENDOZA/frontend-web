<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { formatRelative } from '@/features/insights/utils/period.js'
import { classroomLabel } from '@/features/students/utils/students'

const ROWS_PER_PAGE = 15

// Directorio simple: quién es, en qué salón está y cuándo usó el teclado por última vez.
const props = defineProps({
  students: {
    type: Array,
    required: true,
  },
  // Texto cuando la búsqueda no encuentra a nadie.
  emptyMessage: {
    type: String,
    default: '',
  },
})

defineEmits(['select'])

const rows = computed(() => {
  const now = new Date()

  return props.students.map((student) => ({
    ...student,
    lastAccessLabel: formatRelative(student.lastAccessAt, now),
    classroomText: classroomLabel(student.classroomName, student.classroomArchived),
  }))
})
</script>

<template>
  <DataTable
    :value="rows"
    class="student-directory-table" scrollable
    :paginator="rows.length > ROWS_PER_PAGE"
    :rows="ROWS_PER_PAGE"
    :rows-per-page-options="[ROWS_PER_PAGE, 40]"
    table-style="min-width: 40rem"
  >
    <template #empty>
      <p class="table-empty">{{ emptyMessage || 'Aún no tienes estudiantes vinculados.' }}</p>
    </template>
    <Column header="Nombre">
      <template #body="{ data }">
        <strong v-if="data.realName">{{ data.realName }}</strong>
        <span v-else class="table-muted">Sin nombre</span>
      </template>
    </Column>
    <Column header="Alias">
      <template #body="{ data }">
        <span class="classroom-username">{{ data.username }}</span>
      </template>
    </Column>
    <Column header="Salón">
      <template #body="{ data }">
        <span :class="{ 'table-muted': !data.classroomName || data.classroomArchived }">
          {{ data.classroomText }}
        </span>
      </template>
    </Column>
    <Column header="Última actividad">
      <template #body="{ data }">
        <time v-if="data.lastAccessAt" :datetime="data.lastAccessAt">
          {{ data.lastAccessLabel }}
        </time>
        <span v-else class="table-muted">Sin actividad</span>
      </template>
    </Column>
    <Column header="Ficha" frozen align-frozen="right">
      <template #body="{ data }">
        <Button
          label="Ver ficha"
          icon="pi pi-arrow-right"
          icon-pos="right"
          text
          size="small"
          @click="$emit('select', data.id)"
        />
      </template>
    </Column>
  </DataTable>
</template>
