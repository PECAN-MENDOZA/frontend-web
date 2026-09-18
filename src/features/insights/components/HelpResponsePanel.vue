<script setup>
import { computed } from 'vue'
import { OUTCOME_SEVERITIES, outcomeSummary } from '@/features/insights/utils/outcomes.js'

// "Cómo responde a la ayuda": proporción de cada desenlace dentro del periodo elegido
// (StudentHelpResponse). Barras de proporción, sin tendencia ni comparación con otro periodo.
const props = defineProps({
  help: {
    type: Object,
    default: null,
  },
})

const total = computed(() => props.help?.total ?? 0)
const rows = computed(() => outcomeSummary(props.help))

function countLabel(count) {
  return count === 1 ? '1 vez' : `${count} veces`
}

function pctLabel(pct) {
  return `${String(pct).replace('.', ',')} %`
}
</script>

<template>
  <p v-if="!total" class="table-empty">Ninguna sugerencia del teclado en este periodo.</p>
  <div v-else class="help-summary">
    <p class="help-summary__total">
      {{ total === 1 ? '1 sugerencia' : `${total} sugerencias` }} en el periodo
    </p>
    <ul class="help-bars">
      <li
        v-for="row in rows"
        :key="row.key"
        class="help-bar"
        :class="`help-bar--${OUTCOME_SEVERITIES[row.key]}`"
      >
        <div class="help-bar__head">
          <strong>{{ row.label }}</strong>
          <span>{{ countLabel(row.count) }} · {{ pctLabel(row.pct) }}</span>
        </div>
        <div
          class="help-bar__track"
          role="meter"
          :aria-valuenow="row.pct"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`${row.label}: ${pctLabel(row.pct)}`"
        >
          <span class="help-bar__fill" :style="{ width: `${row.pct}%` }"></span>
        </div>
      </li>
    </ul>
  </div>
</template>
