import crypto from 'node:crypto';
import { soloEstudiantes } from '../config/acceso.js';
import { connection } from '../config/mysql/dbmysql.js';
import { ErrorHttp } from '../utils/validar.js';

const COOKIE = 'sid';
const HORAS_SESION = 8;
const produccion = process.env.NODE_ENV === 'production';

const sha256 = (t) => crypto.createHash('sha256').update(t).digest('hex');

function leerCookie(req, nombre) {
    const cabecera = req.headers.cookie;
    if (!cabecera) return null;
    for (const par of cabecera.split(';')) {
        const [k, ...v] = par.trim().split('=');
        if (k === nombre) return decodeURIComponent(v.join('='));
    }
    return null;
}

// Carga req.usuario a partir de la cookie de sesión (si es válida y el usuario sigue activo)
export async function cargarSesion(req, res, next) {
    const token = leerCookie(req, COOKIE);
    if (token && /^[0-9a-f]{64}$/.test(token)) {
        const [filas] = await connection.query(
            `SELECT s.id AS sesion_id, s.csrf, u.id, u.nombre, u.correo, u.rol_id, (u.foto IS NOT NULL) AS tiene_foto, u.grado_id, r.nombre AS rol
             FROM sesiones s
             JOIN usuarios u ON u.id = s.usuario_id AND u.activo = 1
             JOIN roles r ON r.id = u.rol_id
             WHERE s.token_hash = ? AND s.expira_en > NOW()`,
            [sha256(token)]
        );
        if (filas[0] && !(soloEstudiantes() && filas[0].rol !== 'estudiante')) {
            const { sesion_id, csrf, ...usuario } = filas[0];
            req.usuario = usuario;
            req.csrf = csrf;
            req.sesionId = sesion_id;
        }
    }
    next();
}

export async function crearSesion(res, usuarioId) {
    const token = crypto.randomBytes(32).toString('hex');
    const csrf = crypto.randomBytes(24).toString('hex');
    await connection.query(
        `INSERT INTO sesiones (token_hash, usuario_id, csrf, expira_en)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ${HORAS_SESION} HOUR))`,
        [sha256(token), usuarioId, csrf]
    );
    // Limpieza de sesiones vencidas
    await connection.query('DELETE FROM sesiones WHERE expira_en < NOW()');
    res.cookie(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: produccion,
        maxAge: HORAS_SESION * 3600 * 1000,
        path: '/',
    });
    return csrf;
}

export async function cerrarSesion(req, res) {
    if (req.sesionId) await connection.query('DELETE FROM sesiones WHERE id = ?', [req.sesionId]);
    res.clearCookie(COOKIE, { path: '/' });
}

// Cierra todas las sesiones de un usuario (al desactivarlo o cambiar su contraseña)
export function cerrarSesionesDe(usuarioId, exceptoId = null) {
    return connection.query('DELETE FROM sesiones WHERE usuario_id = ? AND id <> ?', [usuarioId, exceptoId ?? 0]);
}

export function requiereSesion(req, res, next) {
    if (!req.usuario) throw new ErrorHttp(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
    next();
}

export const requiereRol = (...roles) => (req, res, next) => {
    if (!req.usuario) throw new ErrorHttp(401, 'Tu sesión expiró. Inicia sesión de nuevo.');
    if (!roles.includes(req.usuario.rol)) throw new ErrorHttp(403, 'No tienes permiso para realizar esta acción.');
    next();
};

// Protección CSRF: toda petición que modifica datos debe traer el token de su sesión
export function verificarCsrf(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.usuario) return next();
    const enviado = Buffer.from(String(req.headers['x-csrf-token'] ?? ''));
    const esperado = Buffer.from(req.csrf);
    if (enviado.length !== esperado.length || !crypto.timingSafeEqual(enviado, esperado)) {
        throw new ErrorHttp(403, 'Solicitud no autorizada (token de seguridad inválido). Recarga la página.');
    }
    next();
}
