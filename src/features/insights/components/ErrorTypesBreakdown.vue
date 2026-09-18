<script setup>
import { computed } from 'vue'
import { sortTypes } from '@/features/insights/utils/errors.js'

// Errores del salón por tipo ({total, types:[{type, label, count, topWords}]}): conteos y las
// palabras más repetidas de cada tipo, sin comparación con otros periodos.
const props = defineProps({
  errors: {
    type: Object,
    default: null,
  },
})

const types = computed(() => sortTypes(props.errors?.types).filter((type) => type.count > 0))

function countLabel(count) {
  return count === 1 ? '1 corrección' : `${count} correcciones`
}
</script>

<template>
  <p v-if="!types.length" class="table-empty">
    Ninguna corrección con error clasificado en este periodo.
  </p>
  <ul v-else class="error-types">
    <li v-for="type in types" :key="type.type" class="error-type">
      <div class="error-type__head">
        <strong>{{ type.label }}</strong>
        <span>{{ countLabel(type.count) }}</span>
      </div>
      <ul v-if="type.topWords?.length" class="word-chips">
        <li
          v-for="word in type.topWords"
          :key="`${word.original}-${word.corrected}`"
          class="word-chip"
        >
          <span>{{ word.original }} → {{ word.corrected }}</span>
          <small v-if="word.count > 1">×{{ word.count }}</small>
        </li>
      </ul>
    </li>
  </ul>
</template>
