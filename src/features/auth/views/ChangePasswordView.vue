<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useToast } from 'primevue/usetoast'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/store/auth.store'
import {
  changePasswordFormError,
  homeForRole,
  nextRouteAfterPasswordChange,
  PASSWORD_RULE_TEXT,
} from '@/features/auth/utils/access'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const authStore = useAuthStore()

// Con contraseña temporal el cambio es obligatorio; si no, es un cambio voluntario que se puede
// cancelar. Se fija al entrar: al guardar, mustChangePassword pasa a false y la pantalla no
// debe cambiar de textos justo antes de salir.
const isTemporary = Boolean(authStore.user?.mustChangePassword)

const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validationError = ref('')
const currentPasswordLabel = computed(() =>
  isTemporary ? 'Contraseña temporal' : 'Contraseña actual',
)

onMounted(() => authStore.clearErrors())

async function submitChangePassword() {
  // El error del intento anterior (p. ej. "contraseña actual incorrecta") no debe quedar junto al nuevo.
  authStore.clearErrors()
  validationError.value = changePasswordFormError(form, { temporary: isTemporary })

  if (validationError.value) return

  const changed = await authStore.changePassword(
    {
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    },
    { temporary: isTemporary },
  )

  if (changed) {
    toast.add({ severity: 'success', summary: 'Contraseña actualizada', life: 4000 })
    router.push(nextRouteAfterPasswordChange(route.query.redirect, authStore.user?.role))
  }
}

function cancel() {
  router.push(homeForRole(authStore.user?.role))
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
      <div v-if="isTemporary">
        <p class="overline">Antes de continuar</p>
        <h2>Elige tu contraseña</h2>
        <p class="login-card__subtitle">
          Para continuar, cambia la contraseña temporal que te dieron. {{ PASSWORD_RULE_TEXT }}
        </p>
      </div>
      <div v-else>
        <p class="overline">Tu cuenta</p>
        <h2>Cambiar contraseña</h2>
        <p class="login-card__subtitle">
          Escribe tu contraseña actual y elige una nueva. {{ PASSWORD_RULE_TEXT }}
        </p>
      </div>

      <Message v-if="validationError" severity="warn" :closable="false">
        {{ validationError }}
      </Message>
      <Message v-if="authStore.errorMessage" severity="error" :closable="false">
        {{ authStore.errorMessage }}
      </Message>

      <div class="form-field">
        <label for="current-password">{{ currentPasswordLabel }}</label>
        <Password
          input-id="current-password"
          v-model="form.currentPassword"
          autocomplete="current-password"
          :placeholder="isTemporary ? 'Contraseña que recibiste' : 'Tu contraseña de ahora'"
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
          placeholder="Entre 8 y 72 caracteres"
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
        class="login-card__submit"
        type="submit"
        label="Guardar contraseña"
        icon="pi pi-arrow-right"
        icon-pos="right"
        :loading="authStore.isLoading"
        fluid
      />

      <Button
        v-if="!isTemporary"
        type="button"
        label="Cancelar"
        severity="secondary"
        text
        fluid
        :disabled="authStore.isLoading"
        @click="cancel"
      />
      <Button
        v-else
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
