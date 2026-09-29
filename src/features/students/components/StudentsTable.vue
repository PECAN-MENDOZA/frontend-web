<script setup>
import { computed } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import { formatRelative } from '@/features/insights/utils/period.js'

// Directorio simple: quién es, en qué salón está y cuándo usó el teclado por última vez.
const props = defineProps({
  students: {
    type: Array,
    required: true,
  },
})

defineEmits(['select'])

const rows = computed(() => {
  const now = new Date()

  return props.students.map((student) => ({
    ...student,
    lastAccessLabel: formatRelative(student.lastAccessAt, now),
  }))
})
</script>

<template>
  <DataTable
    :value="rows"
    class="student-directory-table" scrollable
    paginator
    :rows="8"
    :rows-per-page-options="[8, 15]"
    table-style="min-width: 40rem"
  >
    <Column header="Nombre">
      <template #body="{ data }">
        <strong>{{ data.realName }}</strong>
      </template>
    </Column>
    <Column header="Usuario">
      <template #body="{ data }">
        <span class="classroom-username">{{ data.username }}</span>
      </template>
    </Column>
    <Column header="Salón">
      <template #body="{ data }">
        <span :class="{ 'table-muted': !data.classroomName }">
          {{ data.classroomName || 'Sin salón' }}
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
