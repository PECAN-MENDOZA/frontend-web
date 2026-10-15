// Pruebas de oraciones: módulo del piloto, apagado salvo VITE_FEATURE_SENTENCE_TESTS=true. Debe
// coincidir con app.features.sentence-tests del backend (apagado, sus endpoints responden 404).
export const SENTENCE_TESTS_ENABLED = import.meta.env.VITE_FEATURE_SENTENCE_TESTS === 'true'
