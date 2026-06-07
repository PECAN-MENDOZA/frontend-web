<script setup>
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'

defineProps({
  words: {
    type: Array,
    required: true,
  },
})
</script>

<template>
  <section class="panel words-panel">
    <div class="panel__header">
      <div>
        <p class="overline">Palabras recurrentes</p>
        <h2>Refuerzos que se repiten</h2>
      </div>
      <span class="panel__meta">Top 10</span>
    </div>

    <DataTable :value="words" class="words-table" empty-message="Sin palabras recurrentes para este mes.">
      <Column header="#">
        <template #body="{ data, index }">
          <Tag :value="data.rank ?? index + 1" severity="secondary" rounded />
        </template>
      </Column>
      <Column header="Palabra">
        <template #body="{ data }">
          <strong>{{ data.word }}</strong>
        </template>
      </Column>
      <Column field="frequency" header="Repeticiones" />
      <Column field="acceptedCount" header="Aceptadas" />
      <Column header="Lectura docente">
        <template #body="{ data }">
          <span class="signal-label">
            Reforzar en frases cortas con {{ data.word }}
          </span>
        </template>
      </Column>
    </DataTable>
  </section>
</template>
