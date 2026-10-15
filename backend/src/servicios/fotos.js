// Foto de perfil: se guarda fuera de la carpeta pública y solo la ven las personas autorizadas.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { connection } from '../config/mysql/dbmysql.js';
import { carpetaUploads, rutaAbsoluta } from '../utils/archivos.js';
import { ErrorHttp } from '../utils/validar.js';

export const MAX_FOTO = 5 * 1024 * 1024;
const jpeg = (b) => b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
const gif = (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1'));
const avif = (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' && ['avif', 'avis'].includes(b.subarray(8, 12).toString('latin1'));
const svg = (b) => /<svg[\s>]/i.test(b.subarray(0, 2048).toString('utf8'));
// Imágenes aceptadas (se comprueba el contenido real del archivo, no solo su extensión)
const TIPOS = {
    '.png': (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
    '.jpg': jpeg, '.jpeg': jpeg, '.jpe': jpeg, '.jfif': jpeg, '.pjpeg': jpeg, '.pjp': jpeg,
    '.gif': gif,
    '.webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
    '.bmp': (b) => b.subarray(0, 2).toString('latin1') === 'BM',
    '.avif': avif,
    '.ico': (b) => b.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])),
    '.svg': svg,
};
const MIME = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.jpe': 'image/jpeg', '.jfif': 'image/jpeg', '.pjpeg': 'image/jpeg', '.pjp': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};
export const EXTENSIONES_FOTO = Object.keys(TIPOS);

export async function guardarFoto(usuarioId, archivo) {
    if (!archivo || Array.isArray(archivo)) throw new ErrorHttp(400, 'Elige una sola imagen.');
    if (archivo.truncated || archivo.size > MAX_FOTO) throw new ErrorHttp(400, 'La imagen no puede superar los 5 MB.');
    const ext = path.extname(archivo.name).toLowerCase();
    if (!TIPOS[ext]) throw new ErrorHttp(400, 'Usa una imagen (PNG, JPG, JFIF, GIF, WEBP, BMP, AVIF, ICO o SVG).');
    if (!TIPOS[ext](archivo.data)) throw new ErrorHttp(400, 'El archivo no es una imagen válida.');
    const nombre = `${usuarioId}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    await fs.promises.mkdir(path.join(carpetaUploads, 'avatares'), { recursive: true });
    await fs.promises.writeFile(path.join(carpetaUploads, 'avatares', nombre), archivo.data, { mode: 0o640 });
    await quitarFoto(usuarioId);
    await connection.query('UPDATE usuarios SET foto = ? WHERE id = ?', [`avatares/${nombre}`, usuarioId]);
}

export async function quitarFoto(usuarioId) {
    const [[u]] = await connection.query('SELECT foto FROM usuarios WHERE id = ?', [usuarioId]);
    if (u?.foto) {
        try { await fs.promises.unlink(rutaAbsoluta(u.foto)); } catch { /* ya no estaba */ }
        await connection.query('UPDATE usuarios SET foto = NULL WHERE id = ?', [usuarioId]);
    }
}

// ¿Puede "quien" ver la foto de "objetivoId"? Una misma persona, el administrador, y docente ↔ estudiante de sus grupos.
export async function puedeVerFoto(quien, objetivoId) {
    if (quien.id === objetivoId || quien.rol === 'admin') return true;
    const [[r]] = await connection.query(
        `SELECT 1 AS ok FROM asignaciones a JOIN matriculas mt ON mt.grupo_id = a.grupo_id
         WHERE (a.profesor_id = ? AND mt.estudiante_id = ?) OR (a.profesor_id = ? AND mt.estudiante_id = ?) LIMIT 1`, [quien.id, objetivoId, objetivoId, quien.id]);
    return Boolean(r);
}

export async function datosFoto(usuarioId) {
    const [[u]] = await connection.query('SELECT foto FROM usuarios WHERE id = ?', [usuarioId]);
    if (!u?.foto) return null;
    const abs = rutaAbsoluta(u.foto);
    if (!fs.existsSync(abs)) return null;
    return { ruta: abs, tipo: MIME[path.extname(abs).toLowerCase()] ?? 'application/octet-stream' };
}
