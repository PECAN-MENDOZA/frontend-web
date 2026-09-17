# Informe Task 12 — Portal de pruebas

## Checkpoints visuales previos

### `ResearchLayout.vue`

- Intención: orientar al investigador hacia el flujo vigente de pruebas y cuentas docentes.
- Jerarquía: «Pruebas» abre la navegación; «Docentes» queda como segundo destino.
- Paleta: conserva verde tinta, coral y ámbar del shell existente.
- Profundidad: conserva el sidebar plano con separación por contraste, sin nuevas capas.
- Superficies: canvas y topbar actuales.
- Tipografía: DM Sans para navegación; Fraunces permanece en la marca.
- Espaciado: conserva la retícula compacta de 4/8 px ya aplicada.

### `TestsListView.vue`

- Intención: permitir localizar una prueba, leer su avance y abrirla en una sola pasada.
- Jerarquía: título y acción «Nueva prueba» primero; estado y avance dominan cada fila.
- Paleta: superficies marfil, tinta verde, coral solo en la acción primaria y estados semánticos en `Tag`.
- Profundidad: una única tarjeta con sombra suave existente.
- Superficies: canvas → panel de directorio → filas transparentes.
- Tipografía: Fraunces para títulos, DM Sans y cifras tabulares para datos.
- Espaciado: base 4 px; panel compacto de herramienta educativa.

### `CreateTestDialog.vue`

- Intención: crear un borrador mínimo sin sacar al investigador de la lista.
- Jerarquía: código y título obligatorios; notas quedan como contexto secundario.
- Paleta: usa tokens actuales y rojo semántico solo para validación.
- Profundidad: diálogo PrimeVue sobre el panel, sin capas decorativas adicionales.
- Superficies: diálogo marfil e inputs ligeramente insertos.
- Tipografía: Fraunces en el mensaje de apertura; DM Sans en formulario y ayudas.
- Espaciado: base 4 px, grupos a 12–16 px.

### `TestEditorView.vue`

- Intención: redactar y congelar una secuencia, y después administrar su cohorte.
- Jerarquía: código/estado contextualizan; título y acciones por estado son el foco; editor y asignación siguen debajo.
- Paleta: verde tinta y marfil; coral para acción; ámbar/verde para estados vivos.
- Profundidad: paneles con la misma sombra suave del portal.
- Superficies: canvas → cabecera → panel de oraciones → panel de asignación.
- Tipografía: Fraunces para el título legible; DM Sans para edición y datos tabulares.
- Espaciado: base 4 px, separación de 20 px entre zonas operativas.

### `SentenceEditorTable.vue`

- Intención: editar una secuencia con el orden siempre visible y lectura rápida por condición.
- Jerarquía: número y texto conducen; tipo/ayuda contextualizan; reordenar/quitar se demueve a iconos accesibles.
- Paleta: controles neutros; errores en semántica de peligro; resumen en tinta suave.
- Profundidad: tabla contenida por bordes suaves, sin tarjetas por fila.
- Superficies: encabezado tonal y filas transparentes.
- Tipografía: DM Sans; posición y conteos con números tabulares.
- Espaciado: base 4 px, filas compactas y textarea con altura suficiente.

### `AssignTestDialog.vue`

- Intención: elegir inequívocamente una asignación por salón o por alumnos.
- Jerarquía: modo primero, selección después, confirmación al final.
- Paleta: tokens existentes; avisos semánticos para ausencia/error del directorio.
- Profundidad: diálogo único; controles insertos.
- Superficies: marfil y bloque informativo verde pálido.
- Tipografía: Fraunces en introducción y DM Sans en opciones/datos.
- Espaciado: base 4 px, campos separados por 16 px.

### `AttemptsTable.vue`

- Intención: vigilar progreso y abrir o excluir intentos sin perder contexto.
- Jerarquía: username y estado lideran; salón/inicio apoyan; acciones cierran la fila.
- Paleta: estado vía `Tag`; filas excluidas atenuadas con peligro suave.
- Profundidad: tabla plana dentro del panel de asignación.
- Superficies: encabezado tonal y filas transparentes.
- Tipografía: DM Sans; fechas y progreso con números tabulares.
- Espaciado: base 4 px, densidad compacta con áreas de acción PrimeVue.

### `ReasonDialog.vue`

- Intención: hacer deliberada y trazable una exclusión irreversible.
- Jerarquía: advertencia, motivo obligatorio y confirmación peligrosa.
- Paleta: rojo semántico limitado a icono/acción; resto en tokens existentes.
- Profundidad: diálogo PrimeVue, sin capas extra.
- Superficies: diálogo marfil e input inserto.
- Tipografía: Fraunces en advertencia; DM Sans en texto y contador tabular.
- Espaciado: base 4 px, bloque vertical compacto.

## Implementación

- `src/app/router/index.js`: `/research` redirige a `research-tests`; registra lista, editor y los nombres/rutas reservados para intento y resultados de Tasks 13–14.
- `src/app/layouts/ResearchLayout.vue`: navegación reducida a Pruebas y Docentes.
- `src/features/tests/views/TestsListView.vue`: carga, error con reintento, vacío accionable, tabla de resúmenes, creación y apertura.
- `src/features/tests/views/TestEditorView.vue`: edición por estado, guardado previo a activación, confirmaciones, carga de directorio/asignaciones, polling condicionado, asignación y exclusión.
- `src/features/tests/components/CreateTestDialog.vue`: código normalizado a mayúsculas, título/notas y `testFormErrors`.
- `src/features/tests/components/SentenceEditorTable.vue`: edición/reordenamiento/eliminación, límites, ayudas accesibles, resumen y modo de solo lectura.
- `src/features/tests/components/AssignTestDialog.vue`: asignación exclusiva por salón activo o alumnos seudonimizados.
- `src/features/tests/components/AttemptsTable.vue`: username, salón resuelto contra el directorio, estado, inicio disponible y acciones aplicables.
- `src/features/tests/components/ReasonDialog.vue`: motivo obligatorio de exclusión de 10–500 caracteres mediante `exclusionReasonError`.
- `src/assets/styles/main.css`: estilos acotados a la feature con tokens, tipografías, cifras tabulares, densidad y respuesta móvil existentes.

Estados cubiertos: carga con esqueletos, vacío accionable, error con reintento, mutación exitosa/fallida, permiso o recurso ausente sin afirmar la causa, directorio vacío/error, datos incompletos con `—`/«Sin identificar», controles imposibles deshabilitados y lectura congelada tras activación.

## Verificación

- `npm test`: 148/148 pruebas aprobadas.
- `npm run lint`: 0 errores y 0 advertencias.
- `npm run build`: Vite 8.0.14, 349 módulos transformados, build aprobado.
- `git diff --check`: aprobado.
- Puerta backend: `POST /api/v1/auth/staff/login` entregó JWT y `GET /api/v1/research/tests` respondió 200.
- Navegador Orca embebido, `http://localhost:5173`:
  - login con `revision@tesis.local` aprobado;
  - prueba `REV-E2E-12` / «Verificación Task 12» creada;
  - cuatro oraciones añadidas y guardadas;
  - confirmación «Las oraciones quedan congeladas. ¿Activar?» mostrada y activación aprobada;
  - salón `sofia_docente · 3.º B · 15 alumnos` seleccionado;
  - asignación aprobada y 15 filas (`student_001`…`student_015`) visibles con salón `3.º B` y estado `Pendiente`.
- Commit: asunto exacto `feat(pruebas): lista, editor de oraciones y asignacion en el panel del investigador`, con los trailers solicitados; el hash final se informa en la entrega porque el propio informe forma parte del commit.

## Decisiones y preocupaciones

- Se reutilizaron store/utilidades de Task 11 y componentes PrimeVue; no se añadieron dependencias ni abstracciones nuevas.
- Activar primero guarda el borrador válido y solo después llama al endpoint de activación, evitando congelar una versión anterior de las oraciones.
- Los registros `research-attempt` y `research-results` quedan nombrados y con su URL, pero sin componente hasta Tasks 13 y 14; no se fabricaron vistas fuera del alcance.
- `AssignmentStatusResponse` no expone `startedAt` aunque el brief pide la columna Inicio. La tabla consume `startedAt` si una evolución del contrato lo entrega y, con el contrato actual, muestra `—`; no sustituye por `assignedAt` para evitar afirmar un inicio falso.
- La prueba E2E solicitada permanece en el backend local como prueba activa asignada a `3.º B`; no se eliminó ni cerró porque el alcance pidió verificar ese estado final.
- En Orca, los controles fuera del viewport estrecho no siempre recibieron el clic por coordenadas aunque aparecían en el árbol accesible; al desplazar o activar el elemento desde su árbol accesible se verificó la confirmación y el flujo terminó. Fue una limitación del puente de automatización y no hubo error de consola atribuible a esta implementación.
