# Pendiente del portal web (Vue) — el selector de mes no incluye el mes actual

> **Para:** responsable del **portal web del docente (Vue)**
> **Fecha:** 2026-06-22
> **Reportado desde:** prueba de integración teclado → backend → portal
> **Prioridad:** Alta — hace que las correcciones recientes "no aparezcan" en el portal

## Síntoma

Un docente abre el perfil de un alumno y **no ve ninguna actividad reciente** (aceptación
`0.0%`, `0 envíos del mes`, sin palabras recurrentes), aunque el alumno **sí** estuvo haciendo
correcciones desde el teclado ese mismo día.

## Causa (confirmada)

**El problema NO es del backend.** Los datos están registrados y el backend los devuelve
correctamente. El problema es que **el selector de mes del portal no incluye el mes actual.**

En la prueba (2026-06-22), con el alumno `student_001` (Mateo Rojas) y la docente
`sofia.garcia@colegio.edu.pe`:

- El desplegable de mes del portal ofrecía solo: **Mayo 2026, Abril 2026, Marzo 2026**.
- **Faltaba "Junio 2026"** — el mes en curso, donde está toda la actividad reciente.
- El portal estaba consultando **Mayo 2026**, que legítimamente está vacío → de ahí los ceros.

El dropdown está **desfasado un mes**: arranca en el mes anterior y va hacia atrás, omitiendo el
mes actual.

## Evidencia de que el backend SÍ tiene los datos (mes en curso)

Consultando el endpoint que usa el portal, pero con el mes correcto (`2026-06`):

```bash
GET /api/v1/kpis/students/{studentId}/summary?month=2026-06
Authorization: Bearer <token-docente>
```

Respuesta (resumida) para `student_001` el 2026-06-22:

```json
{
  "name": "Mateo Rojas",
  "month": "2026-06",
  "tasa_aceptacion": {
    "total_envios": 17,
    "total_aceptadas": 14,
    "total_rechazadas": 3,
    "sin_respuesta": 0,
    "tasa_aceptacion_pct": 82.35
  },
  "top_palabras": [ { "palabra_original": "escula", ... }, { "palabra_original": "juegar", ... } ]
}
```

Las palabras (`escula`, `juegar`, `Ola`, `etas`…) son justamente las que se teclearon en la
prueba. Es decir: **el dato existe en junio 2026; el portal simplemente no lo pide.**

> Nota: los KPIs se calculan **en vivo** desde las sesiones de corrección (no son un snapshot),
> así que la actividad del mes en curso se refleja al instante en cuanto se consulta el mes
> correcto.

## Causa probable en el código (Vue)

La lista de meses del selector se genera **arrancando en el mes anterior** en vez del actual.
Sospechas típicas:

1. Construye la lista desde "el mes pasado" hacia atrás (olvida incluir el mes en curso).
2. Off-by-one con los meses de JavaScript: `Date.getMonth()` es **0-indexado** (enero = 0,
   junio = 5). Si en algún punto se resta 1 o se formatea mal, el "mes actual" se etiqueta como
   el anterior.
3. Se excluye a propósito el mes en curso ("solo meses cerrados"), lo que oculta la actividad
   reciente.

## Fix esperado (lado portal Vue)

1. El selector de mes debe **incluir el mes actual** (p. ej. "Junio 2026") y, idealmente, dejarlo
   **seleccionado por defecto** al abrir el perfil del alumno.
2. Enviar el parámetro `month` en formato **`YYYY-MM`** correspondiente (junio 2026 → `2026-06`).
3. Cuidado con la zona horaria: el backend calcula el rango del mes en **UTC**. Generar el
   `YYYY-MM` de forma consistente (evitar que, cerca de medianoche, el mes "salte" por la
   conversión local↔UTC).

## Criterio de aceptación

- [x] El desplegable de mes incluye el **mes actual** (Junio 2026) y lo muestra por defecto.
- [x] Al seleccionar el mes actual, el portal llama a
      `/api/v1/kpis/students/{id}/summary?month=2026-06` y **muestra** los envíos, la tasa de
      aceptación y las palabras recurrentes del mes.
- [x] La actividad hecha hoy desde el teclado se ve reflejada en el portal el mismo día.

## Cómo funciona hoy el backend (referencia para el portal Vue)

Comportamiento real de los endpoints que consume el portal del docente. Todo bajo
`https://backend-887695300669.us-central1.run.app`.

### Autenticación
- Login docente: `POST /api/v1/auth/teachers/login` con `{ "email", "password" }` → `AuthResponse`
  `{ userId, token, expiresAt, role: "TEACHER" }`.
- En cada llamada protegida: header `Authorization: Bearer <token>`. El token expira (~5 h); al
  expirar el backend responde `401` y hay que volver a loguear.

### KPIs (se calculan EN VIVO, no son snapshot)
Base: `/api/v1/kpis/students/{studentId}` · rol **TEACHER** · todos requieren `?month=YYYY-MM`.

Los KPIs se computan **al momento** desde las sesiones de corrección del rango del mes. Es decir:
la actividad del **mes en curso** se refleja **inmediatamente** al consultar ese mes. No hace
falta "cerrar" ni regenerar nada.

- **`GET …/summary?month=2026-06`** (el más útil para el dashboard):
  ```json
  {
    "id_estudiante": "UUID",
    "name": "Mateo Rojas",            // nombre real descifrado (solo lo ve el docente)
    "month": "2026-06",
    "tasa_aceptacion": {
      "total_envios": 17,             // sesiones de correccion del mes
      "total_aceptadas": 14,
      "total_rechazadas": 3,
      "sin_respuesta": 0,             // sesiones sin feedback del alumno aun
      "tasa_aceptacion_pct": 82.35
    },
    "top_palabras": [
      { "palabra_original": "baya", "frequency": 2, "veces_corregida_aceptada": 2 }
    ]
  }
  ```
- **`GET …/acceptance-rate?month=YYYY-MM`** → solo el objeto `tasa_aceptacion` de arriba.
- **`GET …/top-words?month=YYYY-MM`** → `{ id_estudiante, month, top_palabras }` (máx. 10).

Errores: `400` si `month` no es `YYYY-MM`; `403` si el docente no está vinculado a ese alumno.

### Cómo se cuentan los envíos (importante para interpretar los KPIs)
- Una **sesión** se crea cuando el alumno pide corrección y **la IA responde** (`POST
  /corrections/process` → `201`). Si la IA falla, la operación hace rollback y **no** queda
  sesión → no suma a `total_envios`.
- `total_aceptadas` / `total_rechazadas` dependen del **feedback** del alumno
  (`PATCH /corrections/sessions/{id}/feedback`). Mientras el alumno no responde, la sesión cuenta
  como `sin_respuesta`.
- `top_palabras` (y `veces_corregida_aceptada`) se derivan de las **correcciones aceptadas**.

### Rango de mes y zona horaria
El backend interpreta `month=YYYY-MM` como `[día 1 00:00 UTC, día 1 del mes siguiente 00:00 UTC)`.
Las fechas de las sesiones están en **UTC**. El portal debe generar el `YYYY-MM` pensando en UTC
para que, cerca de medianoche (Perú = UTC-5), no "salte" de mes.

### Reportes mensuales
Base: `/api/v1/reports/students/{studentId}` · rol **TEACHER** · `?month=YYYY-MM`.
- `GET …` → disponibilidad: `available` es `true` si hay snapshot histórico **o** si el mes en
  vivo tiene envíos (`total_envios > 0`). El campo `source` indica `HISTORICAL_SNAPSHOT` o
  `LIVE_KPI`.
- `GET …/pdf` → descarga `application/pdf`. **Los números del PDF salen de los KPIs en vivo**
  (no de un snapshot viejo), así que reflejan la actividad del mes en curso.

> Referencia completa de la API (todos los endpoints, web y móvil): `docs/api-integracion-frontend.md`.

## Estado

- ✅ Backend: correcto, devuelve los datos del mes en curso. **No requiere cambios.**
- ✅ Portal web (Vue): el selector de mes ahora **se genera dinámicamente** e incluye el mes
  actual, dejándolo seleccionado por defecto. **Resuelto.**

### Solución aplicada (Vue)

- Nueva utilidad `src/shared/utils/month.js`:
  - `getCurrentMonthValue()` → mes en curso en `YYYY-MM` calculado con getters **UTC**
    (`getUTCFullYear` / `getUTCMonth`), para que cerca de medianoche en Perú (UTC-5) el mes no
    "salte".
  - `getMonthOptions(count)` → lista que **empieza en el mes actual** y retrocede `count - 1`
    meses, con etiquetas en español (p. ej. "Junio 2026").
- Se reemplazaron las listas hardcodeadas (`Mayo/Abril/Marzo 2026`) y el valor por defecto fijo
  `'2026-05'` en los tres composables que alimentan los selectores:
  - `src/features/dashboard/composables/useDashboard.js`
  - `src/features/students/composables/useStudents.js`
  - `src/features/students/composables/useStudentDetail.js`
- El `selectedMonth` por defecto pasa a ser `getCurrentMonthValue()`, así el perfil del alumno
  abre directamente en el mes en curso.
