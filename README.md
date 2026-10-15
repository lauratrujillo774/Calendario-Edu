# EduCal — Agenda académica digital · I.E. Santa Elena

Aplicación web que combina un **calendario académico**, un **bullet journal** y una **página diaria tipo Hobonichi**, con
herramientas para el **estudiante**, un **asistente de IA** tipo Grok, inicio de sesión con correo o con **Google**, y todo
guardado en la base de datos MariaDB/MySQL `calendario_edu`.

> **Nota sobre la tecnología.** El proyecto ya estaba hecho en **Node.js + Express** (no PHP), así que se respetó esa
> arquitectura. Las contraseñas usan **bcrypt**, compatible con `password_hash()` / `password_verify()` de PHP (`$2y$`).

## 1. Estructura

```
Calendario-EDU3/
├─ backend/
│  ├─ .env                        configuración (BD, servidor e IA) — NO se sube a git
│  ├─ .env.example                plantilla del .env
│  ├─ app.js                      arranque
│  ├─ database/
│  │  ├─ calendario_edu.original.sql   copia de la BD ANTES de las migraciones (respaldo)
│  │  ├─ migrar.mjs                    ejecuta/revierte migraciones
│  │  └─ migraciones/001…012_*.sql     cambios de esquema (cada uno con su "deshacer")
│  ├─ scripts/crear-usuario.mjs   crea usuarios / asigna contraseñas desde la terminal
│  ├─ src/
│  │  ├─ config/                  env.js, conexión MySQL y reglas académicas (nota mínima)
│  │  ├─ middleware/              sesiones + CSRF, cabeceras de seguridad, límite de intentos
│  │  ├─ servicios/               permisos.js (qué ve cada rol), ia.js (cliente de IA), ia-contexto.js (qué datos recibe la IA)
│  │  ├─ utils/                   validaciones, subida segura de archivos, "hoy" en Colombia
│  │  ├─ routes/api/              auth, agenda, tareas, entregas, eventos, avisos, notas, pendientes, recordatorios,
│  │  │                           estadisticas, catalogo, admin, buscar, estudio, diario, bullets, habitos,
│  │  │                           colecciones, planes, asistencia, ia
│  │  └─ server/express.server.js
│  ├─ uploads/                    archivos subidos (FUERA de la carpeta pública)
│  └─ tests/                      api.test.mjs y nuevas.test.mjs (contra la BD real)
└─ frontend/
   ├─ pages/                      UNA página HTML por pantalla (inicio, calendario, tareas-pendientes, examenes, mi-diario, configuracion…), más pagina-principal, inicio-sesion, registrarse y app.html. La lista está en js/app/paginas.js y se regenera con npm run generar-paginas
   ├─ css/                        todos los estilos (app.css, cuaderno.css y nuevas.css son los de la aplicación)
   └─ js/                         todos los scripts; js/app/ es la aplicación (una pantalla por archivo en js/app/vistas/)
```

## 2. Instalación

Requisitos: **Node.js 20+** y **MariaDB/MySQL** (en XAMPP: iniciar *MySQL*).

```bash
cd backend
npm install
copy .env.example .env      # solo si aún no tienes .env; luego edítalo (¡PORT=3000!)
npm run migrar              # aplica los cambios de esquema (ver sección 3)
npm run dev                 # servidor con recarga automática  (o: npm start)
```

Abre **http://localhost:3000/** — el mismo servidor entrega la web y la API.
`nodemon` no vigila el `.env`: si lo cambias, detén el servidor (Ctrl+C) y vuelve a iniciarlo.

## 3. Base de datos y migraciones

1. **Haz una copia de seguridad** (ya hay una en `backend/database/calendario_edu.original.sql`; en phpMyAdmin: *Exportar*).
2. `npm run migrar` aplica, en orden, las migraciones pendientes. Otros comandos:
   `npm run migrar:estado` (ver cuáles están aplicadas) y `npm run migrar:revertir` (deshace la última).

| # | Qué hace |
|---|----------|
| 001 | `sesiones`: sesiones del servidor (solo se guarda el hash del token). |
| 002 | `tareas.publicada` (borradores) y `actualizado_en`; `entregas.comentario_profesor`, `calificado_en`, `archivo_nombre`. |
| 003 | `notas_personales`, `pendientes_personales`, `avisos`. |
| 004 | `recordatorios` de una tarea **o** de un pendiente, sin duplicados. |
| 005 | Vistas seguras (`INVOKER`, sin borradores, estados separados) y triggers sin duplicados / que impiden mover una tarea de grupo. |
| 006 | `pendientes_personales.tipo` (tarea / examen / evento) y `hora`: el estudiante agrega **su** examen o evento. |
| 007 | `dias_estudio`: días y minutos de estudio. |
| 008 | `diario_dias` (ánimo, gratitud, reflexión, memo) y `bullets` (registro rápido: tarea •, evento ○, nota –, idea ✦, prioridad, migración >). |
| 009 | `habitos` y `habitos_registros` (rastreador de hábitos). |
| 010 | `colecciones` y `coleccion_items` (listas temáticas del bullet journal). |
| 011 | `planes_clase` y `asistencias` (herramientas del docente). |
| 012 | `consultas_ia.tipo`: la tabla `consultas_ia` que ya existía guarda el historial de la IA. |
| 013 | `grados`, `grado_materias` (**pensum**: qué materias ve cada grado), `grupos.grado_id`, ficha de `usuarios` (identificación, fecha de nacimiento, grado, foto) y `docente_grados` / `docente_materias`. |
| 014 | `notificaciones`: campanita y cola de correos (una fila por aviso, sin repetirse; reintentos máx. 3). |
| 015 | `pendientes_personales.materia_id` y `nota` (0–5) para los exámenes/tareas propios; `recordatorios.texto` (recordar escribiendo). |
| 016 | `perfil_aprendizaje` (privado), `usuario_tecnica`, `sesiones_enfoque` (nivel de enfoque 1–5) y `guias_estudio` (guías del docente). |
| 017 | `diario_dias`: emociones, «cómo me siento», «qué salió bien», «qué mejorar» y energía. |
| 019 | Plan de estudios de Colombia: materias por grado (Transición con las dimensiones del preescolar; 1°–9° áreas de la Ley 115/94; 10°–11° con Biología, Física, Química, Filosofía y Ciencias Económicas y Políticas). |
| 020 | `docente_grupos` (reemplazada por la 021). |
| 022 | `horario_entradas`: lo que se escribe en el horario del día (con casilla de cumplido); no se mezcla con los pendientes. |
| 021 | `docente_clases`: qué materia dicta cada docente en cada grado (y opcionalmente en qué grupos). |
| 018 | `usuarios.nombres` y `apellidos` por separado (`nombre` sigue siendo el nombre completo). Ver `backend/database/ESQUEMA.md`. |

No se elimina ninguna tabla ni dato. Las migraciones se probaron revirtiendo todas y aplicándolas de nuevo.
La nota aprobatoria (3.0 sobre 5.0) está en `backend/src/config/academico.js`.

## 4. Cuentas: solo estudiantes

**EduCal es una aplicación para estudiantes.** Ya no hay cuentas de docente ni de administrador: no se pueden crear ni entran
(la regla está en `backend/src/config/acceso.js`; solo las pruebas automáticas la desactivan con `SOLO_ESTUDIANTES=false`).
Las cuentas de docente y administrador que existían en la base de datos **no se borraron**, pero ya no pueden iniciar sesión.

**Crear la cuenta:** en la página principal, *Crear Cuenta* → nombres, apellidos, correo y contraseña (mínimo 8 caracteres).
El **grado** (0 = Transición, 1 a 11) y el **grupo** (1, 2, 3…) son opcionales: se pueden escribir al registrarse o después, en *Configuración*.
Al escribirlos, el estudiante queda matriculado en su grupo (por ejemplo, grado 11 y grupo 1 → grupo **11-1**, que se crea si no existe) y le
aparecen las materias de su grado. Puede cambiarlos cuando quiera.

**Iniciar sesión o registrarse con Google.** El botón *Continuar con Google* aparece solo si configuras el ID de cliente:
1. Entra a <https://console.cloud.google.com> y crea un proyecto.
2. *APIs y servicios → Pantalla de consentimiento de OAuth*: elige "Externo", escribe el nombre de la aplicación (EduCal) y tu correo.
3. *Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web*.
4. En **Orígenes de JavaScript autorizados** agrega `http://localhost:3000` (y, cuando publiques la página, `https://tudominio.com`).
5. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`) y pégalo en `backend/.env`: `GOOGLE_CLIENT_ID=...`
6. Reinicia el servidor. Si el correo de Google ya tenía cuenta, entra a esa cuenta; si no, se crea una cuenta de estudiante con su nombre de Google.
   Una cuenta creada con Google no tiene contraseña: en *Configuración* puede crear una si quiere entrar también con su correo.

El servidor **verifica** el token de Google (`backend/src/servicios/google.js`); nunca se confía en lo que envía el navegador.
Mientras la aplicación de Google esté en modo "Prueba", solo entran los correos que agregues como "usuarios de prueba" en la consola de Google.
Atajo guiado: `npm run configurar-google` (explica los pasos, valida el ID y lo guarda en el `.env`). Si todavía no está configurado, el botón de Google se
muestra igual y, al pulsarlo, avisa qué falta.

**Alertas por correo a cualquier dominio.** Las alertas (tareas, exámenes, fechas que cambian, vencimientos, calificaciones y recordatorios) llegan a la
campanita y, si la persona lo permite, a **su correo registrado, de cualquier dominio** (del colegio, Gmail, Yahoo, Hotmail, Outlook…). EduCal envía desde
**una** cuenta de correo que tú configuras: `npm run configurar-correo` te deja elegir Gmail, Outlook, Yahoo, Brevo u otro servidor SMTP, guarda los datos en el
`.env`, prueba la conexión y puede enviar un correo de prueba. Para uso real con muchos estudiantes conviene un servicio de envío como Brevo (y, si usas el
dominio del colegio, sus registros SPF/DKIM) para que los correos no caigan en spam. En la aplicación, el menú **Alertas** (y el botón "Alertas" de arriba)
muestra todas las alertas, deja activar o desactivar el correo y tiene el botón **"Enviarme una alerta de prueba"**.

## 5. Qué ve el estudiante

| Menú | Qué hace |
|---|---|
| **Inicio** | Calendario del mes fijo (con día/semana/mes), "tu siguiente paso", la semana, recordatorios y pendientes |
| **Calendario** | Horario de 4 a. m. a 11 p. m. donde escribes y se guarda solo (con casilla de cumplido), notas, pendientes, reflexión del día y color del papel |
| **Tareas** · **Exámenes** | Las propias, con "presentado" y nota |
| **Mis calificaciones** · **Estadísticas** | Registro por materia y avance por materia |
| **Técnicas de estudio** · **Plan de clases** · **Asistente IA** | Cómo estudiar, enfoque, y consultas a la IA |
| **Mi diario** · **Registro futuro** · **Hábitos** | Emociones, gratitud, reflexión, hábitos con emoji y color |
| **Configuración** | Foto, datos, grado y grupo, contraseña y **Cerrar sesión** |

Cada pantalla tiene su propia página HTML en `frontend/pages/`. Las materias de cada grado vienen del plan de estudios cargado en la base de datos (migración 019).

## 6. Inteligencia artificial (Asistente EduCal IA)

Usa cualquier servicio **compatible con la API de OpenAI**; por defecto **xAI / Grok** (`https://api.x.ai/v1`). Funciones:

| Función | Quién | Dónde |
|---|---|---|
| **Chat experto** (coach de estudio / asesor pedagógico) con el contexto de tus datos | todos | Asistente IA |
| **Plan de estudio** por días y horas, que puedes agregar a tus pendientes | estudiante | Asistente IA |
| **Borrador de retroalimentación** para una entrega | docente | al *Calificar* |
| **Borrador de plan de clase** (objetivos, actividades, recursos, evaluación) | docente | Plan de clases |

También: **crear tarea con IA** (docente, en *Plan de clases*), **guía de estudio** (docente), **cómo aplicar una técnica** (estudiante) y **plan para estudiar un tema** (estudiante).

**Cómo conectar Grok (todo en `backend/.env`, sección 3):**
1. Crea una cuenta en <https://console.x.ai> y genera una *API key*.
2. En la carpeta `backend` ejecuta `npm run configurar-ia`: te pide la clave **sin mostrarla**, la guarda en `.env` y prueba la conexión. (O pégala a mano en `IA_API_KEY=`.)
3. Confirma en la consola de xAI el nombre de un modelo disponible y ponlo en `IA_MODELO=` (el valor `grok-4` es solo un ejemplo).
4. Reinicia el servidor. En *Asistente IA* verás “Conectada a api.x.ai · modelo …” (el administrador tiene un botón *Probar conexión*). También: `npm run probar-ia`.

**Correo (sección 4 del `.env`)**: `CORREO_ACTIVO=true` y los datos SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USUARIO`, `SMTP_CLAVE`, `CORREO_REMITENTE`).
Con Gmail usa una *contraseña de aplicación* (Cuenta de Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones), nunca tu clave normal.
Prueba con `npm run probar-correo -- tucorreo@ejemplo.com`. Sin SMTP configurado, las alertas siguen llegando a la campanita.

Variables: `IA_ACTIVA` (true/false), `IA_BASE_URL`, `IA_API_KEY`, `IA_MODELO`, `IA_TEMPERATURA`, `IA_MAX_TOKENS`, `IA_TIMEOUT_SEGUNDOS`,
`IA_LIMITE_POR_HORA` (consultas por usuario, protege tu saldo). Para usar otro proveedor compatible basta cambiar `IA_BASE_URL`, la clave y el modelo.
Sin clave, **toda la app funciona** y el asistente explica cómo configurarla.

**Privacidad y seguridad de la IA**
- La clave vive solo en el servidor; el navegador nunca la ve.
- A la IA se le envía un **resumen de los datos del propio usuario** (títulos, fechas y estados; **sin correos ni datos de otras personas**).
  Si no quieres enviar esa información a un tercero, pon `IA_ACTIVA=false`.
- El contenido que escriben las personas se trata como *datos*, no como instrucciones; la respuesta se muestra como texto (nunca como HTML).
- La IA **solo sugiere**: nada se guarda sin que la persona lo apruebe, y lo que se guarda pasa por las mismas validaciones y permisos de siempre.
- Las consultas del chat se guardan en `consultas_ia` (cada quien puede borrar su historial). Puede equivocarse: revisa siempre sus sugerencias.

## 7. Pruebas

```bash
cd backend && npm test
```
**54 pruebas de aceptación** contra la BD real con datos temporales (se borran solos): aislamiento por rol, tareas/entregas ajenas bloqueadas (403),
creación → calendario → cambio de fecha sin duplicados → calificación, borradores, notas privadas, filtros, recordatorios, exámenes personales con nota,
días de estudio, búsqueda, cola por calificar y libro, archivos, CSRF, login, triggers, registro con rol, diario, hábitos, plan de clases, asistencia,
**grados → pensum → docente → estudiante (asignaciones automáticas)**, **notificaciones y correos (reintentos)**, **técnicas y enfoque**, **guías**, fotos de perfil y
**todas las funciones de IA contra un servidor de IA falso** (contexto por rol sin filtrar datos ajenos, plan validado, errores, límite por hora, sin clave).

El frontend se verificó ejecutando todas las pantallas de los tres roles y los flujos principales (crear persona por grado, publicar → llega al estudiante, tarea propia,
examen presentado con nota, registro por materia, recordatorio, diario, hábito con emoji y paleta) con jsdom, **sin navegador real**.
**Falta una revisión visual en navegador y en celular** (diseño, colores, el menú por tamaños).

## 8. Seguridad (resumen)

Contraseñas con bcrypt · sesiones en el servidor con cookie `HttpOnly` + `SameSite=Lax` · token **CSRF** en toda petición que modifica datos ·
consultas preparadas · validación en el servidor · permisos por rol y por recurso en cada operación (`servicios/permisos.js`) · texto de usuarios siempre
insertado como texto (sin XSS) · CSP estricta · límite de intentos de login · archivos fuera de la carpeta pública, con nombre aleatorio, extensión
permitida, máximo 5 MB y comprobación del contenido. Para publicarlo en internet: `NODE_ENV=production`, HTTPS y contraseña propia para MySQL.

## 9. Limitaciones conocidas

- **Correos**: los envía el propio servidor mientras esté encendido (revisa cada minuto); no hay notificaciones push. El envío real por SMTP no se probó con un servidor de correo verdadero.
- El **modelo de IA** (`IA_MODELO`) hay que confirmarlo en tu proveedor; no se probó con una clave real (las pruebas usan un servidor falso).
- Un docente que se registra solo puede usar la app (diario, hábitos…) hasta que un administrador le asigne grados y materias.
- Las materias de un docente se limitan a las de los grados que dicta; los grupos deben tener su grado asignado para que se generen las asignaciones.
- La materia/grupo de una actividad no se puede cambiar después de crearla. Una asignación = un profesor.
- No hay recuperación de contraseña por correo: la restablece un administrador desde *Usuarios*.
- "Exámenes aprobados" cuenta solo exámenes oficiales **ya calificados** (nota mínima en `academico.js`).
- Las páginas antiguas (`pages/calendario.html`, `tareas-pendientes.html`, `estadisticas.html`, `inteligencia-artificial.html`) usan datos de ejemplo
  en el navegador y **ya no forman parte del flujo**; se pueden borrar.
