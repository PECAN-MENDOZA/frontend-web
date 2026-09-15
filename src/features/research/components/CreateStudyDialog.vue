<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import {
  STUDY_CODE_MAX_LENGTH,
  STUDY_TITLE_MAX_LENGTH,
  studyFormErrors,
} from '@/features/research/utils/study'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  isSaving: {
    type: Boolean,
    required: true,
  },
  errorMessage: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:visible', 'submit'])
const form = reactive({ code: '', title: '' })
const showErrors = ref(false)
const errors = computed(() => studyFormErrors(form))

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return

    form.code = ''
    form.title = ''
    showErrors.value = false
  },
)

function normalizeCode(value) {
  form.code = value.toUpperCase().replace(/\s+/g, '-')
}

function submitStudy() {
  showErrors.value = true

  if (Object.keys(errors.value).length) return

  emit('submit', { code: form.code.trim(), title: form.title.trim() })
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Nuevo estudio"
    class="research-dialog"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="research-dialog__intro">
      <span class="research-dialog__icon"><i class="pi pi-book"></i></span>
      <div>
        <p class="overline">Estudio experimental</p>
        <h3>Crea un estudio para reunir participantes.</h3>
        <p>Quedará sin activar hasta que actives su primer protocolo.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="research-form" @submit.prevent="submitStudy">
      <label>
        <span>Código <small>Mayúsculas, números y guiones</small></span>
        <InputText
          :model-value="form.code"
          placeholder="Ej. EXP-2026-01"
          autocomplete="off"
          :maxlength="STUDY_CODE_MAX_LENGTH"
          :invalid="showErrors && Boolean(errors.code)"
          autofocus
          fluid
          @update:model-value="normalizeCode"
        />
        <small v-if="showErrors && errors.code" class="research-form__error">{{
          errors.code
        }}</small>
      </label>
      <label>
        <span>Título</span>
        <InputText
          v-model="form.title"
          placeholder="Ej. Piloto teclado adaptativo"
          autocomplete="off"
          :maxlength="STUDY_TITLE_MAX_LENGTH"
          :invalid="showErrors && Boolean(errors.title)"
          fluid
        />
        <small v-if="showErrors && errors.title" class="research-form__error">{{
          errors.title
        }}</small>
      </label>
    </form>

    <template #footer>
      <Button
        label="Cancelar"
        severity="secondary"
        text
        :disabled="isSaving"
        @click="$emit('update:visible', false)"
      />
      <Button
        label="Crear estudio"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="isSaving"
        @click="submitStudy"
      />
    </template>
  </Dialog>
</template>
