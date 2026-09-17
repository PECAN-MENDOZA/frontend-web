<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { exclusionReasonError } from '@/features/tests/utils/attempts'

const props = defineProps({
  visible: { type: Boolean, required: true },
  username: { type: String, required: true },
  isSaving: { type: Boolean, required: true },
  errorMessage: { type: String, required: true },
})

const emit = defineEmits(['update:visible', 'submit'])
const reason = ref('')
const validationError = computed(() => exclusionReasonError(reason.value))
const isValid = computed(() => Boolean(reason.value.trim()) && !validationError.value)
const hint = computed(() => (reason.value.trim() ? validationError.value : ''))

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) reason.value = ''
  },
)

function submitReason() {
  if (isValid.value && !props.isSaving) emit('submit', reason.value.trim())
}

function close() {
  if (!props.isSaving) emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Excluir intento"
    :closable="!isSaving"
    class="research-dialog research-dialog--reason"
    @update:visible="close"
  >
    <div class="research-dialog__intro">
      <span class="research-dialog__icon research-dialog__icon--danger">
        <i class="pi pi-ban" aria-hidden="true"></i>
      </span>
      <div>
        <p class="overline">Decisión registrada</p>
        <h3>Excluirás el intento de {{ username || 'este alumno' }}.</h3>
        <p>Seguirá visible en la tabla, pero no contará en los resultados de la prueba.</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="research-form" @submit.prevent="submitReason">
      <label>
        <span>
          Motivo
          <small class="research-form__counter">{{ reason.length }} / 500</small>
        </span>
        <Textarea
          v-model="reason"
          rows="4"
          auto-resize
          fluid
          autofocus
          maxlength="500"
          placeholder="Explica la razón en al menos 10 caracteres."
          :invalid="Boolean(hint)"
          :disabled="isSaving"
        />
        <small v-if="hint" class="research-form__error">{{ hint }}</small>
        <small v-else class="research-form__help">
          El motivo es obligatorio y quedará asociado al intento.
        </small>
      </label>
    </form>

    <template #footer>
      <Button label="Volver" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        label="Excluir intento"
        icon="pi pi-ban"
        severity="danger"
        :disabled="!isValid"
        :loading="isSaving"
        @click="submitReason"
      />
    </template>
  </Dialog>
</template>
