import { Router } from 'express';
import fileUpload from 'express-fileupload';
import { connection } from '../../config/mysql/dbmysql.js';
import { hashear, verificar } from '../../servicios/contrasenas.js';
import { crearSesion, cerrarSesion, cerrarSesionesDe, requiereSesion } from '../../middleware/sesion.js';
import { loginBloqueado, registrarFallo, limpiarFallos } from '../../middleware/seguridad.js';
import { perfilCompleto, matricularEnGrado, gradoPorNumero, asegurarGrupo } from '../../servicios/estructura.js';
import { soloEstudiantes } from '../../config/acceso.js';
import { verificarCredencialGoogle, googleConfigurado } from '../../servicios/google.js';
import { guardarFoto, quitarFoto, puedeVerFoto, datosFoto, MAX_FOTO } from '../../servicios/fotos.js';
import {
    ErrorHttp, texto, entero, booleano, correo as validarCorreo, contrasena, identificacion, fechaNacimiento,
} from '../../utils/validar.js';

const router = Router();
const publico = (u) => ({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, foto: Boolean(u.tiene_foto), grado_id: u.grado_id ?? null });
const subida = fileUpload({ limits: { fileSize: MAX_FOTO }, abortOnLimit: false });

// Registro público: EduCal es para ESTUDIANTES, así que toda cuenta nueva es de estudiante (nunca docente ni administrador).
// (Con SOLO_ESTUDIANTES=false —solo en las pruebas— también se acepta "docente").
const ROLES_PUBLICOS = { estudiante: 'estudiante', docente: 'profesor', profesor: 'profesor' };
const MENSAJE_SOLO_ESTUDIANTES = 'EduCal es solo para estudiantes. Las cuentas de docente y administrador ya no existen.';
const idRol = async (nombre) => (await connection.query('SELECT id FROM roles WHERE nombre = ?', [nombre]))[0][0].id;

// Nombres y apellidos (o un solo "nombre" completo, como antes)
function nombreDeRegistro(b) {
    if (b.nombres !== undefined) {
        const nombres = texto(b.nombres, 'Los nombres', { min: 2, max: 60 });
        const apellidos = texto(b.apellidos, 'Los apellidos', { min: 2, max: 60 });
        return { nombre: `${nombres} ${apellidos}`.slice(0, 100), nombres, apellidos };
    }
    const nombre = texto(b.nombre, 'El nombre', { min: 2, max: 100 });
    return { nombre, nombres: nombre.slice(0, 60), apellidos: null };
}

const hayValor = (v) => v !== undefined && v !== null && String(v).trim() !== '';

// Grado y grupo opcionales al registrarse (se escriben como número: grado 11, grupo 1 → grupo 11-1)
async function matricularAlRegistrar(usuarioId, b) {
    if (!hayValor(b.grado_numero)) return;
    const grado = await gradoPorNumero(b.grado_numero);
    await matricularEnGrado(usuarioId, grado.id, hayValor(b.grupo_numero) ? await asegurarGrupo(grado.id, b.grupo_numero) : null);
}

router.post('/registro', async (req, res) => {
    const b = req.body ?? {};
    const nom = nombreDeRegistro(b);
    const correo = validarCorreo(b.correo);
    const password = contrasena(b.password);
    let rolNombre = 'estudiante';
    if (!soloEstudiantes()) {
        rolNombre = ROLES_PUBLICOS[String(b.rol ?? '').toLowerCase()];
        if (!rolNombre) throw new ErrorHttp(400, 'Elige si eres estudiante o docente.');
    } else if (b.rol && String(b.rol).toLowerCase() !== 'estudiante') {
        throw new ErrorHttp(400, MENSAJE_SOLO_ESTUDIANTES);
    }
    // Se valida el grado y el grupo ANTES de crear la cuenta
    if (hayValor(b.grado_numero)) {
        await gradoPorNumero(b.grado_numero);
        if (hayValor(b.grupo_numero)) entero(b.grupo_numero, 'El grupo', { min: 1 });
    }

    const [existe] = await connection.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existe.length) throw new ErrorHttp(409, 'Ese correo ya está registrado.');

    const [r] = await connection.query(
        'INSERT INTO usuarios (rol_id, nombre, nombres, apellidos, correo, contrasena_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [await idRol(rolNombre), nom.nombre, nom.nombres, nom.apellidos, correo, await hashear(password)]
    );
    if (rolNombre === 'estudiante') await matricularAlRegistrar(r.insertId, b);
    const [[fila]] = await connection.query('SELECT grado_id FROM usuarios WHERE id = ?', [r.insertId]);
    const usuario = { id: r.insertId, nombre: nom.nombre, correo, rol: rolNombre, tiene_foto: false, grado_id: fila?.grado_id ?? null };
    const csrf = await crearSesion(res, usuario.id);
    res.status(201).json({ usuario: publico(usuario), csrf });
});

// Datos públicos de configuración para las páginas de acceso (el Client ID de Google NO es un secreto)
router.get('/config', (req, res) => {
    res.json({ google_client_id: googleConfigurado() ? process.env.GOOGLE_CLIENT_ID.trim() : null, solo_estudiantes: soloEstudiantes() });
});

// Iniciar sesión o registrarse con Google: si el correo ya existe entra a esa cuenta; si no, crea una cuenta de estudiante
router.post('/google', async (req, res) => {
    const g = await verificarCredencialGoogle(req.body?.credential);
    if (!g?.email || g.email_verified === false) throw new ErrorHttp(401, 'Tu correo de Google no está verificado.');
    const correo = String(g.email).trim().toLowerCase();
    if (correo.length > 120) throw new ErrorHttp(400, 'El correo es demasiado largo.');

    const [filas] = await connection.query(
        `SELECT u.id, u.nombre, u.correo, u.grado_id, u.activo, (u.foto IS NOT NULL) AS tiene_foto, r.nombre AS rol
         FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.correo = ?`, [correo]);
    let u = filas[0];
    let nuevo = false;
    if (u) {
        if (!u.activo) throw new ErrorHttp(401, 'Tu cuenta está desactivada.');
        if (soloEstudiantes() && u.rol !== 'estudiante') throw new ErrorHttp(403, MENSAJE_SOLO_ESTUDIANTES);
    } else {
        const nombres = texto(g.given_name ?? g.name ?? correo.split('@')[0], 'El nombre', { min: 1, max: 60 });
        const apellidos = texto(g.family_name, 'Los apellidos', { max: 60, requerido: false });
        const nombre = `${nombres}${apellidos ? ` ${apellidos}` : ''}`.slice(0, 100);
        // 'GOOGLE' no es un hash válido: con esta cuenta solo se entra con Google
        const [r] = await connection.query(
            'INSERT INTO usuarios (rol_id, nombre, nombres, apellidos, correo, contrasena_hash) VALUES (?, ?, ?, ?, ?, ?)',
            [await idRol('estudiante'), nombre, nombres, apellidos, correo, 'GOOGLE']);
        u = { id: r.insertId, nombre, correo, rol: 'estudiante', grado_id: null, tiene_foto: false };
        nuevo = true;
    }
    const csrf = await crearSesion(res, u.id);
    res.status(nuevo ? 201 : 200).json({ usuario: publico(u), csrf, nuevo });
});

router.post('/login', async (req, res) => {
    const correo = String(req.body?.correo ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const clave = `${req.ip}|${correo}`;
    if (loginBloqueado(clave)) {
        throw new ErrorHttp(429, 'Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.');
    }

    const [filas] = await connection.query(
        `SELECT u.id, u.nombre, u.correo, u.contrasena_hash, u.grado_id, (u.foto IS NOT NULL) AS tiene_foto, r.nombre AS rol
         FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.correo = ? AND u.activo = 1`,
        [correo]
    );
    const u = filas[0];
    // Se verifica siempre contra algún hash para que el tiempo de respuesta no revele si el correo existe
    const { ok, actualizar } = await verificar(password, u?.contrasena_hash ?? '$2b$11$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
    if (!u || !ok) {
        registrarFallo(clave);
        throw new ErrorHttp(401, 'Correo o contraseña incorrectos.');
    }
    limpiarFallos(clave);
    if (soloEstudiantes() && u.rol !== 'estudiante') throw new ErrorHttp(403, MENSAJE_SOLO_ESTUDIANTES);
    if (actualizar) {
        await connection.query('UPDATE usuarios SET contrasena_hash = ? WHERE id = ?', [await hashear(password), u.id]);
    }
    const csrf = await crearSesion(res, u.id);
    res.json({ usuario: publico(u), csrf });
});

router.post('/logout', async (req, res) => {
    await cerrarSesion(req, res);
    res.json({ ok: true });
});

// El navegador la usa al abrir la aplicación para saber si hay sesión
router.get('/yo', requiereSesion, (req, res) => {
    res.json({ usuario: publico(req.usuario), csrf: req.csrf });
});

// Perfil propio completo (datos personales, grado y materias o, si es docente, sus grados y materias)
router.get('/perfil', requiereSesion, async (req, res) => {
    res.json({ perfil: await perfilCompleto(req.usuario.id) });
});

router.put('/perfil', requiereSesion, async (req, res) => {
    const b = req.body ?? {};
    const u = req.usuario;
    // Solo se cambia lo que se envía: omitir un campo lo conserva; enviarlo vacío lo borra
    const campos = ['nombre = ?'];
    let valores;
    if (b.nombres !== undefined) {
        const nombres = texto(b.nombres, 'Los nombres', { min: 2, max: 60 });
        const apellidos = texto(b.apellidos, 'Los apellidos', { min: 2, max: 60, requerido: u.rol !== 'admin' });
        campos.push('nombres = ?', 'apellidos = ?');
        valores = [`${nombres}${apellidos ? ` ${apellidos}` : ''}`.slice(0, 100), nombres, apellidos];
    } else valores = [texto(b.nombre, 'El nombre', { min: 2, max: 100 })];
    if (b.identificacion !== undefined) { campos.push('identificacion = ?'); valores.push(identificacion(b.identificacion)); }
    if (b.fecha_nacimiento !== undefined) { campos.push('fecha_nacimiento = ?'); valores.push(fechaNacimiento(b.fecha_nacimiento)); }
    if (b.notif_correo !== undefined) { campos.push('notif_correo = ?'); valores.push(booleano(b.notif_correo) ? 1 : 0); }
    // Se valida el grado ANTES de guardar nada, para no dejar el perfil a medias si se rechaza el cambio
    let gradoId = entero(b.grado_id, 'El grado', { requerido: false });
    if (hayValor(b.grado_numero)) gradoId = (await gradoPorNumero(b.grado_numero)).id;
    const hayGrupo = hayValor(b.grupo_numero);
    let cambiarGrado = false;
    if (u.rol === 'estudiante' && gradoId) {
        if (soloEstudiantes()) cambiarGrado = true; // el estudiante escribe y puede cambiar su grado y su grupo
        else {
            const [[mat]] = await connection.query('SELECT 1 AS ok FROM matriculas WHERE estudiante_id = ? LIMIT 1', [u.id]);
            if (mat && gradoId !== u.grado_id) throw new ErrorHttp(403, 'Solo un administrador puede cambiarte de grado.');
            cambiarGrado = !mat;
        }
    }
    try {
        await connection.query(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, [...valores, u.id]);
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') throw new ErrorHttp(409, 'Ese número de identificación ya está registrado.');
        throw e;
    }
    if (cambiarGrado) await matricularEnGrado(u.id, gradoId, hayGrupo ? await asegurarGrupo(gradoId, b.grupo_numero) : entero(b.grupo_id, 'El grupo', { requerido: false }));
    res.json({ perfil: await perfilCompleto(u.id) });
});
router.post('/perfil/foto', requiereSesion, subida, async (req, res) => {
    await guardarFoto(req.usuario.id, req.files?.foto);
    res.json({ ok: true });
});

router.delete('/perfil/foto', requiereSesion, async (req, res) => {
    await quitarFoto(req.usuario.id);
    res.json({ ok: true });
});

// Foto de una persona (solo ella, el administrador y su docente/estudiante relacionado)
router.get('/foto/:id', requiereSesion, async (req, res) => {
    const id = entero(req.params.id, 'El usuario');
    if (!(await puedeVerFoto(req.usuario, id))) throw new ErrorHttp(403, 'No tienes permiso para ver esa foto.');
    const foto = await datosFoto(id);
    if (!foto) throw new ErrorHttp(404, 'Esa persona no tiene foto.');
    // El CSP con sandbox impide que un SVG ejecute scripts aunque alguien abra la imagen directamente
    res.set({ 'Content-Type': foto.tipo, 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" });
    res.sendFile(foto.ruta);
});

router.put('/password', requiereSesion, async (req, res) => {
    const actual = String(req.body?.actual ?? '');
    const nueva = contrasena(req.body?.nueva);
    const [[u]] = await connection.query('SELECT contrasena_hash FROM usuarios WHERE id = ?', [req.usuario.id]);
    // Una cuenta creada con Google no tiene contraseña todavía: puede crear una sin escribir la "actual"
    const soloGoogle = u.contrasena_hash === 'GOOGLE';
    const { ok } = soloGoogle ? { ok: true } : await verificar(actual, u.contrasena_hash);
    if (!ok) throw new ErrorHttp(400, 'La contraseña actual no es correcta.');
    await connection.query('UPDATE usuarios SET contrasena_hash = ? WHERE id = ?', [await hashear(nueva), req.usuario.id]);
    await cerrarSesionesDe(req.usuario.id, req.sesionId);
    res.json({ ok: true });
});

export default router;
