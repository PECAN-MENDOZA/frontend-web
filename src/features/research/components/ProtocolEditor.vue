<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Textarea from 'primevue/textarea'
import { useConfirm } from 'primevue/useconfirm'
import {
  PROMPT_MAX_LENGTH,
  formatDate,
  protocolFormErrors,
  protocolStatusLabel,
  protocolStatusSeverity,
} from '@/features/research/utils/study'

const props = defineProps({
  protocols: {
    type: Array,
    required: true,
  },
  study: {
    type: Object,
    default: null,
  },
  isSaving: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits(['save', 'activate'])
const confirm = useConfirm()
const form = reactive({ taskAPrompt: '', taskBPrompt: '' })
const showErrors = ref(false)
const isEditing = ref(false)

const isClosed = computed(() => props.study?.status === 'CLOSED')
const latestProtocol = computed(() => props.protocols[0] ?? null)
const activeProtocol = computed(
  () => props.protocols.find((protocol) => protocol.status === 'ACTIVE') ?? null,
)
const draftProtocol = computed(() =>
  latestProtocol.value?.status === 'DRAFT' ? latestProtocol.value : null,
)
const displayedProtocol = computed(() => activeProtocol.value ?? latestProtocol.value)
const showEditor = computed(
  () =>
    !isClosed.value && (Boolean(draftProtocol.value) || !activeProtocol.value || isEditing.value),
)
const errors = computed(() => protocolFormErrors(form))
const isValid = computed(() => Object.keys(errors.value).length === 0)
const isDirty = computed(() => {
  const base = draftProtocol.value ?? (isEditing.value ? activeProtocol.value : null)

  if (!base) return form.taskAPrompt !== '' || form.taskBPrompt !== ''

  return form.taskAPrompt !== base.taskAPrompt || form.taskBPrompt !== base.taskBPrompt
})
const canSave = computed(() => isValid.value && isDirty.value)
const canActivate = computed(() => Boolean(draftProtocol.value) && !isDirty.value)

watch(
  () => [draftProtocol.value?.id, activeProtocol.value?.id],
  () => {
    isEditing.value = false
    resetForm(draftProtocol.value)
  },
  { immediate: true },
)

function resetForm(source) {
  form.taskAPrompt = source?.taskAPrompt ?? ''
  form.taskBPrompt = source?.taskBPrompt ?? ''
  showErrors.value = false
}

function startNewVersion() {
  resetForm(activeProtocol.value)
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  resetForm(draftProtocol.value)
}

function saveDraft() {
  showErrors.value = true

  if (!isValid.value) return

  emit('save', { taskAPrompt: form.taskAPrompt, taskBPrompt: form.taskBPrompt })
}

function requestActivation() {
  if (!canActivate.value) return

  confirm.require({
    header: `Activar protocolo v${draftProtocol.value.version}`,
    message: 'Activar hace que el estudio acepte participantes y bloquea esta versión.',
    icon: 'pi pi-play-circle',
    acceptLabel: 'Activar',
    rejectLabel: 'Cancelar',
    rejectProps: { severity: 'secondary', text: true },
    accept: () => emit('activate', draftProtocol.value.id),
  })
}
</script>

<template>
  <section class="panel research-protocol" aria-label="Protocolo del estudio">
    <div class="panel__header">
      <div>
        <p class="overline">Consignas de escritura</p>
        <h2>Protocolo</h2>
      </div>
      <div class="research-protocol__header-actions">
        <Tag
          v-if="displayedProtocol"
          :value="`v${displayedProtocol.version} · ${protocolStatusLabel(displayedProtocol.status)}`"
          :severity="protocolStatusSeverity(displayedProtocol.status)"
          rounded
        />
        <Button
          v-if="activeProtocol && !showEditor && !isClosed"
          label="Nueva versión"
          icon="pi pi-plus"
          severity="secondary"
          outlined
          size="small"
          @click="startNewVersion"
        />
      </div>
    </div>

    <div class="research-protocol__body">
      <Message v-if="isClosed" severity="warn" :closable="false">
        El estudio está cerrado: el protocolo se conserva solo para consulta.
      </Message>

      <template v-if="showEditor">
        <p v-if="activeProtocol" class="research-protocol__hint">
          <i class="pi pi-info-circle"></i>
          La versión v{{ activeProtocol.version }} sigue activa hasta que actives esta nueva
          versión.
        </p>

        <form class="research-form" @submit.prevent="saveDraft">
          <label>
            <span>
              Consigna de la Tarea A
              <small class="research-form__counter"
                >{{ form.taskAPrompt.length }} / {{ PROMPT_MAX_LENGTH }}</small
              >
            </span>
            <Textarea
              v-model="form.taskAPrompt"
              rows="5"
              auto-resize
              fluid
              placeholder="Ej. Cuenta qué hiciste el fin de semana."
              :maxlength="PROMPT_MAX_LENGTH"
              :invalid="showErrors && Boolean(errors.taskAPrompt)"
              :disabled="isSaving"
            />
            <small v-if="showErrors && errors.taskAPrompt" class="research-form__error">
              {{ errors.taskAPrompt }}
            </small>
          </label>
          <label>
            <span>
              Consigna de la Tarea B
              <small class="research-form__counter"
                >{{ form.taskBPrompt.length }} / {{ PROMPT_MAX_LENGTH }}</small
              >
            </span>
            <Textarea
              v-model="form.taskBPrompt"
              rows="5"
              auto-resize
              fluid
              placeholder="Ej. Describe tu lugar favorito."
              :maxlength="PROMPT_MAX_LENGTH"
              :invalid="showErrors && Boolean(errors.taskBPrompt)"
              :disabled="isSaving"
            />
            <small v-if="showErrors && errors.taskBPrompt" class="research-form__error">
              {{ errors.taskBPrompt }}
            </small>
          </label>
        </form>

        <div class="research-protocol__actions">
          <Button
            v-if="isEditing && activeProtocol"
            label="Cancelar"
            severity="secondary"
            text
            :disabled="isSaving"
            @click="cancelEditing"
          />
          <Button
            label="Guardar borrador"
            icon="pi pi-save"
            severity="secondary"
            outlined
            :loading="isSaving"
            :disabled="!canSave"
            @click="saveDraft"
          />
          <Button
            v-if="draftProtocol"
            label="Activar"
            icon="pi pi-play"
            :disabled="!canActivate || isSaving"
            @click="requestActivation"
          />
          <small v-if="draftProtocol && isDirty" class="research-protocol__note">
            Guarda el borrador antes de activarlo.
          </small>
          <small v-else-if="draftProtocol" class="research-protocol__note">
            Borrador v{{ draftProtocol.version }} listo para activar.
          </small>
        </div>
      </template>

      <template v-else-if="displayedProtocol">
        <div class="research-prompt">
          <span class="research-prompt__label">Tarea A</span>
          <p class="research-prompt__text">{{ displayedProtocol.taskAPrompt }}</p>
        </div>
        <div class="research-prompt">
          <span class="research-prompt__label">Tarea B</span>
          <p class="research-prompt__text">{{ displayedProtocol.taskBPrompt }}</p>
        </div>
        <p v-if="!isClosed" class="research-protocol__hint">
          <i class="pi pi-lock"></i>
          Esta versión está bloqueada. Para cambiar las consignas crea una nueva versión.
        </p>
      </template>

      <p v-else class="research-table-empty">Este estudio no tiene protocolo.</p>

      <ol v-if="protocols.length" class="research-protocol__history" aria-label="Versiones">
        <li v-for="protocol in protocols" :key="protocol.id">
          <span>v{{ protocol.version }}</span>
          <span>{{ protocolStatusLabel(protocol.status) }}</span>
          <span>{{ formatDate(protocol.createdAt) }}</span>
        </li>
      </ol>
    </div>
  </section>
</template>
