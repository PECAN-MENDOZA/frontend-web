<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import { formatMean, formatSeconds, sentenceRows } from '@/features/tests/utils/results'
import { ASSISTANCE_LABELS, KIND_LABELS } from '@/features/tests/utils/sentences'

const props = defineProps({
  results: { type: Object, default: null },
})

const rows = computed(() => sentenceRows(props.results))
</script>

<template>
  <section class="panel sentence-panel results-sentences">
    <div class="directory-panel__toolbar">
      <div>
        <p class="overline">Por oración</p>
        <h2>{{ rows.length }} {{ rows.length === 1 ? 'oración' : 'oraciones' }}</h2>
      </div>
    </div>

    <p v-if="!rows.length" class="table-empty">Todavía no hay respuestas por oración.</p>
    <div v-else class="sentence-editor__scroll">
      <table class="response-table results-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Tipo</th>
            <th scope="col">Condición</th>
            <th scope="col">Intentos</th>
            <th scope="col">Errores (media)</th>
            <th scope="col">Duración desde la 1.ª tecla (media)</th>
            <th scope="col">Omitidas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.position">
            <td class="response-row__position test-number">{{ row.position }}</td>
            <td>
              <Tag
                :value="KIND_LABELS[row.kind] ?? row.kind"
                :severity="row.kind === 'FREE' ? 'info' : 'secondary'"
                rounded
              />
            </td>
            <td>{{ ASSISTANCE_LABELS[row.assistance] ?? row.assistance }}</td>
            <td class="test-number">{{ row.n ?? 0 }}</td>
            <td class="test-number">{{ formatMean(row.meanErrors) }}</td>
            <td class="test-number">{{ formatSeconds(row.meanDuration) }}</td>
            <td class="test-number">{{ row.skipped ?? 0 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
