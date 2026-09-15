<script setup>
import Select from 'primevue/select'

defineProps({
  studies: {
    type: Array,
    required: true,
  },
  modelValue: {
    type: String,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <Select
    :model-value="modelValue"
    :options="studies"
    option-label="code"
    option-value="id"
    placeholder="Elige un estudio"
    aria-label="Seleccionar estudio"
    :disabled="disabled"
    class="research-study-selector"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #option="{ option }">
      <span class="research-study-selector__option">
        <strong>{{ option.code }}</strong>
        <small>{{ option.title }}</small>
      </span>
    </template>
  </Select>
</template>
