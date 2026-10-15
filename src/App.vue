<script setup>
import Toast from 'primevue/toast'
</script>

<template>
  <RouterView />
  <!-- Único Toast de la app: los avisos sobreviven al cambio de layout (p. ej. "Contraseña
       actualizada" se lanza desde AuthLayout y se ve ya en el panel). -->
  <Toast position="bottom-right" />
</template>
