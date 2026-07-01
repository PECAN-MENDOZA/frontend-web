# Capitulo 3: Analisis y Diseno de Algoritmos - Frontend

## 3.X Arquitectura, modelo y algoritmo relacionado con el frontend

### Descripcion general

El frontend identificado en este repositorio corresponde a una aplicacion web docente denominada **FlorisBoard educator dashboard**. Su funcion principal es proporcionar una interfaz de seguimiento educativo para docentes, a partir de datos generados por el teclado digital y procesados por el backend del sistema.

El repositorio no contiene una implementacion local del algoritmo de correccion contextual ni de modelos de procesamiento de lenguaje natural. En cambio, actua como una capa de presentacion, supervision y gestion, encargada de mostrar metricas, estudiantes, palabras recurrentes, aceptacion de sugerencias y reportes derivados de los servicios del backend.

Desde la perspectiva de la tesis, este frontend cumple el rol de panel de observacion pedagogica. Permite que el docente interprete los resultados del uso del teclado digital adaptativo y tome decisiones de acompanamiento a partir de indicadores mensuales.

### Tecnologias utilizadas

La aplicacion utiliza las siguientes tecnologias principales:

- **Vue 3** como framework de construccion de interfaces.
- **Vite** como herramienta de desarrollo y empaquetado.
- **Vue Router** para la definicion de rutas publicas y protegidas.
- **Pinia** para la gestion de estado por modulo.
- **PrimeVue** y **PrimeIcons** para componentes visuales reutilizables.
- **Firebase Hosting** como configuracion de despliegue del frontend.
- **Fetch API** para la comunicacion HTTP con el backend.

Estas dependencias se identifican en `package.json`, especialmente en las entradas `vue`, `vite`, `pinia`, `vue-router`, `primevue` y `@vitejs/plugin-vue`.

### Estructura general de carpetas

El codigo fuente esta organizado bajo una arquitectura por caracteristicas o modulos funcionales:

```text
src/
  app/
    layouts/
    providers/
    router/
  assets/
    styles/
  features/
    auth/
    dashboard/
    reports/
    students/
  shared/
    components/
    constants/
    services/
    utils/
```

La carpeta `src/app` contiene elementos transversales de aplicacion, como rutas, layouts y proveedores globales. La carpeta `src/features` agrupa los modulos de negocio: autenticacion, tablero docente, estudiantes y reportes. La carpeta `src/shared` concentra elementos reutilizables, como componentes de indicadores, constantes, utilidades de KPI y el cliente HTTP centralizado.

El punto de entrada se encuentra en `src/main.js`. En este archivo se crea la aplicacion Vue, se registra Pinia, se instala el router y se cargan los proveedores globales de interfaz definidos en `src/app/providers/index.js`.

### Componentes principales encontrados en el codigo

El frontend presenta los siguientes componentes y capas principales:

1. **Capa de inicializacion de aplicacion**

   La inicializacion se realiza en `src/main.js`, donde se invoca `createApp(App)`, se registra `createPinia()`, se instala el router y se monta la aplicacion sobre el elemento `#app`.

2. **Capa de rutas y control de acceso**

   El archivo `src/app/router/index.js` define las rutas principales:

   - `/auth/login`: pantalla de inicio de sesion.
   - `/dashboard`: tablero mensual del aula.
   - `/students`: directorio de estudiantes.
   - `/students/:studentId`: detalle individual de estudiante.

   El router utiliza `createWebHistory(import.meta.env.BASE_URL)` y aplica guardias de navegacion mediante `router.beforeEach`. Las rutas protegidas poseen la propiedad `requiresAuth`, mientras que las rutas para usuarios no autenticados usan `guestOnly`.

3. **Capa de layout**

   El archivo `src/app/layouts/AppLayout.vue` define el contenedor principal del panel docente. Incluye la navegacion lateral hacia el resumen y el modulo de estudiantes, el estado de sesion, el perfil del usuario y la accion de cierre de sesion.

   El archivo `src/app/layouts/AuthLayout.vue` contiene el contenedor visual de la pantalla de autenticacion.

4. **Modulo de autenticacion**

   La vista `src/features/auth/views/LoginView.vue` implementa el formulario de inicio de sesion docente. La logica se abstrae en `src/features/auth/composables/useAuth.js`, mientras que el estado se administra en `src/features/auth/store/auth.store.js`.

   La comunicacion con el backend se realiza en `src/features/auth/services/auth.service.js`, mediante el endpoint `/auth/teachers/login`. La sesion resultante almacena token, usuario y expiracion en `localStorage`.

5. **Modulo de dashboard**

   La vista `src/features/dashboard/views/DashboardView.vue` muestra indicadores mensuales del aula, entre ellos estudiantes vinculados, aceptacion global, palabras recurrentes y estudiantes que requieren acompanamiento.

   La logica de obtencion y agregacion de datos se ubica en `src/features/dashboard/services/dashboard.service.js`. Este servicio consulta estudiantes vinculados mediante `/teachers/students` y, para cada estudiante, obtiene indicadores mediante `/kpis/students/{studentId}/summary?month={month}`.

6. **Modulo de estudiantes**

   La vista `src/features/students/views/StudentsView.vue` implementa el directorio de estudiantes, busqueda por nombre o alias, seleccion mensual y creacion de nuevas cuentas.

   La vista `src/features/students/views/StudentDetailView.vue` presenta el perfil individual de un estudiante, incluyendo aceptacion de sugerencias, envios del mes, palabra recurrente, mezcla de respuestas, palabras recurrentes, regeneracion de PIN y descarga de reporte.

   Las operaciones del modulo se concentran en `src/features/students/services/students.service.js`, donde se consumen endpoints para obtener estudiantes, crear cuentas, regenerar PIN y consultar KPIs individuales.

7. **Modulo de reportes**

   El modulo de reportes no presenta una pantalla independiente identificada. Su funcionalidad esta integrada en el detalle de estudiante mediante `src/features/reports/composables/useReportDownload.js` y `src/features/reports/services/reports.service.js`.

   Los endpoints utilizados son `/reports/students/{studentId}?month={month}` para verificar disponibilidad y `/reports/students/{studentId}/pdf?month={month}` para descargar el PDF.

8. **Componentes reutilizables de metricas**

   La carpeta `src/shared/components/insights` contiene componentes de presentacion de indicadores:

   - `MetricCard.vue`: tarjeta de indicador numerico.
   - `FeedbackMixPanel.vue`: visualizacion de respuestas aceptadas, ignoradas y sin respuesta.
   - `TopWordsTable.vue`: tabla de palabras recurrentes.

9. **Utilidades de KPI**

   El archivo `src/shared/utils/kpi.js` define funciones auxiliares para transformar datos del backend:

   - `getInitials`: obtiene iniciales del nombre.
   - `getStudentStatus`: clasifica el estado del estudiante.
   - `mapFeedbackMix`: transforma totales de aceptacion en porcentajes.
   - `mapTopWords`: adapta palabras recurrentes al formato visual.
   - `sumTopWordFrequency`: suma frecuencias de palabras recurrentes.

### Flujo principal de funcionamiento

El flujo de uso de la aplicacion puede describirse de la siguiente manera:

1. El docente ingresa a la aplicacion web y accede a la pantalla de login.
2. La vista `LoginView.vue` captura correo y contrasena, y delega el proceso a `useAuth`.
3. `auth.store.js` invoca `auth.service.js`, que envia la solicitud al endpoint `/auth/teachers/login`.
4. Si la autenticacion es exitosa, el token se guarda en `localStorage` con la clave definida en `src/shared/services/api.js`.
5. El router permite el acceso a rutas protegidas y redirige al dashboard.
6. En el dashboard, `useDashboard` solicita la carga del resumen mensual.
7. `dashboard.service.js` obtiene los estudiantes vinculados y consulta el resumen KPI por estudiante.
8. El frontend agrega los resultados del aula, calcula indicadores de aceptacion y determina palabras recurrentes.
9. El docente puede navegar al directorio de estudiantes para buscar perfiles, crear cuentas con PIN o abrir el detalle individual.
10. En el detalle individual, el sistema permite consultar metricas por mes, regenerar el PIN temporal y descargar el reporte PDF si esta disponible.

### Relacion con el backend

La relacion con el backend se encuentra centralizada en `src/shared/services/api.js`. Este archivo define la constante `API_BASE_URL` a partir de `import.meta.env.VITE_API_BASE_URL`, con valor alternativo local `http://localhost:8080/api/v1`.

El cliente HTTP agrega automaticamente el encabezado:

```text
Authorization: Bearer <token>
```

cuando existe un token en `localStorage`. Asimismo, si el backend responde con estado HTTP 401, se emite el evento `auth:unauthorized`, utilizado por el layout principal para redirigir al login.

Los endpoints identificados en el repositorio son:

- `/auth/teachers/login`: inicio de sesion docente.
- `/teachers/students`: listado de estudiantes vinculados al docente.
- `/teachers/students/accounts`: creacion de cuenta de estudiante.
- `/teachers/students/{studentId}/reset-pin`: regeneracion de PIN.
- `/kpis/students/{studentId}/summary?month={month}`: resumen mensual de indicadores por estudiante.
- `/reports/students/{studentId}?month={month}`: disponibilidad del reporte.
- `/reports/students/{studentId}/pdf?month={month}`: descarga del reporte PDF.

La variable `VITE_API_BASE_URL` aparece en `.env.example` y `.env.production`, apuntando a un backend desplegado en Cloud Run. La configuracion de Firebase Hosting esta definida en `firebase.json`, con carpeta publica `dist` y reescritura de rutas hacia `/index.html`.

### Pantallas o modulos existentes

El frontend contiene las siguientes pantallas o modulos:

1. **Inicio de sesion docente**

   Implementado en `src/features/auth/views/LoginView.vue`. Permite el acceso mediante correo institucional y contrasena. La sesion se mantiene con token y expiracion en almacenamiento local.

2. **Dashboard o resumen del aula**

   Implementado en `src/features/dashboard/views/DashboardView.vue`. Presenta metricas agregadas del aula, como estudiantes vinculados, aceptacion global, palabras recurrentes, acompanamiento y prioridad docente.

3. **Directorio de estudiantes**

   Implementado en `src/features/students/views/StudentsView.vue`. Permite visualizar estudiantes, filtrar por nombre o alias, seleccionar mes, actualizar informacion y abrir el perfil individual.

4. **Creacion de cuenta de estudiante**

   Implementada mediante `src/features/students/components/CreateStudentAccountDialog.vue`. Permite registrar el nombre del estudiante y notas docentes. Despues de la creacion, muestra alias y PIN temporal mediante `StudentCredentialDialog.vue`.

5. **Detalle individual del estudiante**

   Implementado en `src/features/students/views/StudentDetailView.vue`. Presenta indicadores individuales, respuestas aceptadas, ignoradas y sin respuesta, palabras recurrentes, notas docentes, regeneracion de PIN y descarga de reporte PDF.

6. **Reportes**

   Implementado parcialmente como funcionalidad integrada. No se identifica una vista independiente para reportes, pero existe verificacion de disponibilidad y descarga desde el perfil del estudiante.

### Datos mostrados o gestionados

Los datos gestionados por el frontend se agrupan en tres categorias:

1. **Datos de sesion**

   Incluyen token de acceso, usuario docente, rol y fecha de expiracion. Se gestionan en `src/features/auth/services/auth.service.js` y `src/features/auth/store/auth.store.js`.

2. **Datos administrativos de estudiantes**

   Incluyen identificador del estudiante, nombre real, alias, notas docentes, fecha de creacion, ultimo acceso, PIN temporal y estado de vinculacion. Se gestionan principalmente en `src/features/students/services/students.service.js`.

3. **Datos academicos y metricas**

   Incluyen:

   - tasa de aceptacion;
   - total de envios;
   - sugerencias aceptadas;
   - sugerencias ignoradas o rechazadas;
   - sugerencias sin respuesta;
   - palabras recurrentes;
   - frecuencia de repeticion;
   - cantidad de estudiantes que requieren acompanamiento;
   - disponibilidad de reportes mensuales.

   Estos datos se presentan mediante `DashboardView.vue`, `StudentsView.vue`, `StudentDetailView.vue`, `MetricCard.vue`, `FeedbackMixPanel.vue` y `TopWordsTable.vue`.

### Algoritmo de agregacion y clasificacion en el frontend

Aunque el frontend no contiene el algoritmo NLP de correccion contextual, si implementa reglas de agregacion y clasificacion para fines de visualizacion pedagogica.

En `src/features/dashboard/services/dashboard.service.js`, la funcion `getDashboardSummary(month)` ejecuta el siguiente procedimiento:

1. Consulta la lista de estudiantes vinculados.
2. Para cada estudiante, solicita el resumen KPI mensual.
3. Agrega los totales de aceptacion del aula.
4. Calcula la tasa de aceptacion global.
5. Consolida las palabras recurrentes de todos los estudiantes.
6. Ordena las palabras por frecuencia y conserva las diez principales.
7. Genera una lista de estudiantes con metricas normalizadas para su presentacion.
8. Selecciona un estudiante de foco a partir de la cantidad de palabras recurrentes.

En `src/shared/utils/kpi.js`, la funcion `getStudentStatus` clasifica al estudiante de acuerdo con reglas simples:

- Si no tiene envios, se clasifica como `Sin datos`.
- Si la aceptacion es menor que 50% o posee al menos 8 recurrencias, se clasifica como `Acompanar`.
- Si la aceptacion es menor que 70% o posee al menos 4 recurrencias, se clasifica como `Observar`.
- En los demas casos, se clasifica como `En progreso`.

Estas reglas no sustituyen el modelo de correccion contextual; su funcion es apoyar la lectura docente de los resultados procesados por el backend.

### Relacion con la solucion de tesis

La tesis plantea una aplicacion de teclado digital adaptativo con correccion contextual para estudiantes con disgrafia y dislexia en contextos educativos hispanohablantes. Dentro de ese sistema, el frontend web revisado cumple una funcion complementaria: ofrecer al docente una interfaz de monitoreo y seguimiento.

La relacion con la solucion de tesis puede resumirse en los siguientes puntos:

- Permite observar el efecto del uso del teclado digital mediante tasas de aceptacion y envios mensuales.
- Facilita la identificacion de palabras recurrentes que pueden requerir refuerzo pedagogico.
- Permite priorizar estudiantes que necesitan acompanamiento segun baja aceptacion o alta recurrencia.
- Integra reportes PDF mensuales por estudiante.
- Administra cuentas de estudiantes mediante alias y PIN temporal, lo que vincula el panel docente con el cliente de teclado digital.

Por tanto, el frontend no constituye el nucleo algoritimico NLP, sino la interfaz de seguimiento y explicacion de resultados para el contexto educativo.

### Limitaciones y partes pendientes identificadas

Durante la revision del repositorio se identifican las siguientes limitaciones:

- No se identifica implementacion local de correccion contextual basada en NLP.
- No se identifica entrenamiento, inferencia ni evaluacion de modelos linguisticos en el frontend.
- No se identifica analisis especifico de errores de disgrafia o dislexia dentro del codigo frontend.
- No se identifica distribucion por tipo de error ni puntajes de confianza expuestos en las vistas.
- El modulo de reportes no tiene una pantalla propia; se encuentra integrado al detalle del estudiante.
- La seleccion de meses aparece definida de forma estatica en `useDashboard.js` y `useStudents.js`.
- El frontend depende del contrato del backend para disponer de datos academicos y reportes.

Estas limitaciones no invalidan la utilidad del frontend, pero delimitan su alcance dentro de la arquitectura general del sistema.

## Tabla de componentes encontrados

| Componente encontrado | Archivo o ruta | Responsabilidad | Estado |
|---|---|---|---|
| Inicializacion Vue | `src/main.js` | Registra aplicacion, Pinia, router y proveedores UI | Implementado |
| Configuracion Vite | `vite.config.js` | Define plugins Vue, DevTools y alias `@` hacia `src` | Implementado |
| Enrutador | `src/app/router/index.js` | Define rutas publicas, protegidas y guardias de sesion | Implementado |
| Layout docente | `src/app/layouts/AppLayout.vue` | Navegacion principal, contenedor de vistas y cierre de sesion | Implementado |
| Layout de autenticacion | `src/app/layouts/AuthLayout.vue` | Contenedor visual para pantalla de login | Implementado |
| Proveedor PrimeVue | `src/app/providers/index.js` | Registra PrimeVue, tema Aura y localizacion de componentes | Implementado |
| Pantalla de login | `src/features/auth/views/LoginView.vue` | Captura credenciales docentes y muestra errores de autenticacion | Implementado |
| Composable de autenticacion | `src/features/auth/composables/useAuth.js` | Coordina envio de credenciales y redireccion posterior al login | Implementado |
| Store de autenticacion | `src/features/auth/store/auth.store.js` | Mantiene usuario autenticado, estado de carga y mensajes de error | Implementado |
| Servicio de autenticacion | `src/features/auth/services/auth.service.js` | Consume `/auth/teachers/login` y persiste token, usuario y expiracion | Implementado |
| Cliente HTTP centralizado | `src/shared/services/api.js` | Construye solicitudes HTTP, agrega token Bearer y maneja 401 | Implementado |
| Dashboard mensual | `src/features/dashboard/views/DashboardView.vue` | Presenta resumen del aula, metricas y prioridad docente | Implementado |
| Composable de dashboard | `src/features/dashboard/composables/useDashboard.js` | Controla mes seleccionado, carga inicial y actualizacion del dashboard | Implementado |
| Store de dashboard | `src/features/dashboard/store/dashboard.store.js` | Administra datos, carga, errores y colecciones derivadas del dashboard | Implementado |
| Servicio de dashboard | `src/features/dashboard/services/dashboard.service.js` | Agrega datos de estudiantes y KPIs para resumen del aula | Implementado |
| Tabla de estudiantes del dashboard | `src/features/dashboard/components/StudentTable.vue` | Muestra resumen por estudiante dentro del dashboard | Implementado |
| Directorio de estudiantes | `src/features/students/views/StudentsView.vue` | Lista estudiantes, filtra busqueda y abre perfiles | Implementado |
| Detalle de estudiante | `src/features/students/views/StudentDetailView.vue` | Muestra metricas individuales, palabras recurrentes, PIN y reporte | Implementado |
| Store de estudiantes | `src/features/students/store/students.store.js` | Administra listado, detalle, creacion, PIN y errores | Implementado |
| Servicio de estudiantes | `src/features/students/services/students.service.js` | Consume endpoints de estudiantes, cuentas, PIN y KPIs | Implementado |
| Composable de estudiantes | `src/features/students/composables/useStudents.js` | Filtra estudiantes, calcula aceptacion promedio y conteo de acompanamiento | Implementado |
| Composable de detalle | `src/features/students/composables/useStudentDetail.js` | Carga el estudiante segun ruta y mes seleccionado | Implementado |
| Dialogo de creacion de estudiante | `src/features/students/components/CreateStudentAccountDialog.vue` | Captura nombre, notas y solicita creacion de cuenta | Implementado |
| Dialogo de credenciales | `src/features/students/components/StudentCredentialDialog.vue` | Muestra alias y PIN temporal, con opcion de copia | Implementado |
| Tabla de estudiantes | `src/features/students/components/StudentsTable.vue` | Presenta estudiantes con paginacion, metricas y accion de perfil | Implementado |
| Reportes PDF | `src/features/reports/services/reports.service.js` | Verifica disponibilidad y descarga reportes por estudiante | Parcial |
| Composable de descarga de reporte | `src/features/reports/composables/useReportDownload.js` | Controla estado de verificacion y descarga del PDF | Parcial |
| Tarjeta de metrica | `src/shared/components/insights/MetricCard.vue` | Presenta indicadores numericos resumidos | Implementado |
| Panel de mezcla de feedback | `src/shared/components/insights/FeedbackMixPanel.vue` | Visualiza aceptadas, ignoradas y sin respuesta | Implementado |
| Tabla de palabras recurrentes | `src/shared/components/insights/TopWordsTable.vue` | Lista top de palabras recurrentes y frecuencia | Implementado |
| Utilidades KPI | `src/shared/utils/kpi.js` | Normaliza palabras, feedback y clasifica estado del estudiante | Implementado |
| Constantes de aplicacion | `src/shared/constants/app.js` | Define nombre y lema de la aplicacion | Implementado |
| Hosting Firebase | `firebase.json` | Configura `dist` como carpeta publica y rewrite SPA | Implementado |
| Algoritmo NLP en frontend | No identificado en el repositorio | Correccion contextual o inferencia linguistica local | No identificado |
| Analisis por tipo de error | No identificado en el repositorio | Clasificacion de errores especificos de disgrafia o dislexia | No identificado |
| Puntajes de confianza del modelo | No identificado en el repositorio | Visualizacion de confianza o probabilidad de sugerencias | No identificado |
| Pantalla independiente de reportes | No identificado en el repositorio | Gestion centralizada de reportes fuera del perfil individual | No identificado |
