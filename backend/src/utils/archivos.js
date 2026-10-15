import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ErrorHttp } from './validar.js';

// Los archivos viven FUERA de la carpeta pública y solo se descargan por una ruta que comprueba permisos
export const carpetaUploads = fileURLToPath(new URL('../../uploads/', import.meta.url));

export const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONES = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.zip']);

// Firmas ("magic numbers") para comprobar que el contenido corresponde a la extensión
const FIRMAS = {
    '.pdf': [Buffer.from('%PDF')],
    '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
    '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
    '.jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
    '.zip': [Buffer.from('PK')],
    '.docx': [Buffer.from('PK')],
    '.xlsx': [Buffer.from('PK')],
    '.pptx': [Buffer.from('PK')],
    '.doc': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
    '.xls': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
    '.ppt': [Buffer.from([0xd0, 0xcf, 0x11, 0xe0])],
};

// Guarda un archivo subido con nombre aleatorio y devuelve { ruta, nombre }
export async function guardarArchivo(archivo, subcarpeta) {
    if (!archivo || Array.isArray(archivo)) throw new ErrorHttp(400, 'Envía un solo archivo.');
    if (archivo.truncated || archivo.size > MAX_BYTES) throw new ErrorHttp(400, 'El archivo supera el máximo de 5 MB.');
    const ext = path.extname(archivo.name).toLowerCase();
    if (!EXTENSIONES.has(ext)) {
        throw new ErrorHttp(400, `Tipo de archivo no permitido. Usa: ${[...EXTENSIONES].join(', ')}`);
    }
    const firmas = FIRMAS[ext];
    if (firmas && !firmas.some((f) => archivo.data.subarray(0, f.length).equals(f))) {
        throw new ErrorHttp(400, 'El contenido del archivo no corresponde a su extensión.');
    }
    const nombreOriginal = path.basename(archivo.name).replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 200);
    const nombre = crypto.randomBytes(16).toString('hex') + ext;
    const carpeta = path.join(carpetaUploads, subcarpeta);
    await fs.promises.mkdir(carpeta, { recursive: true });
    await fs.promises.writeFile(path.join(carpeta, nombre), archivo.data, { mode: 0o640 });
    return { ruta: `${subcarpeta}/${nombre}`, nombre: nombreOriginal };
}

export function rutaAbsoluta(ruta) {
    const abs = path.resolve(carpetaUploads, ruta);
    if (!abs.startsWith(path.resolve(carpetaUploads) + path.sep)) throw new ErrorHttp(400, 'Ruta de archivo inválida.');
    return abs;
}

export async function borrarArchivo(ruta) {
    if (!ruta) return;
    try {
        await fs.promises.unlink(rutaAbsoluta(ruta));
    } catch {
        // si ya no existe no pasa nada
    }
}
