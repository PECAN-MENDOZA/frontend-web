<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { credentialsAsText } from '@/features/classrooms/utils/classrooms'
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
const text = computed(() => credentialsAsText(props.credentials, props.classroomName))

async function copyCredentials() {
  const wasCopied = await copyText(text.value)

  copyStatus.value = wasCopied ? 'Copiado' : 'No se pudo copiar'
  window.setTimeout(() => {
    copyStatus.value = ''
  }, 1800)
}

// Una ventana aparte con solo el texto: se imprime la hoja sin el resto del panel.
function printCredentials() {
  const printWindow = window.open('', '_blank')

  if (!printWindow) return

  const pre = printWindow.document.createElement('pre')

  pre.textContent = text.value
  pre.style.font = '14px/1.6 ui-monospace, Consolas, monospace'
  printWindow.document.title = `Credenciales ${props.classroomName}`
  printWindow.document.body.appendChild(pre)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function close() {
  copyStatus.value = ''
  emit('update:visible', false)
}
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
        <p>Imprime o copia esta hoja y reparte a cada estudiante su usuario y PIN.</p>
      </div>

      <Message severity="warn" :closable="false">
        Los PIN temporales solo se muestran ahora. Guárdalos antes de cerrar esta ventana.
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
