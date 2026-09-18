<script setup>
import { computed } from 'vue'
import Tag from 'primevue/tag'
import {
  OUTCOME_LABELS,
  OUTCOME_SEVERITIES,
  assistanceBadge,
} from '@/features/insights/utils/outcomes.js'
import { formatClock } from '@/features/insights/utils/period.js'

// "Lo que escribió": cada escritura del alumno (StudentWritingItem[]) con el texto original,
// el texto final, el desenlace y, si fue durante una prueba, la marca de con/sin ayuda.
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
})

const rows = computed(() => {
  const now = new Date()

  return props.items.map((item) => ({
    ...item,
    clock: formatClock(item.createdAt, now),
    outcomeText: item.outcomeLabel || OUTCOME_LABELS[item.outcome] || item.outcome,
    severity: OUTCOME_SEVERITIES[item.outcome] ?? 'secondary',
    badge: assistanceBadge(item),
    // El texto final solo se repite cuando difiere del original.
    changed: (item.finalText ?? '') !== (item.originalText ?? ''),
  }))
})
</script>

<template>
  <p v-if="!rows.length" class="table-empty">Ninguna escritura en este periodo.</p>
  <ul v-else class="writings-list">
    <li v-for="row in rows" :key="row.sessionId" class="writing-item">
      <time class="writing-item__clock" :datetime="row.createdAt">{{ row.clock }}</time>
      <div class="writing-item__body">
        <dl class="writing-item__texts">
          <div>
            <dt>Escribió</dt>
            <dd>{{ row.originalText }}</dd>
          </div>
          <div v-if="row.changed">
            <dt>Quedó</dt>
            <dd>{{ row.finalText }}</dd>
          </div>
        </dl>
        <div class="writing-item__labels">
          <Tag :value="row.outcomeText" :severity="row.severity" rounded />
          <Tag v-if="row.badge" :value="row.badge" severity="secondary" rounded />
          <span v-if="row.testCode" class="test-code">{{ row.testCode }}</span>
        </div>
      </div>
    </li>
  </ul>
</template>
