<script setup>
import { computed, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import {
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  reasonErrors,
} from '@/features/research/utils/sessions'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  confirmLabel: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: 'pi pi-exclamation-triangle',
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
const reason = ref('')
const errors = computed(() => reasonErrors(reason.value))
const isValid = computed(() => errors.value.length === 0)
// El aviso de longitud aparece solo cuando ya se escribió algo; el botón sigue la regla siempre.
const hint = computed(() => (reason.value.trim() ? errors.value[0] : ''))

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      reason.value = ''
    }
  },
)

function submitReason() {
  if (!isValid.value || props.isSaving) return

  emit('submit', reason.value.trim())
}

function close() {
  if (props.isSaving) return

  emit('update:visible', false)
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    :header="title"
    :closable="!isSaving"
    class="research-dialog research-dialog--reason"
    @update:visible="close"
  >
    <div class="research-dialog__intro">
      <span class="research-dialog__icon research-dialog__icon--danger">
        <i :class="icon" aria-hidden="true"></i>
      </span>
      <div>
        <p class="overline">Decisión registrada</p>
        <h3>Esta acción no se puede deshacer.</h3>
        <p>{{ description }}</p>
      </div>
    </div>

    <Message v-if="errorMessage" severity="error" :closable="false">
      {{ errorMessage }}
    </Message>

    <form class="research-form" @submit.prevent="submitReason">
      <label>
        <span>
          Motivo
          <small class="research-form__counter"
            >{{ reason.length }} / {{ REASON_MAX_LENGTH }}</small
          >
        </span>
        <Textarea
          v-model="reason"
          rows="4"
          auto-resize
          fluid
          autofocus
          :placeholder="`Explica la razón en al menos ${REASON_MIN_LENGTH} caracteres.`"
          :maxlength="REASON_MAX_LENGTH"
          :invalid="Boolean(hint)"
          :disabled="isSaving"
        />
        <small v-if="hint" class="research-form__error">{{ hint }}</small>
        <small v-else class="research-form__help">
          El motivo quedará asociado a la sesión y visible en esta tabla.
        </small>
      </label>
    </form>

    <template #footer>
      <Button label="Volver" severity="secondary" text :disabled="isSaving" @click="close" />
      <Button
        :label="confirmLabel"
        :icon="icon"
        severity="danger"
        :disabled="!isValid"
        :loading="isSaving"
        @click="submitReason"
      />
    </template>
  </Dialog>
</template>
