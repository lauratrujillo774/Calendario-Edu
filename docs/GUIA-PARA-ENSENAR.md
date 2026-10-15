# Qué enseñar para que los estudiantes construyan una aplicación como EduCal

Guía para el docente. Usa EduCal como proyecto modelo: cada tema indica **qué concepto enseñar**, **un ejemplo mínimo** y **en qué archivo de este proyecto se ve aplicado**.

> **Aclaración honesta.** EduCal tiene login con correo y contraseña, CRUD, subida de fotos, correos (SMTP), IA compatible con OpenAI (Grok) y pruebas automáticas.
> **No tiene** inicio de sesión con Google, ni usa `multer` (usa `express-fileupload`), ni está desplegado en internet. Para esos tres temas la guía trae
> ejemplos de referencia **que no están integrados ni probados en este proyecto**: pruébalos con tus estudiantes en una carpeta aparte antes de enseñarlos.
> Los nombres de modelos de IA, planes gratuitos y precios de hosting cambian seguido: verifícalos en la documentación oficial el día que los uses.

---

## 0. Perfil del curso

- **Nivel:** estudiantes que ya saben usar computador y tienen lógica básica. No necesitan saber programar al empezar.
- **Duración sugerida:** 16 semanas, 3 horas semanales (48 h). Se puede comprimir a 10 semanas si ya conocen HTML/JS.
- **Método:** proyecto real desde la semana 1. Cada semana termina con algo que se ve funcionando (una pantalla, una ruta, una tabla).
- **Herramientas:** Visual Studio Code, Node.js 20 o superior, XAMPP (MariaDB/MySQL) o MySQL, Git y GitHub, Postman o Thunder Client, un navegador con herramientas de desarrollador (F12).

### Mapa del proyecto (para que sepan dónde mirar)

| Carpeta / archivo | Qué enseña |
|---|---|
| `backend/app.js` | Punto de entrada: arrancar el servidor |
| `backend/src/server/express.server.js` | Configuración de Express: middlewares, archivos estáticos, carga de rutas |
| `backend/src/config/mysql/dbmysql.js` | Conexión a la base de datos (pool) |
| `backend/src/routes/api/*.js` | Un archivo por recurso: `notas.js`, `pendientes.js`, `horario.js`, `admin.js`… (los **endpoints**) |
| `backend/src/middleware/sesion.js`, `seguridad.js` | Sesiones, CSRF, roles, límite de intentos, cabeceras de seguridad |
| `backend/src/servicios/` | Lógica reutilizable: `correo.js`, `ia.js`, `fotos.js`, `notificaciones.js`, `permisos.js`, `estructura.js` |
| `backend/src/utils/validar.js` | Validación de datos que llegan del usuario |
| `backend/database/migraciones/` | Cambios de la base de datos con control de versiones (SQL) |
| `backend/tests/` | Pruebas automáticas con `node:test` |
| `backend/.env` y `.env.example` | Configuración y claves (nunca se sube a Git) |
| `frontend/pages/` | Una página HTML por pantalla |
| `frontend/css/` | Estilos |
| `frontend/js/app/` | El código del navegador: `api.js` (fetch), `ui.js` (helpers de DOM), `main.js` (rutas), `vistas/` (una pantalla por archivo) |

---

## 1. Fundamentos de la web (semanas 1–2)

**Conceptos**
- Cliente y servidor. Qué pasa cuando escribes una dirección: DNS → IP → petición HTTP → respuesta.
- URL: protocolo, dominio, puerto, ruta, *query string* (`?q=ana`), *hash* (`#/inicio`).
- HTTP: **métodos** (GET leer, POST crear, PUT reemplazar, PATCH modificar una parte, DELETE borrar), **cabeceras**, **cuerpo**, **códigos de estado**:
  200 OK · 201 creado · 400 datos mal enviados · 401 no has iniciado sesión · 403 no tienes permiso · 404 no existe · 409 conflicto (por ejemplo, correo repetido) · 500 error del servidor.
- JSON: el formato en que viajan los datos (`{"nombre":"Ana","edad":15}`).
- Herramientas: pestaña **Network** de F12 para ver las peticiones reales de EduCal.

**HTML** — estructura, formularios (`<form>`, `<input type="email|password|date|file">`, `<label>`, `<select>`), semántica y accesibilidad (`aria-label`, `<button type="button">` vs `submit`).

**CSS** — selectores, modelo de caja, **flexbox**, **grid**, variables (`:root { --acento: #2563eb }`), diseño responsive (`@media (max-width: 700px)`), estados (`:hover`, `:focus-visible`).
*Se ve en:* `frontend/css/app.css`, `nuevas.css`.

**Práctica:** una página personal con formulario y diseño responsive.

---

## 2. JavaScript, de cero a lo que usa el proyecto (semanas 3–5)

Enseña cada estructura con un ejemplo corto que ellos escriban.

### Variables y tipos
```js
const nombre = 'Ana';        // no se reasigna
let intentos = 0;            // sí se puede cambiar
const edad = 15, activo = true, notas = [4.5, 3.8], alumno = { nombre: 'Ana', grado: 11 };
```
`const` por defecto; `let` solo si cambia. Evitar `var`.

### Operadores y condicionales
```js
if (nota >= 3) { estado = 'Aprobado'; } else if (nota >= 2) { estado = 'Recuperación'; } else { estado = 'Reprobado'; }
const mensaje = nota >= 3 ? 'Aprobó' : 'No aprobó';   // ternario
const nombre = usuario?.nombre ?? 'Invitado';          // ?. (encadenamiento opcional) y ?? (valor por defecto)
switch (rol) { case 'admin': ...; break; default: ...; }
```
`===` (estricta) en vez de `==`; `&&`, `||`, `!`.

### Bucles — **for** y sus variantes
```js
for (let i = 0; i < 5; i++) { console.log(i); }                 // for clásico: contador
for (const nota of notas) { suma += nota; }                      // for...of: recorre los VALORES de una lista
for (const clave in alumno) { console.log(clave, alumno[clave]); } // for...in: recorre las CLAVES de un objeto
let n = 0; while (n < 3) { n++; }                                // while: mientras se cumpla una condición
```
Métodos de arreglos (los más usados en EduCal):
```js
notas.forEach((n) => console.log(n));                 // hace algo con cada elemento
const dobles = notas.map((n) => n * 2);               // transforma → nuevo arreglo
const aprobadas = notas.filter((n) => n >= 3);        // filtra
const primera = notas.find((n) => n < 3);             // primer elemento que cumple
const promedio = notas.reduce((a, n) => a + n, 0) / notas.length;  // acumula
notas.some((n) => n < 3); notas.every((n) => n >= 3); notas.includes(4.5);
```
*Se ve en:* `frontend/js/app/vistas/calificaciones.js` (muchos `map` y `filter` para dibujar listas).

### Funciones
```js
function sumar(a, b) { return a + b; }            // declaración
const restar = (a, b) => a - b;                    // función flecha
const saludar = (nombre = 'amigo') => `Hola, ${nombre}`;   // parámetro por defecto + plantilla de texto
```
Conceptos: parámetros, retorno, *scope* (alcance), funciones que reciben funciones (*callbacks*), desestructuración (`const { nombre, grado } = alumno;`), *spread* (`{ ...alumno, grado: 11 }`).

### Asincronía (lo más difícil, dedícale tiempo)
- Por qué existe: pedir datos a un servidor o a la base de datos **tarda**.
- `Promise`, `async` / `await`, `try { } catch (error) { }`.
```js
async function cargarNotas() {
  try {
    const respuesta = await fetch('/api/notas');
    if (!respuesta.ok) throw new Error('No se pudo cargar');
    const datos = await respuesta.json();
    return datos.items;
  } catch (error) { console.error(error.message); }
}
```
*Se ve en:* `frontend/js/app/api.js` (todas las llamadas al servidor).

### Módulos
```js
export function sumar(a, b) { ... }          // en un archivo
import { sumar } from './matematicas.js';    // en otro
```
*Se ve en:* cada archivo de `frontend/js/app/` y `backend/src/`.

### El DOM y los eventos (en el navegador)
```js
const boton = document.querySelector('#guardar');
boton.addEventListener('click', async () => { ... });
const li = document.createElement('li'); li.textContent = nota.titulo; lista.append(li);
```
**Seguridad:** usar `textContent` (no `innerHTML`) con datos del usuario → evita XSS. *Se ve en:* `ui.js`, función `h()`, que construye elementos de forma segura.

**Práctica:** lista de tareas (agregar, tachar, borrar) solo con JavaScript, guardando en `localStorage`.

---

## 3. Node.js y npm (semana 6)

- Qué es Node: JavaScript fuera del navegador. `node archivo.js`.
- `npm init`, `package.json` (dependencias, **scripts** `"dev": "nodemon app.js"`), `node_modules` (no se sube a Git), `package-lock.json`.
- ES Modules: `"type": "module"` en `package.json` para usar `import`/`export`.
- **Variables de entorno y `.env`**: separar configuración y secretos del código.
  ```
  # .env  (NUNCA se sube a Git: añadirlo a .gitignore)
  PORT=3000
  DB_HOST=localhost
  DB_USER=root
  DB_PASSWORD=
  DB_NAME=calendario_edu
  ```
  ```js
  import 'dotenv/config';              // o: node --env-file=.env app.js  (Node 20.6+)
  const puerto = process.env.PORT ?? 3000;
  ```
  Dejar un `.env.example` con los nombres de las variables **sin** valores secretos. *Se ve en:* `backend/.env.example`.
- Módulos nativos útiles: `node:fs` (archivos), `node:path` (rutas), `node:crypto` (aleatorios y hashes).

---

## 4. Express: el servidor y las rutas (semanas 7–8)

### Servidor mínimo
```js
import express from 'express';
const app = express();
app.use(express.json());                     // permite leer el JSON que envía el cliente
app.get('/saludo', (req, res) => res.json({ mensaje: 'Hola' }));
app.listen(3000, () => console.log('Servidor en http://localhost:3000'));
```

### ¿Qué es `router.get` (y `post`, `put`, `delete`)?
Un **Router** es un grupo de rutas con el mismo prefijo, para no meter todo en un archivo. Cada línea `router.<método>(<ruta>, <función>)` dice:
*"cuando llegue una petición con este método HTTP a esta ruta, ejecuta esta función"*. Esa combinación se llama **endpoint**.

```js
// backend/src/routes/api/notas.js
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => { ... });         // GET    /api/notas        → listar
router.get('/:id', (req, res) => { ... });      // GET    /api/notas/5      → ver una
router.post('/', (req, res) => { ... });        // POST   /api/notas        → crear
router.put('/:id', (req, res) => { ... });      // PUT    /api/notas/5      → actualizar
router.delete('/:id', (req, res) => { ... });   // DELETE /api/notas/5      → eliminar

export default router;

// en el servidor:  app.use('/api/notas', router);
```

### `req` y `res`
| | Qué es | Ejemplo |
|---|---|---|
| `req.params` | partes variables de la ruta | `/notas/:id` → `req.params.id` |
| `req.query` | lo que va después de `?` | `/notas?q=mate` → `req.query.q` |
| `req.body` | el JSON enviado (POST/PUT/PATCH) | `req.body.titulo` |
| `req.cookies`, `req.headers` | cookies y cabeceras | |
| `res.json(obj)` | responde JSON | `res.json({ items })` |
| `res.status(201).json(...)` | responde con un código | |
| `res.sendFile(ruta)` | entrega un archivo | |
| `res.redirect('/otra')` | redirige | |

### Middleware
Una función `(req, res, next)` que se ejecuta **antes** de la ruta final: revisa algo y llama `next()` para continuar o responde y corta.
```js
function requiereSesion(req, res, next) {
  if (!req.usuario) return res.status(401).json({ message: 'Inicia sesión' });
  next();
}
router.get('/mis-notas', requiereSesion, (req, res) => { ... });
```
**El orden importa.** Ejemplos del proyecto: `express.json()`, CORS, cabeceras de seguridad, sesión, CSRF, `express.static` (sirve `frontend/`), manejo de errores al final.
*Se ve en:* `express.server.js`, `middleware/sesion.js`.

### Errores y validación
- Nunca confiar en lo que llega del cliente: validar tipo, largo, rango, formato (`validar.js`: `texto()`, `entero()`, `fecha()`, `correo()`).
- Responder con el código correcto y un mensaje claro. Un manejador de errores global evita que el servidor se caiga.

**Práctica:** API de "libros" en memoria (arreglo) con las 5 rutas y pruebas con Postman.

---

## 5. Bases de datos MariaDB / MySQL (semanas 9–10)

**Conceptos**
- Modelo relacional: tabla, fila, columna. **Llave primaria** (`id`, única), **llave foránea** (relaciona tablas), `UNIQUE` (correo no repetido), `NOT NULL`, valores por defecto, índices.
- Tipos: `INT`, `VARCHAR(n)`, `TEXT`, `DATE`, `TIME`, `TIMESTAMP`, `TINYINT(1)` (booleano), `DECIMAL`.
- Relaciones: **1:N** (un grado tiene muchos grupos), **N:M** con **tabla puente** (grados ↔ materias: `grado_materias`).
- `ON DELETE CASCADE` / `SET NULL` / restricción: qué pasa con los hijos al borrar el padre (ver `ESQUEMA.md`).
- Dibujar el **diagrama entidad-relación** antes de crear tablas. *Se ve en:* `backend/database/ESQUEMA.md`.

**SQL esencial**
```sql
CREATE TABLE notas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);
INSERT INTO notas (usuario_id, titulo) VALUES (1, 'Repasar');
SELECT id, titulo FROM notas WHERE usuario_id = 1 ORDER BY creado_en DESC LIMIT 20;
UPDATE notas SET titulo = 'Repasar mate' WHERE id = 5 AND usuario_id = 1;
DELETE FROM notas WHERE id = 5 AND usuario_id = 1;
-- JOIN: unir tablas
SELECT m.nombre, g.nombre AS grado FROM grado_materias gm
  JOIN materias m ON m.id = gm.materia_id JOIN grados g ON g.id = gm.grado_id;
-- Agregaciones
SELECT grado_id, COUNT(*) AS estudiantes FROM usuarios GROUP BY grado_id;
```
Enseñar también: `LIKE`, `IN`, `BETWEEN`, `AVG/SUM/MIN/MAX`, `HAVING`, subconsultas, `LEFT JOIN`.

**Desde Node con `mysql2`**
```js
import mysql from 'mysql2/promise';
export const db = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionLimit: 10 });

const [filas] = await db.query('SELECT * FROM notas WHERE usuario_id = ?', [req.usuario.id]);   // SELECT → arreglo
const [r] = await db.query('INSERT INTO notas (usuario_id, titulo) VALUES (?, ?)', [id, titulo]); // r.insertId
const [r2] = await db.query('DELETE FROM notas WHERE id = ? AND usuario_id = ?', [id, uid]);      // r2.affectedRows
```
**Regla de oro:** **consultas preparadas** (los `?`). Nunca concatenar texto del usuario en el SQL → evita **inyección SQL**.

**Migraciones:** cada cambio de la base va en un archivo numerado con su "deshacer" (`-- @@UP` / `-- @@DOWN`). *Se ve en:* `backend/database/migraciones/` y `npm run migrar`.

**Práctica:** diseñar y crear la base de un blog (usuarios, entradas, comentarios) con datos de prueba.

---

## 6. El CRUD completo (semana 11)

CRUD = **C**reate, **R**ead, **U**pdate, **D**elete. Es el 80 % de cualquier aplicación. Enseña el mismo patrón en backend y frontend.

### Backend (modelo: `routes/api/notas.js` y `horario.js`)
```js
router.get('/', async (req, res) => {
  const [filas] = await db.query('SELECT id, titulo FROM notas WHERE usuario_id = ? ORDER BY id DESC', [req.usuario.id]);
  res.json({ items: filas });
});
router.post('/', async (req, res) => {
  const titulo = texto(req.body.titulo, 'El título', { max: 150 });          // valida
  const [r] = await db.query('INSERT INTO notas (usuario_id, titulo) VALUES (?, ?)', [req.usuario.id, titulo]);
  res.status(201).json({ id: r.insertId });
});
router.put('/:id', async (req, res) => {
  const [r] = await db.query('UPDATE notas SET titulo = ? WHERE id = ? AND usuario_id = ?', [req.body.titulo, req.params.id, req.usuario.id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'La nota no existe.' });
  res.json({ ok: true });
});
router.delete('/:id', async (req, res) => { /* DELETE ... WHERE id = ? AND usuario_id = ? */ });
```
Claves para enseñar: **siempre filtrar por el usuario dueño** (`AND usuario_id = ?`) para que nadie toque datos ajenos; devolver `404` si no se afectó ninguna fila.

### Frontend (modelo: `autoguardado.js`, `vistas/personal.js`)
```js
// listar
const { items } = await api.get('/notas');
lista.replaceChildren(...items.map((n) => h('li', null, n.titulo)));
// crear
await api.post('/notas', { titulo });
// editar / eliminar
await api.put(`/notas/${id}`, { titulo });
await api.del(`/notas/${id}`);
```
Variantes que conviene mostrar: formulario con botón "Guardar" vs **guardado automático mientras se escribe** (con retardo), confirmación antes de eliminar, mensajes de éxito y error.

**Práctica:** CRUD de "contactos" completo (tabla, API, pantalla).

---

## 7. Autenticación, roles y seguridad (semanas 12–13)

### Registro e inicio de sesión
1. **Nunca guardar contraseñas en texto.** Usar **bcrypt**:
   ```js
   import bcrypt from 'bcrypt';
   const hash = await bcrypt.hash(clave, 12);            // al registrar
   const ok = await bcrypt.compare(clave, hash);         // al iniciar sesión
   ```
2. **Sesión**: al iniciar sesión el servidor crea un token aleatorio, guarda su *hash* en la base y lo envía en una **cookie**:
   ```js
   const token = crypto.randomBytes(32).toString('hex');
   res.cookie('sesion', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 3600 * 1000 });
   ```
   - `httpOnly`: JavaScript del navegador no la puede leer (protege del robo por XSS).
   - `sameSite` + token **CSRF**: protegen contra peticiones falsas desde otros sitios.
   - `secure`: solo viaja por HTTPS (obligatorio en producción).
   - Alternativa que deben conocer: **JWT** (token firmado). Explicar ventajas y riesgos frente a las sesiones de servidor.
3. **Roles y permisos**: un middleware `requiereRol('admin')` y, dentro de cada ruta, comprobar que el recurso pertenece al usuario.
4. **Límite de intentos** de login y mensajes que no revelan si el correo existe.

### Lista de seguridad básica (OWASP, versión escolar)
- Inyección SQL → consultas preparadas. XSS → `textContent`, nunca `innerHTML` con datos de usuarios.
- CSRF → token. Contraseñas → bcrypt. Secretos → `.env`. HTTPS en producción.
- Validar **siempre en el servidor** (la validación del navegador se puede saltar).
- Subidas de archivos → ver sección 8. Cabeceras de seguridad (CSP).
- **Datos personales de menores:** en Colombia aplica la Ley 1581 de 2012 (Habeas Data): pedir autorización, recoger solo lo necesario, no enviar datos innecesarios a servicios externos (por ejemplo, a la IA).

*Se ve en:* `routes/api/auth.js`, `middleware/sesion.js`, `middleware/seguridad.js`, `servicios/permisos.js`.

---

## 8. Subir y mostrar archivos (semana 14)

### Cómo funciona
El navegador envía el archivo en un formulario `multipart/form-data`. El servidor necesita una librería para leerlo. EduCal usa `express-fileupload`; lo más común en cursos es **multer**:

```js
// npm i multer
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';

const almacen = multer.diskStorage({
  destination: 'uploads/avatares',
  filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
});
const subir = multer({
  storage: almacen,
  limits: { fileSize: 5 * 1024 * 1024 },                         // máximo 5 MB
  fileFilter: (req, file, cb) => cb(null, ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.mimetype)),
});

router.post('/perfil/foto', requiereSesion, subir.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Sube una imagen válida.' });
  await db.query('UPDATE usuarios SET foto = ? WHERE id = ?', [req.file.filename, req.usuario.id]);
  res.json({ ok: true });
});
```
`subir.single('foto')` es un middleware: lee el archivo del campo `foto` y lo deja en `req.file`.

### Frontend
```html
<input type="file" id="foto" accept="image/*">
```
```js
const datos = new FormData();
datos.append('foto', document.querySelector('#foto').files[0]);
await fetch('/api/perfil/foto', { method: 'POST', body: datos });   // NO poner Content-Type: lo pone el navegador
```

### Mostrarlo
- Pública: `<img src="/uploads/avatares/abc123.png">` (si la carpeta se sirve con `express.static`).
- **Privada (mejor, como EduCal):** guardar fuera de la carpeta pública y servirla por una ruta que revisa permisos:
  ```js
  router.get('/foto/:id', requiereSesion, async (req, res) => { /* comprobar permiso */ res.sendFile(rutaAbsoluta); });
  ```
  ```html
  <img src="/api/auth/foto/7" alt="Foto de perfil">
  ```

### Seguridad al subir (enseñar como lista de chequeo)
1. Límite de tamaño. 2. Lista de extensiones permitidas. 3. **Comprobar el contenido real** (los primeros bytes del archivo: PNG `89 50 4E 47`, JPG `FF D8 FF`, GIF `GIF8…`), porque `mimetype` y el nombre los envía el cliente y se pueden falsificar.
4. Renombrar con un nombre aleatorio. 5. Guardar fuera de la carpeta pública. 6. SVG puede contener scripts: servirlo con `Content-Security-Policy: sandbox`.
*Se ve en:* `servicios/fotos.js`.

---

## 9. Correos electrónicos con Nodemailer (semana 14)

**Conceptos:** SMTP (el protocolo para enviar correo), servidor SMTP (Gmail, Outlook, o un servicio como Brevo/SendGrid/Resend), puerto 587 (STARTTLS) o 465 (SSL).

```js
// npm i nodemailer
import nodemailer from 'nodemailer';
const transporte = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                       // smtp.gmail.com
  port: Number(process.env.SMTP_PORT),               // 587
  secure: process.env.SMTP_SEGURO === 'true',        // true solo con 465
  auth: { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_CLAVE },
});
await transporte.sendMail({
  from: process.env.CORREO_REMITENTE,
  to: 'estudiante@correo.com',
  subject: 'Tienes una nueva tarea',
  text: 'Entra a EduCal para verla.',
  html: '<p>Entra a <b>EduCal</b> para verla.</p>',
});
```
**Variables en `.env`:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SEGURO`, `SMTP_USUARIO`, `SMTP_CLAVE`, `CORREO_REMITENTE`.

**Gmail:** activar la **verificación en 2 pasos** y crear una **contraseña de aplicación** (la clave normal no funciona). Es solo para pruebas; para uso real conviene un servicio de correo transaccional.

**Buenas prácticas:** probar con un script aparte (`npm run probar-correo`); no enviar el correo dentro de la petición del usuario (que no espere): guardarlo en una **cola** (tabla) y enviarlo con un proceso periódico con **reintentos**; no enviar si el usuario lo desactivó.
**Tareas programadas:** `setInterval` o la librería `node-cron`.
*Se ve en:* `servicios/correo.js`, `servicios/notificaciones.js`, `scripts/probar-correo.mjs`.

---

## 10. Iniciar sesión / registrarse con Google (semana 15) — *no está en EduCal*

**Concepto:** **OAuth 2.0 / OpenID Connect**. Google comprueba quién es la persona y le dice a tu aplicación: "este es su correo, y yo ya lo verifiqué". Tu aplicación **nunca ve la contraseña de Google**.

**Paso 1 — Google Cloud Console** (console.cloud.google.com)
1. Crear un proyecto. 2. *APIs y servicios → Pantalla de consentimiento OAuth* (nombre de la app, correo de soporte).
3. *Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web*.
4. En **Orígenes de JavaScript autorizados** poner `http://localhost:3000` (y, al desplegar, `https://tudominio.com`).
5. Copiar el **Client ID** a `.env`: `GOOGLE_CLIENT_ID=...` (el Client ID no es secreto; el *Client Secret* sí, y este flujo no lo necesita).

**Paso 2 — Frontend (botón de Google Identity Services)**
```html
<script src="https://accounts.google.com/gsi/client" async></script>
<div id="g_id_onload" data-client_id="TU_CLIENT_ID" data-callback="alIniciarConGoogle"></div>
<div class="g_id_signin" data-type="standard"></div>
<script>
  async function alIniciarConGoogle(respuesta) {
    // respuesta.credential es un "ID token" (JWT) firmado por Google
    await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: respuesta.credential }) });
    location.href = '/pages/app.html';
  }
</script>
```
> En EduCal la política de seguridad (CSP) solo permite scripts propios: habría que **autorizar los dominios de Google** (`accounts.google.com`) en `script-src`, `frame-src`, `connect-src` y `style-src`. Es una buena lección de por qué existe la CSP.

**Paso 3 — Backend: verificar el token (nunca confiar en lo que envía el navegador)**
```js
// npm i google-auth-library
import { OAuth2Client } from 'google-auth-library';
const cliente = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/google', async (req, res) => {
  const ticket = await cliente.verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID });
  const g = ticket.getPayload();                       // { email, email_verified, name, picture, sub }
  if (!g.email_verified) return res.status(401).json({ message: 'Correo no verificado.' });

  let [[usuario]] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [g.email]);
  if (!usuario) {                                      // registro automático con Google
    const [r] = await db.query('INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash) VALUES (?, ?, ?, ?)',
      [ROL_ESTUDIANTE, g.name, g.email, 'GOOGLE']);   // sin contraseña propia
    usuario = { id: r.insertId };
  }
  await crearSesion(res, usuario.id);                  // misma sesión que el login normal
  res.json({ ok: true });
});
```
Decisiones que hay que discutir con ellos: qué rol recibe quien se registra con Google (nunca administrador), qué pasa si el correo ya existía con contraseña (vincular cuentas), y si se aceptan solo correos institucionales (`g.hd === 'colegio.edu.co'`).
**Alternativa:** `passport` + `passport-google-oauth20` (flujo con redirecciones, más código pero más didáctico para entender OAuth).
**Importante en producción:** exige HTTPS y el dominio registrado en la consola. Para uso con muchos usuarios Google puede pedir verificar la aplicación.

---

## 11. Inteligencia artificial: Grok, Gemini u otras (semana 15)

### Conceptos
API, **API key** (secreto, de pago o con cuota gratuita), **modelo**, **prompt** (instrucción), mensajes por rol (`system` define el comportamiento, `user` pregunta, `assistant` respuesta), `temperature` (creatividad), **tokens** (lo que se cobra y limita), límites por minuto/día.

### Reglas que deben aprender
1. **La clave vive solo en el servidor** (`.env`). Nunca en el JavaScript del navegador ni en GitHub.
2. El navegador llama a **tu** servidor; tu servidor llama a la IA.
3. Limitar consultas por usuario (el proyecto usa `IA_LIMITE_POR_HORA`) para no gastar el saldo.
4. **Privacidad:** enviar solo lo necesario, sin datos de otras personas.
5. La IA se equivoca: mostrar sus respuestas como **texto** (no HTML), pedirle JSON y **validarlo** antes de usarlo, y que solo *sugiera* (la persona decide).

### Grok (xAI) y cualquier servicio "compatible con OpenAI"
```js
const r = await fetch(`${process.env.IA_BASE_URL}/chat/completions`, {      // IA_BASE_URL=https://api.x.ai/v1
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.IA_API_KEY}` },
  body: JSON.stringify({
    model: process.env.IA_MODELO,
    temperature: 0.4,
    messages: [
      { role: 'system', content: 'Eres un tutor de estudio para estudiantes de colegio. Responde en español, breve y claro.' },
      { role: 'user', content: pregunta },
    ],
  }),
});
const datos = await r.json();
const respuesta = datos.choices[0].message.content;
```
*Se ve en:* `servicios/ia.js` y `routes/api/ia.js`; configuración guiada con `npm run configurar-ia`.

### Gemini (Google)
- Se obtiene la clave en **Google AI Studio** (aistudio.google.com).
- Opción A: su API propia (`generateContent`), con el cuerpo `{ contents: [{ parts: [{ text: pregunta }] }] }` y la respuesta en `candidates[0].content.parts[0].text`.
- Opción B: Google ofrece un modo **compatible con OpenAI**; si lo usan, el mismo código de arriba sirve cambiando `IA_BASE_URL`, la clave y el modelo. Confirma la dirección exacta y los nombres de modelo en la documentación oficial del día.
- Ventaja didáctica de diseñar con `IA_BASE_URL` + `IA_MODELO` en el `.env`: **cambiar de proveedor sin tocar el código**.

### Ideas de ejercicios
Chat con historial; "explícame este tema"; generar un plan de estudio en JSON; resumir un texto; corregir con rúbrica. Probar sin gastar usando un **servidor falso** que devuelve respuestas fijas (así se hacen las pruebas de EduCal en `tests/`).

---

## 12. Pruebas, Git y calidad (transversal)

- **Git/GitHub:** `init`, `add`, `commit`, `branch`, `merge`, `push`, `pull`, `.gitignore` (`node_modules`, `.env`, `uploads/`). Trabajo en parejas con ramas y *pull requests*.
- **Pruebas automáticas** con `node:test` y `assert`: probar que un usuario no pueda ver datos de otro (403), que un campo vacío dé 400, que un CRUD completo funcione. *Se ve en:* `backend/tests/` (`npm test`).
- **Depurar:** `console.log`, el depurador de VS Code, la pestaña Network y los mensajes de error del servidor.
- **Organización:** una responsabilidad por archivo (rutas / servicios / utilidades), nombres claros, comentarios que expliquen el **porqué**.
- **Documentar:** un `README` con cómo instalar, configurar el `.env` y ejecutar.

---

## 13. Desplegar: base de datos, página web y dominio (semana 16)

EduCal necesita **Node.js + una base de datos MySQL/MariaDB**, así que no sirven los hostings solo estáticos (GitHub Pages, Netlify estático).

### Antes de subir (lista de chequeo)
- [ ] Código en GitHub (sin `.env`, sin `node_modules`). [ ] `NODE_ENV=production`.
- [ ] El servidor lee el puerto de `process.env.PORT`. [ ] Cookies `secure` (HTTPS). [ ] Contraseña propia para la base de datos (no `root` vacío).
- [ ] Si hay proxy/balanceador, configurar `app.set('trust proxy', 1)` para que las cookies seguras y la IP funcionen.
- [ ] Las migraciones se pueden correr en la base nueva (`npm run migrar`). [ ] Un usuario administrador inicial (`npm run crear-usuario`).
- [ ] Carpeta de archivos subidos: en muchas plataformas el disco es **temporal**; usar un disco persistente o un almacenamiento externo (S3/Cloudinary).

### Ruta A — plataforma gestionada (la más fácil para estudiantes)
1. **Base de datos MySQL/MariaDB en la nube:** plataformas como Railway, Aiven, TiDB Cloud o Clever Cloud ofrecen MySQL gestionado (los planes gratuitos cambian: revísalos). Crear la base y copiar host, puerto, usuario, contraseña y nombre.
2. **Aplicación Node:** Render, Railway o Fly.io. Conectar el repositorio de GitHub, comando de instalación `npm install`, comando de inicio `npm start`, y cargar las **variables de entorno** (las del `.env`) en el panel.
3. Correr las migraciones contra esa base (desde tu computador con las variables de la nube, o desde la consola de la plataforma).
4. La plataforma entrega una dirección como `https://miapp.onrender.com` con **HTTPS automático**.

### Ruta B — servidor propio (VPS) — más didáctica, más trabajo
Alquilar un VPS (DigitalOcean, Hetzner, Contabo…), instalar Node y MariaDB, subir el código con Git, usar **PM2** para mantener la app encendida, **Nginx** como proxy inverso (puerto 80/443 → 3000) y **Certbot** (Let's Encrypt) para HTTPS gratis. Incluir un firewall (`ufw`) y copias de seguridad.

### Dominio propio
1. Comprar el dominio en un registrador (Namecheap, GoDaddy, Cloudflare Registrar, Hostinger…). Un `.com` cuesta del orden de 10–15 USD al año; los `.co` y `.com.co` varían — compara precios.
2. En el panel de **DNS** del dominio crear los registros: un **`A`** apuntando a la IP del servidor (VPS) o un **`CNAME`** hacia la dirección que da la plataforma (Render/Railway).
3. En la plataforma, **añadir el dominio personalizado**; ella emite el certificado HTTPS.
4. Esperar la **propagación DNS** (minutos a horas). Probar con `https://tudominio.com`.
5. Actualizar: `URL_APP` en el `.env`, los orígenes autorizados de Google y la lista de CORS.

### Después de publicar
Copias de seguridad de la base (`mysqldump`), monitoreo de errores (logs de la plataforma), actualizar dependencias, y **rotar las claves** si alguna se filtra.

---

## 14. Plan semanal sugerido (16 semanas)

| Semana | Tema | Entregable |
|---|---|---|
| 1 | Web, HTTP, HTML | Página con formulario |
| 2 | CSS, responsive | Página responsive con la paleta del proyecto |
| 3 | JS: variables, condicionales, bucles | Ejercicios (calculadora de notas) |
| 4 | JS: funciones, arreglos, objetos | Lista de tareas en memoria |
| 5 | JS: DOM, eventos, async/await, fetch | Lista de tareas con `localStorage` y consumo de una API pública |
| 6 | Node, npm, módulos, `.env` | Script que lee variables de entorno |
| 7 | Express: rutas, `req`/`res` | API de libros en memoria |
| 8 | Middleware, validación, errores | API con validación y manejo de errores |
| 9 | SQL y diseño de base de datos | Diagrama ER + script SQL |
| 10 | `mysql2`, consultas preparadas, migraciones | API conectada a la base |
| 11 | **CRUD** completo (back + front) | CRUD de contactos |
| 12 | Registro, login, bcrypt, sesiones | Registro e inicio de sesión funcionando |
| 13 | Roles, permisos, seguridad | Rutas protegidas por rol; pruebas de seguridad |
| 14 | Subida de archivos y correos | Foto de perfil + correo de bienvenida |
| 15 | Google login e IA | Botón de Google + chat con IA |
| 16 | Despliegue y dominio; exposición | Aplicación publicada y presentada |

**Proyecto final (equipos de 2–3):** una aplicación propia (biblioteca, tienda escolar, reservas de laboratorio, diario…) con: registro/login, mínimo 3 tablas relacionadas, un CRUD, un rol de administrador, una subida de archivos, una integración (correo **o** IA), pruebas básicas y despliegue.

### Rúbrica orientativa (100 puntos)
| Criterio | Puntos |
|---|---|
| Funciona (CRUD, login, roles) | 25 |
| Base de datos bien diseñada (llaves, relaciones, migraciones) | 15 |
| Seguridad (hash, consultas preparadas, validación, `.env`) | 20 |
| Código organizado y legible; Git con commits claros | 15 |
| Interfaz clara y responsive | 10 |
| Pruebas y documentación (README) | 10 |
| Despliegue y presentación | 5 |

---

## 15. Errores comunes (para anticiparlos en clase)

- Subir el `.env` o la clave de la IA a GitHub → **revocar la clave de inmediato** y crear otra.
- Olvidar `await` y trabajar con una promesa en lugar del dato.
- Concatenar texto en el SQL (inyección) en vez de usar `?`.
- Poner `Content-Type: multipart/form-data` a mano al subir archivos (rompe el límite del formulario).
- Confiar en la validación del navegador.
- No filtrar por el usuario dueño en `UPDATE` / `DELETE` (cualquiera puede editar datos ajenos cambiando el `id`).
- Confundir `==` con `===`, o `for...in` con `for...of`.
- `nodemon` no reinicia al cambiar el `.env`: hay que detener y volver a iniciar.
- Probar en `localhost:5500` (Live Server) en vez del puerto del servidor: la API no existe ahí.
- Navegador mostrando una versión vieja de los archivos: recarga forzada (Ctrl+Shift+R).

---

## 16. Glosario rápido

**Endpoint:** ruta + método que el servidor atiende. · **Router:** agrupador de rutas. · **Middleware:** función intermedia `(req, res, next)`. · **Pool:** conjunto de conexiones reutilizables a la base. ·
**Migración:** cambio de la base versionado. · **Hash:** resumen irreversible de un texto (contraseñas). · **Sesión:** forma de recordar quién inició sesión. · **Cookie `HttpOnly`:** cookie que el JavaScript no puede leer. ·
**CSRF:** ataque que hace que tu navegador envíe peticiones sin que lo notes. · **XSS:** inyectar código en una página. · **CSP:** política que dice qué scripts puede cargar la página. ·
**CORS:** permiso para que una página de otro origen llame a tu API. · **OAuth:** protocolo para "iniciar sesión con…". · **Token:** texto aleatorio o firmado que identifica algo. ·
**Variable de entorno:** configuración fuera del código. · **API key:** clave secreta para usar un servicio. · **DNS:** el "directorio telefónico" que traduce dominios a IP. · **HTTPS:** HTTP cifrado.
