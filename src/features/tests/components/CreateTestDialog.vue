<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { testFormErrors } from '@/features/tests/utils/sentences'

const props = defineProps({
  visible: { type: Boolean, required: true },
  isSaving: { type: Boolean, required: true },
  errorMessage: { type: String, required: true },
})

const emit = defineEmits(['update:visible', 'submit'])
const code = ref('')
const title = ref('')
const notes = ref('')
const showErrors = ref(false)
const errors = computed(() => testFormErrors({ code: code.value, title: title.value }))

watch(
  () => props.visible,
  (isVisible) => {
    if (!isVisible) return

    code.value = ''
    title.value = ''
    notes.value = ''
    showErrors.value = false
  },
)

function updateCode(value) {
  code.value = value.toUpperCase()
}

function submitTest() {
  showErrors.value = true
  if (Object.keys(errors.value).length || props.isSaving) return

  emit('submit', {
    code: code.value.trim(),
    title: title.value.trim(),
    notes: notes.value.trim(),
  })
}

function close() {
  if (!props.isSaving) emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Nueva prueba"
    :closable="!isSaving"
    class="student-account-dialog test-dialog"
    @update:visible="close"
  >
    <div class="student-account-dialog__intro">
      <span class="student-account-dialog__icon">
        <i class="pi pi-list-check" aria-hidden="true"></i>
      </span>
      <div>
        <p class="overline">Nuevo borrador</p>
        <h3>Identifica la prueba.</h3>
        <p>Después podrás redactar, ordenar y revisar sus oraciones antes de activarla.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="student-account-form" @submit.prevent="submitTest">
      <label>
        <span>Código</span>
        <InputText
          :model-value="code"
          placeholder="LECTURA-01"
          autocomplete="off"
          maxlength="40"
          :invalid="showErrors && Boolean(errors.code)"
          autofocus
          fluid
          @update:model-value="updateCode"
        />
        <small v-if="showErrors && errors.code" class="form-error">{{ errors.code }}</small>
        <small v-else class="form-help">Mayúsculas, números y guiones.</small>
      </label>
      <label>
        <span>Título</span>
        <InputText
          v-model="title"
          placeholder="Ej. Diagnóstico de escritura"
          autocomplete="off"
          maxlength="120"
          :invalid="showErrors && Boolean(errors.title)"
          fluid
        />
        <small v-if="showErrors && errors.title" class="form-error">{{ errors.title }}</small>
      </label>
      <label>
        <span>Notas <small>Opcional</small></span>
        <Textarea
          v-model="notes"
          rows="3"
          auto-resize
          maxlength="2000"
          placeholder="Contexto interno para el equipo de investigación"
          fluid
        />
      </label>
    </form>

    <template #footer>
      <Button label="Cancelar" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        label="Crear prueba"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="isSaving"
        @click="submitTest"
      />
    </template>
  </Dialog>
</template>
