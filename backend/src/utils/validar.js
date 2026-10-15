// Validaciones de datos que llegan del navegador. Todas lanzan ErrorHttp 400 con un mensaje comprensible.
export class ErrorHttp extends Error {
    constructor(estado, message) {
        super(message);
        this.estado = estado;
    }
}

export const TIPOS_TAREA = ['tarea', 'trabajo', 'examen', 'proyecto'];
export const PRIORIDADES = ['baja', 'media', 'alta'];
export const COLORES_NOTA = ['crema', 'rosa', 'durazno', 'menta', 'cielo', 'lavanda'];

export function texto(valor, nombre, { min = 1, max = 150, requerido = true } = {}) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        if (requerido) throw new ErrorHttp(400, `${nombre} es obligatorio.`);
        return null;
    }
    const limpio = String(valor).trim();
    if (limpio.length < min) throw new ErrorHttp(400, `${nombre} debe tener al menos ${min} caracteres.`);
    if (limpio.length > max) throw new ErrorHttp(400, `${nombre} no puede superar ${max} caracteres.`);
    return limpio;
}

export function entero(valor, nombre, { requerido = true, min = 1 } = {}) {
    if (valor === undefined || valor === null || valor === '') {
        if (requerido) throw new ErrorHttp(400, `${nombre} es obligatorio.`);
        return null;
    }
    const n = Number(valor);
    if (!Number.isInteger(n) || n < min) throw new ErrorHttp(400, `${nombre} no es válido.`);
    return n;
}

export function fecha(valor, nombre, { requerido = true } = {}) {
    if (valor === undefined || valor === null || valor === '') {
        if (requerido) throw new ErrorHttp(400, `${nombre} es obligatoria.`);
        return null;
    }
    const v = String(valor);
    const d = new Date(v + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
        throw new ErrorHttp(400, `${nombre} no es una fecha válida.`);
    }
    return v;
}

export function hora(valor, nombre, { requerido = true, porDefecto = null } = {}) {
    if (valor === undefined || valor === null || valor === '') {
        if (porDefecto) return porDefecto;
        if (requerido) throw new ErrorHttp(400, `${nombre} es obligatoria.`);
        return null;
    }
    const m = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(valor));
    if (!m) throw new ErrorHttp(400, `${nombre} no es una hora válida (formato 24 h).`);
    return `${m[1]}:${m[2]}:${m[3] ?? '00'}`;
}

export function fechaHora(valor, nombre) {
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::\d{2})?$/.exec(String(valor ?? ''));
    if (!m) throw new ErrorHttp(400, `${nombre} no es una fecha y hora válida.`);
    return `${fecha(m[1], nombre)} ${hora(m[2], nombre)}`;
}

export function opcion(valor, nombre, permitidas, { requerido = true, porDefecto = null } = {}) {
    if (valor === undefined || valor === null || valor === '') {
        if (porDefecto !== null) return porDefecto;
        if (requerido) throw new ErrorHttp(400, `${nombre} es obligatorio.`);
        return null;
    }
    if (!permitidas.includes(valor)) throw new ErrorHttp(400, `${nombre} no es válido.`);
    return valor;
}

export function booleano(valor) {
    return valor === true || valor === 1 || valor === '1' || valor === 'true';
}

export const expresionCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function correo(valor) {
    const c = texto(valor, 'El correo', { max: 120 }).toLowerCase();
    if (!expresionCorreo.test(c)) throw new ErrorHttp(400, 'Ingresa un correo válido.');
    return c;
}

export function contrasena(valor) {
    if (typeof valor !== 'string' || valor.length < 8) {
        throw new ErrorHttp(400, 'La contraseña debe tener al menos 8 caracteres.');
    }
    if (valor.length > 72) throw new ErrorHttp(400, 'La contraseña no puede superar 72 caracteres.');
    return valor;
}

// Número de documento: letras, números, puntos o guiones (4 a 20 caracteres)
export function identificacion(valor, { requerido = false } = {}) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        if (requerido) throw new ErrorHttp(400, 'El número de identificación es obligatorio.');
        return null;
    }
    const v = String(valor).trim();
    if (!/^[0-9A-Za-z.\-]{4,20}$/.test(v)) throw new ErrorHttp(400, 'El número de identificación debe tener de 4 a 20 caracteres (números, letras, puntos o guiones).');
    return v;
}

// Fecha de nacimiento: debe ser pasada y dar una edad entre 3 y 100 años
export function fechaNacimiento(valor, { requerido = false } = {}) {
    const f = fecha(valor, 'La fecha de nacimiento', { requerido });
    if (!f) return null;
    const edad = (Date.now() - new Date(`${f}T00:00:00Z`).getTime()) / (365.25 * 86400000);
    if (edad < 3 || edad > 100) throw new ErrorHttp(400, 'La fecha de nacimiento no es válida (la edad debe estar entre 3 y 100 años).');
    return f;
}
