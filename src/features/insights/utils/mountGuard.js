// Guarda de montaje para efectos que arrancan después de un await dentro de onMounted (p. ej.
// iniciar un sondeo tras la carga inicial). onUnmounted() se registra de forma síncrona en el
// setup del componente, así que siempre corre; pero si el componente se desmonta mientras la
// carga sigue en vuelo, el código que sigue al await no debe arrancar nada nuevo. mounted() lo
// dice; unmount() se llama desde onUnmounted().
export function createMountGuard() {
  let mounted = true
  return {
    get mounted() {
      return mounted
    },
    unmount() {
      mounted = false
    },
  }
}
