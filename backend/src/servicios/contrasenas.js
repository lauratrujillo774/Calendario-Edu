import bcrypt from 'bcryptjs';
import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

// bcrypt ($2y$/$2b$) es compatible con password_hash()/password_verify() de PHP
export function hashear(password) {
    return bcrypt.hash(password, 11);
}

// Devuelve { ok, actualizar }: actualizar = true si el hash es de un formato viejo y conviene regenerarlo
export async function verificar(password, guardado) {
    if (!guardado) return { ok: false };
    if (/^\$2[aby]\$/.test(guardado)) {
        return { ok: await bcrypt.compare(password, guardado), actualizar: false };
    }
    // Formato anterior de esta app: "sal:hash" con scrypt
    const [sal, hash] = guardado.split(':');
    if (sal && hash && /^[0-9a-f]+$/i.test(hash)) {
        const clave = await scryptAsync(password, sal, 64);
        const esperado = Buffer.from(hash, 'hex');
        const ok = esperado.length === clave.length && timingSafeEqual(clave, esperado);
        return { ok, actualizar: ok };
    }
    // Marcadores como REEMPLAZAR_CON_HASH: nadie puede entrar hasta que se les asigne contraseña
    return { ok: false };
}
