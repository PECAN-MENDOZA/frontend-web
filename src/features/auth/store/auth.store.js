import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  changePassword as changePasswordRequest,
  clearSession,
  markPasswordChanged,
  restoreSession,
  signIn as signInRequest,
} from '@/features/auth/services/auth.service'

export const useAuthStore = defineStore('auth', () => {
  const session = restoreSession()
  const user = ref(session?.user ?? null)
  const isLoading = ref(false)
  const errorMessage = ref('')

  const isAuthenticated = computed(() => Boolean(user.value))
  const userInitials = computed(() =>
    user.value?.name
      .split(' ')
      .map((name) => name[0])
      .slice(0, 2)
      .join(''),
  )

  async function signIn(credentials) {
    isLoading.value = true
    errorMessage.value = ''

    try {
      const newSession = await signInRequest(credentials)
      user.value = newSession.user
    } catch (error) {
      errorMessage.value = error.message
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function changePassword(payload) {
    isLoading.value = true
    errorMessage.value = ''
    try {
      await changePasswordRequest(payload)
      user.value = markPasswordChanged(user.value)
      return true
    } catch {
      errorMessage.value = 'No pudimos cambiar la contraseña. Verifica la contraseña actual.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Cerrar sesión avisa a los demás stores (síncrono) para que descarten los datos de la cuenta
  // sin acoplar este store a las features que los cargan.
  function signOut() {
    clearSession()
    user.value = null
    window.dispatchEvent(new CustomEvent('auth:signed-out'))
  }

  window.addEventListener('auth:unauthorized', signOut)

  return {
    user,
    isLoading,
    errorMessage,
    isAuthenticated,
    userInitials,
    signIn,
    changePassword,
    signOut,
  }
})
