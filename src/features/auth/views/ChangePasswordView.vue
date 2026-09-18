<script setup>
import { reactive, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { nextRouteAfterPasswordChange } from '@/features/auth/utils/access'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validationError = ref('')

function validate() {
  if (!form.currentPassword) {
    return 'Escribe tu contraseña actual.'
  }

  if (form.newPassword.length < 8) {
    return 'La nueva contraseña debe tener al menos 8 caracteres.'
  }

  if (form.newPassword !== form.confirmPassword) {
    return 'Las contraseñas no coinciden.'
  }

  return ''
}

async function submitChangePassword() {
  validationError.value = validate()

  if (validationError.value) return

  const changed = await authStore.changePassword({
    currentPassword: form.currentPassword,
    newPassword: form.newPassword,
  })

  if (changed) {
    router.push(nextRouteAfterPasswordChange(route.query.redirect, authStore.user?.role))
  }
}

// Salida explícita: sin ella, el docente quedaría atrapado en esta pantalla hasta que
// venciera el token si no recuerda la contraseña temporal o quiere cambiar de cuenta.
function signOut() {
  authStore.signOut()
  router.push({ name: 'login' })
}
</script>

<template>
  <section class="change-password-page">
    <form class="login-card" @submit.prevent="submitChangePassword">
      <div>
        <p class="overline">Antes de continuar</p>
        <h2>Elige tu contraseña</h2>
        <p class="login-card__subtitle">Tu contraseña temporal solo sirve para entrar una vez.</p>
      </div>

      <Message v-if="validationError" severity="warn" :closable="false">
        {{ validationError }}
      </Message>
      <Message v-if="authStore.errorMessage" severity="error" :closable="false">
        {{ authStore.errorMessage }}
      </Message>

      <div class="form-field">
        <label for="current-password">Contraseña temporal</label>
        <Password
          input-id="current-password"
          v-model="form.currentPassword"
          autocomplete="current-password"
          placeholder="Contraseña que recibiste"
          :feedback="false"
          toggle-mask
          fluid
        />
      </div>

      <div class="form-field">
        <label for="new-password">Nueva contraseña</label>
        <Password
          input-id="new-password"
          v-model="form.newPassword"
          autocomplete="new-password"
          placeholder="Al menos 8 caracteres"
          :feedback="false"
          toggle-mask
          fluid
        />
      </div>

      <div class="form-field">
        <label for="confirm-password">Confirma la nueva contraseña</label>
        <Password
          input-id="confirm-password"
          v-model="form.confirmPassword"
          autocomplete="new-password"
          placeholder="Repite la nueva contraseña"
          :feedback="false"
          toggle-mask
          fluid
        />
      </div>

      <Button
        type="submit"
        label="Guardar contraseña"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="authStore.isLoading"
        fluid
      />

      <Button
        type="button"
        label="Cerrar sesión"
        icon="pi pi-sign-out"
        severity="secondary"
        text
        fluid
        :disabled="authStore.isLoading"
        @click="signOut"
      />
    </form>
  </section>
</template>
