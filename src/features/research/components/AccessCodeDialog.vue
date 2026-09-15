<script setup>
import { onUnmounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { copyText } from '@/features/research/utils/clipboard'
import { conditionLabel, formatDateTime, taskLabel } from '@/features/research/utils/study'

const COPIED_FEEDBACK_MS = 1800

const props = defineProps({
  credential: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])
const isCopied = ref(false)
let copiedTimer = null

watch(
  () => props.credential,
  () => {
    isCopied.value = false
    window.clearTimeout(copiedTimer)
  },
)

onUnmounted(() => window.clearTimeout(copiedTimer))

async function copyCode() {
  const code = props.credential?.code

  if (!code) return

  // "Copiado" solo cuando el portapapeles confirmó la copia; si falla, el código sigue
  // visible para copiarlo a mano.
  const didCopy = await copyText(code)

  if (!didCopy) return

  isCopied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => {
    isCopied.value = false
  }, COPIED_FEEDBACK_MS)
}
</script>

<template>
  <Dialog
    :visible="Boolean(credential)"
    modal
    :closable="false"
    header="Código de acceso"
    class="research-dialog research-dialog--code"
  >
    <div v-if="credential" class="research-code-reveal">
      <div class="research-code-reveal__heading">
        <Tag value="Entrega única" severity="warn" />
        <h3>Código para {{ credential.pseudonym }}.</h3>
        <p>
          {{ taskLabel(credential.task) }} · {{ conditionLabel(credential.condition) }}. El
          participante lo ingresa desde el teclado para iniciar su sesión.
        </p>
      </div>

      <Message severity="warn" :closable="false">Este código no volverá a mostrarse.</Message>

      <div class="research-code-sheet">
        <code class="research-code">{{ credential.code }}</code>
        <div class="research-code-sheet__actions">
          <Button
            :label="isCopied ? 'Copiado' : 'Copiar'"
            :icon="isCopied ? 'pi pi-check' : 'pi pi-copy'"
            severity="secondary"
            outlined
            aria-label="Copiar código de acceso"
            @click="copyCode"
          />
          <span class="research-live-region" aria-live="polite">
            {{ isCopied ? 'Código copiado al portapapeles' : '' }}
          </span>
        </div>
        <dl class="research-code-sheet__meta">
          <div>
            <dt>Vence</dt>
            <dd>{{ formatDateTime(credential.expiresAt) }}</dd>
          </div>
          <div>
            <dt>Participante</dt>
            <dd>{{ credential.pseudonym }}</dd>
          </div>
          <div v-if="credential.studyCode">
            <dt>Estudio</dt>
            <dd>{{ credential.studyCode }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <template #footer>
      <Button label="Ya entregué el código" icon="pi pi-check" autofocus @click="emit('close')" />
    </template>
  </Dialog>
</template>
