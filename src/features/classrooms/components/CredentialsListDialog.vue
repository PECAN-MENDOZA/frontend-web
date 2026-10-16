<script setup>
import { computed, onUnmounted, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { credentialsAsText, credentialsPrintHtml } from '@/features/classrooms/utils/classrooms'
import { copyText } from '@/features/research/utils/clipboard'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  credentials: {
    type: Array,
    required: true,
  },
  classroomName: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['update:visible'])
const copyStatus = ref('')
// Ventana emergente bloqueada: el aviso queda dentro del diálogo hasta que se cierre o se reintente.
const isPrintBlocked = ref(false)
let statusTimer = null
const text = computed(() => credentialsAsText(props.credentials, props.classroomName))

function showStatus(message) {
  copyStatus.value = message
  window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => {
    copyStatus.value = ''
  }, 1800)
}

async function copyCredentials() {
  const wasCopied = await copyText(text.value)

  showStatus(wasCopied ? 'Copiado' : 'No se pudo copiar')
}

// Una ventana aparte con la hoja (título, instrucción y tabla): se imprime sin el resto del panel.
function printCredentials() {
  const printWindow = window.open('', '_blank', 'width=720,height=900')

  isPrintBlocked.value = !printWindow
  if (!printWindow) return

  printWindow.document.write(credentialsPrintHtml(props.credentials, props.classroomName))
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function close() {
  window.clearTimeout(statusTimer)
  copyStatus.value = ''
  isPrintBlocked.value = false
  emit('update:visible', false)
}

onUnmounted(() => window.clearTimeout(statusTimer))
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="Credenciales de acceso"
    class="student-credentials-dialog"
    @update:visible="close"
  >
    <div class="credential-reveal">
      <div class="credential-reveal__heading">
        <Tag value="Entrega única" severity="warn" />
        <h3>
          {{ credentials.length }}
          {{ credentials.length === 1 ? 'cuenta lista' : 'cuentas listas' }}.
        </h3>
        <p>Imprime o copia esta hoja y reparte a cada estudiante su alias y PIN.</p>
      </div>

      <Message severity="warn" :closable="false">
        Los PIN solo se muestran ahora. Guárdalos antes de cerrar esta ventana.
      </Message>

      <Message v-if="isPrintBlocked" severity="error" :closable="false">
        El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes de este sitio
        o usa «Copiar».
      </Message>

      <pre class="credentials-sheet">{{ text }}</pre>
    </div>

    <template #footer>
      <span v-if="copyStatus" class="credentials-copy-status" role="status">{{ copyStatus }}</span>
      <Button
        label="Copiar"
        icon="pi pi-copy"
        severity="secondary"
        outlined
        @click="copyCredentials"
      />
      <Button
        label="Imprimir"
        icon="pi pi-print"
        severity="secondary"
        outlined
        @click="printCredentials"
      />
      <Button label="Listo" icon="pi pi-check" @click="close" />
    </template>
  </Dialog>
</template>
