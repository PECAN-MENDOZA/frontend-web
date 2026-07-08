<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import Tag from 'primevue/tag'

const props = defineProps({
  credential: {
    type: Object,
    default: null,
  },
  header: {
    type: String,
    default: 'PIN temporal',
  },
  intro: {
    type: String,
    default: 'Comparte estos datos con el estudiante para ingresar desde el teclado digital.',
  },
  actionLabel: {
    type: String,
    default: 'Ya entregué el PIN',
  },
})

const emit = defineEmits(['close'])
const copiedField = ref('')
const accessPin = computed(() => props.credential?.pin ?? '')
const studentName = computed(() => props.credential?.studentRealName ?? 'el estudiante')

async function copyCredential(field, value) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    copyWithFallback(value)
  }

  copiedField.value = field
  window.setTimeout(() => {
    if (copiedField.value === field) copiedField.value = ''
  }, 1800)
}

function copyWithFallback(value) {
  const field = document.createElement('textarea')

  field.value = value
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  document.execCommand('copy')
  field.remove()
}
</script>

<template>
  <Dialog
    :visible="Boolean(credential)"
    modal
    :closable="false"
    :header="header"
    class="student-credentials-dialog"
  >
    <div v-if="credential" class="credential-reveal">
      <div class="credential-reveal__heading">
        <Tag value="Entrega única" severity="warn" />
        <h3>El acceso de {{ studentName }} está listo.</h3>
        <p>{{ intro }}</p>
      </div>

      <Message severity="warn" :closable="false">
        El PIN temporal solo se muestra ahora. Entrégalo antes de cerrar esta ventana.
      </Message>

      <div class="credential-sheet">
        <div class="credential-sheet__row">
          <div>
            <small>Alias de acceso</small>
            <code>{{ credential.username }}</code>
          </div>
          <Button
            icon="pi pi-copy"
            severity="secondary"
            text
            rounded
            aria-label="Copiar alias"
            @click="copyCredential('username', credential.username)"
          />
          <span v-if="copiedField === 'username'">Copiado</span>
        </div>
        <div class="credential-sheet__row credential-sheet__row--password">
          <div>
            <small>PIN temporal</small>
            <code>{{ accessPin }}</code>
          </div>
          <Button
            icon="pi pi-copy"
            severity="secondary"
            text
            rounded
            aria-label="Copiar PIN temporal"
            @click="copyCredential('pin', accessPin)"
          />
          <span v-if="copiedField === 'pin'">Copiado</span>
        </div>
      </div>

      <div class="credential-reveal__meta">
        <span v-if="credential.institution"><i class="pi pi-building"></i>{{ credential.institution }}</span>
        <span><i class="pi pi-key"></i>Acceso con PIN</span>
      </div>
    </div>

    <template #footer>
      <Button :label="actionLabel" icon="pi pi-check" @click="emit('close')" />
    </template>
  </Dialog>
</template>
