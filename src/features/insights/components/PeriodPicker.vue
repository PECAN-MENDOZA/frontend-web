<script setup>
import { computed } from 'vue'
import DatePicker from 'primevue/datepicker'
import SelectButton from 'primevue/selectbutton'
import {
  PRESETS,
  fromIsoDate,
  periodErrors,
  presetRange,
  toIsoDate,
} from '@/features/insights/utils/period.js'

// Periodo {from, to, preset}: los presets fijan el rango; "Elegir fechas" muestra dos
// DatePicker y conserva el rango vigente hasta que el docente lo cambie.
const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

const today = new Date()

const preset = computed({
  get: () => props.modelValue.preset ?? 'custom',
  set: (key) => {
    if (!key) return
    const range =
      key === 'custom' ? { from: props.modelValue.from, to: props.modelValue.to } : presetRange(key)
    emit('update:modelValue', { ...range, preset: key })
  },
})

const isCustom = computed(() => preset.value === 'custom')

function dateField(field) {
  return computed({
    get: () => fromIsoDate(props.modelValue[field]),
    set: (date) => {
      const iso = toIsoDate(date)
      if (!iso) return
      emit('update:modelValue', { ...props.modelValue, [field]: iso, preset: 'custom' })
    },
  })
}

const fromDate = dateField('from')
const toDate = dateField('to')
const validationMessage = computed(() => periodErrors(props.modelValue))
</script>

<template>
  <div class="period-picker">
    <SelectButton
      v-model="preset"
      :options="PRESETS"
      option-label="label"
      option-value="key"
      :allow-empty="false"
      :disabled="disabled"
      aria-label="Periodo"
    />

    <div v-if="isCustom" class="period-picker__dates">
      <label class="period-picker__field">
        <span>Desde</span>
        <DatePicker
          v-model="fromDate"
          date-format="dd/mm/yy"
          :max-date="today"
          :disabled="disabled"
          show-icon
          icon-display="input"
          :invalid="Boolean(validationMessage)"
        />
      </label>
      <label class="period-picker__field">
        <span>Hasta</span>
        <DatePicker
          v-model="toDate"
          date-format="dd/mm/yy"
          :max-date="today"
          :disabled="disabled"
          show-icon
          icon-display="input"
          :invalid="Boolean(validationMessage)"
        />
      </label>
      <small v-if="validationMessage" class="period-picker__error" role="alert">
        {{ validationMessage }}
      </small>
    </div>
  </div>
</template>
