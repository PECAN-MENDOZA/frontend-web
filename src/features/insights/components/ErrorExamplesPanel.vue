<script setup>
import { computed } from 'vue'
import { exampleLabel, sortTypes } from '@/features/insights/utils/errors.js'

// "En qué se equivoca": tipos de error del alumno (StudentErrorsResponse.types) con sus ejemplos
// más repetidos en el periodo. Solo conteos y ejemplos, sin comparación con otros periodos.
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
      <ul v-if="type.examples?.length" class="error-examples">
        <li v-for="example in type.examples" :key="`${example.original}-${example.corrected}`">
          {{ exampleLabel(example) }}
        </li>
      </ul>
    </li>
  </ul>
</template>
