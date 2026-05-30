<script setup>
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useAuth } from '@/features/auth/composables/useAuth'
import { APP_NAME, APP_TAGLINE } from '@/shared/constants/app'

const { authStore, credentials, submitSignIn } = useAuth()
</script>

<template>
  <section class="login-page">
    <div class="login-page__story">
      <div class="login-page__brand">
        <div class="brand-mark brand-mark--large">F</div>
        <span>{{ APP_NAME }}</span>
      </div>

      <div class="login-page__story-content">
        <p class="overline">Espacio docente</p>
        <h1>Descubre el patrón de aprendizaje detrás de cada palabra.</h1>
        <p>
          Transforma las señales de escritura diarias en una guía cercana y enfocada para cada
          estudiante.
        </p>
      </div>

      <div class="login-page__signal-card">
        <span class="login-page__signal-icon"><i class="pi pi-sparkles"></i></span>
        <div>
          <strong>Pequeñas señales. Próximos pasos claros.</strong>
          <p>
            Revisa la aceptación, los patrones de error y las palabras recurrentes en un solo espacio.
          </p>
        </div>
      </div>
    </div>

    <div class="login-page__panel">
      <form class="login-card" @submit.prevent="submitSignIn">
        <div>
          <p class="overline">Te damos la bienvenida</p>
          <h2>Ingresa a tu aula</h2>
          <p class="login-card__subtitle">{{ APP_TAGLINE }}</p>
        </div>

        <Message v-if="authStore.errorMessage" severity="error" :closable="false">
          {{ authStore.errorMessage }}
        </Message>

        <div class="form-field">
          <label for="email">Correo institucional</label>
          <InputText
            id="email"
            v-model="credentials.email"
            type="email"
            autocomplete="email"
            placeholder="docente@colegio.edu.pe"
            fluid
          />
        </div>

        <div class="form-field">
          <label for="password">Contraseña</label>
          <Password
            input-id="password"
            v-model="credentials.password"
            autocomplete="current-password"
            placeholder="Ingresa tu contraseña"
            :feedback="false"
            toggle-mask
            fluid
          />
        </div>

        <div class="login-card__options">
          <label class="checkbox-label">
            <input type="checkbox" checked />
            <span>Mantener mi sesión iniciada</span>
          </label>
          <button type="button">¿Olvidaste tu contraseña?</button>
        </div>

        <Button
          type="submit"
          label="Ingresar al panel"
          icon="pi pi-arrow-right"
          icon-pos="right"
          :loading="authStore.isLoading"
          fluid
        />

        <Divider />

        <p class="login-card__hint">
          <i class="pi pi-lock"></i>
          Acceso protegido solo para docentes autorizados.
        </p>
      </form>
    </div>
  </section>
</template>
