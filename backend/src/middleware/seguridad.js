// Cabeceras de seguridad y límite de intentos de inicio de sesión
export function cabecerasSeguras(req, res, next) {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'same-origin',
        'Content-Security-Policy':
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
            "font-src 'self' https://cdnjs.cloudflare.com; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    next();
}

const intentos = new Map();
const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO = 8;

function limpiar(clave) {
    const e = intentos.get(clave);
    if (e && Date.now() - e.desde > VENTANA_MS) intentos.delete(clave);
}

export function loginBloqueado(clave) {
    limpiar(clave);
    return (intentos.get(clave)?.n ?? 0) >= MAXIMO;
}

export function registrarFallo(clave) {
    limpiar(clave);
    const e = intentos.get(clave) ?? { n: 0, desde: Date.now() };
    e.n++;
    intentos.set(clave, e);
}

export function limpiarFallos(clave) {
    intentos.delete(clave);
}
