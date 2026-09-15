<script setup>
// Identificador o hash mostrado abreviado: el valor completo va en el tooltip (puntero) y en
// texto solo para lectores de pantalla, que no alcanzan el tooltip.
defineProps({
  value: {
    type: String,
    default: '',
  },
  short: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <span v-if="value" v-tooltip.bottom="value" class="research-mono">
    <span aria-hidden="true">{{ short }}</span>
    <span class="research-sr-only">{{ value }}</span>
  </span>
  <span v-else class="research-mono">{{ short }}</span>
</template>
