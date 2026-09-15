# Panel de investigación — Registro de smoke test manual

Registro de la ejecución de smoke test del panel de investigación (`/research/**`) realizada el **2026-09-15** contra el stack local, más una checklist reutilizable para repetirla en el futuro.

- Repo: `frontend-web`, rama `feat/panel-investigador`, HEAD `28f98e2`.
- Alcance: automatizados (`npm test`, `npm run build`, `npm run lint`), autorización por rol, estados/anonimización en las 4 vistas de investigación en dos anchos, y los flujos reales de estudio, sesiones y anotación contra el backend.

## Prerrequisitos

- Backend (Spring Boot) corriendo en `http://localhost:8080` con la base de datos seed.
- Frontend con `npm run dev` en `http://localhost:5173`.
- Cuenta de investigador: credenciales tomadas de las variables de entorno del backend `RESEARCHER_EMAIL` / `RESEARCHER_PASSWORD`. **Nunca escribir la contraseña en este documento ni en commits**; obtenerla del `.env`/secreto del backend en el momento de probar.
- Cuenta docente demo: `sofia.garcia@colegio.edu.pe`, contraseña tomada de `app.demo-seed.teacher-password` (tampoco se transcribe aquí).
- Estudio de referencia para los pasos de datos/estados: `PILOTO-02` (con datos ya cargados). Para los flujos en vivo se usa `PILOTO-03` (estudio nuevo) y `PILOTO-01` (sesiones con incidencias).
- Navegador: Chrome headless vía Playwright, o cualquier navegador de escritorio en modo manual, en dos anchos: **1440 px** (escritorio) y **390 px** (móvil).

> El detalle exacto de la corrida automatizada de autorización vive en un script auxiliar del orquestador (`smoke-run.mjs`), que no forma parte del repo y no se versiona.

## 1. Automatizados

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| `npm test` | Todas las pruebas unitarias pasan | ✅ 101 tests, 0 fallos |
| `npm run build` | Build de producción sin errores | ✅ OK |
| `npm run lint` | Sin errores de lint (oxlint + eslint) | ✅ OK |

## 2. Autorización por rol

### 2.1 Investigador

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| Login con cuenta de investigador | Redirige a `/research` | ✅ |
| Investigador navega a `/dashboard` | Redirige a `/research` | ✅ |
| Investigador navega a `/students` | Redirige a `/research` | ✅ |
| Investigador con sesión activa visita `/auth/login` | Redirige a `/research` | ✅ |
| Cerrar sesión | Redirige a `/auth/login`; borra `florisboard_access_token`, `florisboard_user`, `florisboard_token_expiration` | ✅ |
| JWT expirado (expiración en el pasado) | Redirige a `/auth/login?redirect=/research` | ✅ |
| Token manipulado (backend responde 401) | Redirige a `/auth/login` | ✅ |

### 2.2 Docente (cuenta demo `sofia.garcia@colegio.edu.pe`)

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| Login | Redirige a `/dashboard` | ✅ |
| Docente navega a `/research` | Redirige a `/dashboard` | ✅ |
| Docente navega a `/research/results` | Redirige a `/dashboard` | ✅ |
| Shell del docente | No contiene navegación de investigación | ✅ |

**Total autorización: 30/30 checks OK.**

## 3. Datos y estados (1440 px y 390 px)

Rutas verificadas: `/research`, `/research/study`, `/research/sessions`, `/research/results`, con el estudio `PILOTO-02`.

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| Cargar las 4 rutas a 1440 px | Sin overflow horizontal de la página | ✅ |
| Cargar las 4 rutas a 390 px | Sin overflow horizontal de la página | ✅ |
| Inspeccionar texto del DOM (regex sobre `@`, alias, correo, diagnóstico, docente, institución, `student_N`) | Ningún campo de identidad presente | ✅ |
| Tabla de pares (par de condiciones por participante) a 390 px | Hace scroll dentro de su propio contenedor, no de la página | ✅ |
| Foco de teclado en enlaces de navegación | Outline de foco visible (`outline` automático) | ✅ |
| Consola / errores de página durante la navegación | Cero errores | ✅ |

## 4. Flujos en vivo contra el backend real

### 4.1 Ciclo de vida de estudio y participante — `PILOTO-03` (estudio nuevo)

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| Guardar protocolo v1 | Protocolo guardado | ✅ |
| Activar estudio | Pide confirmación antes de activar | ✅ |
| Crear participante `P-001` | Participante creado | ✅ |
| Generar código de acceso | Se abre diálogo con autofoco en el botón "Ya entregué el código" | ✅ |
| Cerrar el diálogo | El foco vuelve al encabezado "Participantes" (el botón que abrió el diálogo queda deshabilitado) | ✅ |
| Código de acceso tras cerrar el diálogo | Desaparece del DOM; nunca se guarda en `localStorage` | ✅ |

### 4.2 Regenerar código de acceso — `PILOTO-02`

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| Regenerar código de un participante existente | `revoke` sin cuerpo, luego `access-code` responde `{}` | ✅ |

### 4.3 Anotación de discrepancias — `PILOTO-02`

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| Crear lote de anotación `ORTHOGRAPHY` | Lote creado | ✅ |
| Descargar CSV del lote | Archivo `annotations-ORTHOGRAPHY-<id8>.csv` | ✅ |
| Importar RATER_1 "Ana" y RATER_2 "Luis" | Coincidencia exacta 1.000 | ✅ |
| Adjudicar el lote | Estado `ADJUDICATED` | ✅ |
| PEO tras adjudicar (`ORTHOGRAPHY`) | 12.50 % vs 16.67 %, con etiqueta "Muestra insuficiente" (n = 1) | ✅ |
| Repetir el ciclo para `SEMANTIC` | TAS 0/1, IC Wilson [0.00 %; 79.35 %], etiqueta "Resultado descriptivo" (sin límite configurado) | ✅ |

### 4.4 Sesiones con incidencias — `PILOTO-01`

| Paso | Resultado esperado | Resultado 2026-09-15 |
|---|---|---|
| Revisar 4 ejecuciones con incidencias | Cada una ofrece acciones Excluir, Cancelar o Fallo técnico según su estado | ✅ |

## Cómo repetir manualmente

1. Levantar el backend local en `:8080` (con la base seed) y el frontend con `npm run dev`.
2. Obtener las credenciales de investigador (`RESEARCHER_EMAIL`/`RESEARCHER_PASSWORD`) y de docente demo (`app.demo-seed.teacher-password`) desde la configuración del backend — no copiarlas a este documento.
3. Repetir la sección 2 (autorización) iniciando sesión alternadamente como investigador y como docente, probando las redirecciones cruzadas y el cierre de sesión.
4. Repetir la sección 3 cargando cada ruta de `/research/**` a 1440 px y a 390 px sobre un estudio con datos (p. ej. `PILOTO-02`), revisando overflow, el texto del DOM y el scroll de la tabla de pares.
5. Repetir la sección 4 sobre un estudio nuevo (protocolo → activación → participante → código) y sobre un estudio con datos (regenerar código, crear/descargar/importar/adjudicar un lote de anotación, revisar sesiones con incidencias).
6. Verificar que ningún paso haya dejado un código de acceso en `localStorage` ni un campo de identidad en el DOM.
