# API del Backend — Endpoints por rol (Alumno / Profesor)

Referencia para integrar el **portal web (Vue)** y la **app móvil (teclado)**.

- **Base URL (producción):** `https://backend-o4kvbijcma-uc.a.run.app`
- **Base URL (local):** `http://localhost:8080`
- **Documentación viva (Swagger):** `/swagger-ui.html`

## Autenticación

- Todos los endpoints **excepto los de `/api/v1/auth/**`** requieren cabecera:
  `Authorization: Bearer <token JWT>`
- El token se obtiene en el login/registro (`AuthResponse.token`) y expira en `expiresAt`.
- El backend valida el **rol** (`STUDENT` / `TEACHER`). Llamar a un endpoint con el rol equivocado → `403`.

### Convención de nombres JSON
Los cuerpos usan **nombres en español snake_case** (vía `@JsonProperty`). En este documento se muestra el nombre JSON real; entre paréntesis, el campo Java equivalente cuando ayuda.

### Códigos de error comunes
| Código | Significado |
|--------|-------------|
| `400` | Validación fallida (campo faltante, formato de mes `YYYY-MM` inválido, rango > 24 meses, etc.) |
| `401` | Token ausente, inválido o expirado |
| `403` | Rol incorrecto, o el profesor no tiene vínculo con ese alumno |
| `404` | Recurso no encontrado (sesión/alumno inexistente) |

---

# 0. Autenticación (público, sin token)

Usados por **ambos** clientes para obtener el token.

### `POST /api/v1/auth/students/login` → 200
Login del alumno (username + PIN). El PIN va en `password`.
```jsonc
// Request — StudentLoginRequest
{ "username": "tigre-07", "password": "1234" }
// Response — AuthResponse
{ "userId": "uuid", "token": "eyJ...", "expiresAt": "2026-07-01T10:00:00Z", "role": "STUDENT" }
```

### `POST /api/v1/auth/teachers/register` → 201
```jsonc
// Request — TeacherRegistrationRequest
{ "username": "prof.ana", "email": "ana@colegio.edu", "phone": "999888777",
  "institution": "Colegio X", "password": "MiClaveSegura1" }
// Response — AuthResponse  (role: "TEACHER")
```

### `POST /api/v1/auth/teachers/login` → 200
```jsonc
// Request — TeacherLoginRequest
{ "email": "ana@colegio.edu", "password": "MiClaveSegura1" }
// Response — AuthResponse
```

---

# 1. Endpoints de ALUMNO (rol `STUDENT`)

> Los usa la **app móvil (teclado)**. Contratos **sin cambios recientes**.

### `GET /api/v1/students/me` → 200
Datos del alumno autenticado.
```jsonc
// Response — StudentResponse
{ "id": "uuid", "username": "tigre-07", "institution": "Colegio X", "createdAt": "2026-06-01T12:00:00Z" }
```

### `POST /api/v1/corrections/process` → 201
Envía un texto y obtiene la corrección + sugerencias de la IA. Crea una **sesión de corrección**.
```jsonc
// Request — ProcessCorrectionRequest   (máx 5000 chars)
{ "texto_original": "el nino jugo con la pelota" }
// Response — CorrectionSessionResponse
{
  "id_sesion": "uuid",
  "texto_original": "el nino jugo con la pelota",
  "texto_corregido": "el niño jugó con la pelota",
  "correcciones_realizadas": 0,
  "suggestions": ["el niño jugó con la pelota", "..."],
  "suggestionOptions": [ { "text": "el niño jugó con la pelota", "recommended": true } ],
  "sugerencia_elegida": null,
  "acepto_correccion": null,
  "tiempo_respuesta_ms": null,
  "texto_final": null,
  "fue_editada": false,
  "palabras_corregidas": [],
  "createdAt": "2026-07-01T12:00:00Z"
}
```

### `PATCH /api/v1/corrections/sessions/{sessionId}/feedback` → 200
Registra si el alumno **aceptó o rechazó** la corrección. **Este es el paso que alimenta el aprendizaje de la IA y los KPIs del profesor.**
```jsonc
// Request — CorrectionFeedbackRequest
{ "acepto_correccion": true,
  "sugerencia_elegida": "el niño jugó con la pelota",  // base: obligatoria si acepto=true, debe ser una de suggestions
  "texto_final": "el niño jugó con su pelota" }         // 🆕 opcional: lo que el alumno realmente insertó (puede diferir)
// Response — CorrectionSessionResponse   (con palabras_corregidas derivadas por diff, + texto_final y fue_editada)
```
- `acepto_correccion` es **obligatorio**. Si es `true`, `sugerencia_elegida` es obligatoria y debe ser una de las `suggestions` ofrecidas (si no → `400`).
- `texto_final` (🆕) es **opcional**. Si el alumno **edita** la sugerencia antes de aceptar, envíalo con el texto final; si lo acepta tal cual, omítelo (o mándalo igual a `sugerencia_elegida`). No hace falta que esté en `suggestions`.
- El backend usa `texto_final` (si viene) para el diff palabra-por-palabra **y como texto que aprende la IA**. En la respuesta, `fue_editada = true` cuando `texto_final` difiere de `sugerencia_elegida`.
- **No se permite editar sin sugerencia base**: si `acepto=true` debes mandar siempre una `sugerencia_elegida` válida, aunque también mandes `texto_final`.

### `GET /api/v1/corrections/sessions/{sessionId}/words` → 200
Palabras corregidas de una sesión.
```jsonc
// Response — List<WordCorrectionResponse>
[ { "id": "uuid", "palabra_original": "nino", "palabra_corregida": "niño",
    "posicion_inicio": 3, "posicion_fin": 7 } ]
```

### `GET /api/v1/corrections/sessions` → 200
Historial paginado de sesiones del alumno (máx 50 por página).
```
Query: ?page=0&size=20&sort=createdAt,desc
```
```jsonc
// Response — PagedResponse<CorrectionSessionResponse>
{ "content": [ /* CorrectionSessionResponse */ ], "page": 0, "size": 20,
  "totalElements": 134, "totalPages": 7 }
```

---

# 2. Endpoints de PROFESOR (rol `TEACHER`)

> Los usa el **portal web (Vue)**. Los alumnos NO tienen acceso.

## 2.1 Gestión de alumnos

### `POST /api/v1/teachers/students/accounts` → 201
Crea una cuenta de alumno vinculada al profesor (genera username tipo `animal-NN` y PIN de 4 dígitos; cifra el nombre real).
```jsonc
// Request — CreateLinkedStudentRequest
{ "studentRealName": "Juan Pérez", "notes": "Refuerzo de tildes" }
// Response — CreatedStudentAccountResponse
{ "linkId": "uuid", "studentId": "uuid", "username": "tigre-07", "pin": "1234",
  "studentRealName": "Juan Pérez", "institution": "Colegio X",
  "notes": "Refuerzo de tildes", "createdAt": "2026-06-30T12:00:00Z" }
```

### `GET /api/v1/teachers/students` → 200
Lista de alumnos del profesor.
```jsonc
// Response — List<StudentLinkResponse>
[ { "id": "uuid", "studentId": "uuid", "studentUsername": "tigre-07",
    "studentRealName": "Juan Pérez", "notes": "Refuerzo de tildes",
    "createdAt": "2026-06-01T12:00:00Z", "lastAccessAt": "2026-06-30T09:00:00Z" } ]
```

### `POST /api/v1/teachers/students/{studentId}/reset-pin` → 200
Regenera el PIN del alumno.
```jsonc
// Response — ResetStudentPinResponse
{ "studentId": "uuid", "username": "tigre-07", "pin": "5678" }
```

## 2.2 KPIs  (base: `/api/v1/kpis/students/{studentId}`)

### `GET .../acceptance-rate?month=YYYY-MM` → 200
Tasa de aceptación del mes.
```jsonc
// AcceptanceRateResponse
{ "id_estudiante": "uuid", "month": "2026-06", "total_envios": 40,
  "total_aceptadas": 24, "total_rechazadas": 10, "sin_respuesta": 6,
  "total_editadas": 7,          // 🆕 de las aceptadas, cuántas fueron editadas por el alumno
  "tasa_aceptacion_pct": 60.0 }
```
`total_editadas` (🆕) permite distinguir "aceptó tal cual" de "aceptó editando la sugerencia".

### `GET .../acceptance-trend?from=YYYY-MM&to=YYYY-MM` → 200  🆕
Progreso de la tasa de aceptación a lo largo de varios meses (rango ≤ 24 meses; meses sin actividad vienen en 0 para una línea continua).
```jsonc
// AcceptanceTrendResponse
{ "id_estudiante": "uuid", "desde": "2026-01", "hasta": "2026-06",
  "serie": [
    { "month": "2026-01", "total_envios": 30, "total_aceptadas": 18, "tasa_aceptacion_pct": 60.0 },
    { "month": "2026-02", "total_envios": 0,  "total_aceptadas": 0,  "tasa_aceptacion_pct": 0.0 }
  ]}
```
**UI sugerida:** gráfico de línea (X = `month`, Y = `tasa_aceptacion_pct`).

### `GET .../top-words?month=YYYY-MM` → 200
Top 10 palabras más corregidas.
```jsonc
// TopWordsResponse
{ "id_estudiante": "uuid", "month": "2026-06",
  "top_palabras": [
    { "palabra_original": "nino", "frequency": 12, "veces_corregida_aceptada": 11 }
  ]}
```

### `GET .../error-types?month=YYYY-MM` → 200  🆕
Distribución de **tipos de error** del alumno en el mes (clasificados en el backend).
```jsonc
// ErrorTypesResponse
{ "id_estudiante": "uuid", "month": "2026-06", "total_errores": 42,
  "tipos_error": [
    { "tipo": "TILDE", "nombre": "Tildes y acentuación", "cantidad": 18, "porcentaje": 42.86 },
    { "tipo": "CONFUSION_B_V", "nombre": "Confusión b / v", "cantidad": 9, "porcentaje": 21.43 }
  ]}
```
**Valores posibles de `tipo`:** `TILDE`, `CONFUSION_B_V`, `H_MUDA`, `C_Q_K`, `LETRA_DOBLE`, `DISLEXIA_VISUAL`, `OTRO`. El campo `nombre` es la etiqueta legible.
**UI sugerida:** gráfico de barras o dona (etiqueta = `nombre`, valor = `cantidad`/`porcentaje`).

### `GET .../summary?month=YYYY-MM` → 200
Resumen combinado (tasa de aceptación + top palabras + nombre real del alumno).
```jsonc
// KpiSummaryResponse
{ "id_estudiante": "uuid", "name": "Juan Pérez", "month": "2026-06",
  "tasa_aceptacion": { /* AcceptanceRateResponse */ },
  "top_palabras": [ /* TopWordItem */ ] }
```

## 2.3 Reportes  (base: `/api/v1/reports/students/{studentId}`)

### `GET .../?month=YYYY-MM` → 200
Disponibilidad del reporte mensual (campos `null` se omiten por `@JsonInclude(NON_NULL)`).
```jsonc
// ReportAvailabilityResponse
{ "id_estudiante": "uuid", "alias_estudiante": "tigre-07", "nombre_estudiante": "Juan Pérez",
  "month": "2026-06", "available": true, "source": "PDF",
  "generated_at": "2026-06-30T12:00:00Z", "filename": "reporte-tigre-07-2026-06.pdf" }
```

### `GET .../pdf?month=YYYY-MM` → 200
Descarga el PDF. `Content-Type: application/pdf`, nombre en `Content-Disposition`. El cuerpo es binario (`byte[]`).

---

# 3. Interno (backend ↔ IA) — NO para clientes

Estos endpoints los llama **el backend** al servicio de IA; el front/móvil **no** debe usarlos. Se documentan solo como referencia de arquitectura.

| Método | Ruta (en la IA) | Uso |
|--------|-----------------|-----|
| `POST` | `/interno/corregir` | Backend pide la corrección de un texto |
| `POST` | `/interno/feedback` | Backend reenvía el feedback del alumno (dispara el aprendizaje) |

---

## Resumen rápido

| Cliente | Rol | Endpoints |
|---------|-----|-----------|
| **App móvil (teclado)** | `STUDENT` | `students/me`, `corrections/process`, `corrections/.../feedback`, `corrections/.../words`, `corrections/sessions` |
| **Portal web (docente)** | `TEACHER` | `teachers/students/*`, `kpis/students/*` (incl. 🆕 `acceptance-trend` y `error-types`), `reports/students/*` |
| **Ambos** | público | `auth/students/login`, `auth/teachers/register`, `auth/teachers/login` |

> 🆕 = nuevo. Cambios por cliente:
> - **App móvil (teclado):** el `PATCH .../feedback` ahora acepta `texto_final` (opcional) para soportar edición de la sugerencia por el alumno. Es retrocompatible (si no lo mandas, funciona igual que antes), pero para habilitar la edición hay que añadir el campo al request.
> - **Portal web (docente):** endpoints nuevos `acceptance-trend` y `error-types`; `acceptance-rate`/`summary` ganan `total_editadas`; la respuesta de corrección gana `texto_final`/`fue_editada` (útiles si se muestran sesiones).
