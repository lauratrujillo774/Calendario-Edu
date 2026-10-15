import { estado } from './estado.js';

export class ErrorApi extends Error {
    constructor(mensaje, codigo) {
        super(mensaje);
        this.codigo = codigo;
    }
}

async function pedir(metodo, ruta, { params, cuerpo, form } = {}) {
    let url = '/api' + ruta;
    if (params) {
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') q.set(k, v);
        if (q.size) url += '?' + q;
    }
    const headers = {};
    if (metodo !== 'GET') headers['X-CSRF-Token'] = estado.csrf ?? '';
    let body;
    if (form) body = form;
    else if (cuerpo !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(cuerpo);
    }

    let respuesta;
    try {
        respuesta = await fetch(url, { method: metodo, headers, body, credentials: 'same-origin' });
    } catch {
        throw new ErrorApi('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 401 && !ruta.startsWith('/auth/')) {
        estado.alExpirar?.();
        throw new ErrorApi('Tu sesión expiró. Inicia sesión de nuevo.', 401);
    }
    if (!respuesta.ok) throw new ErrorApi(datos.message ?? 'Ocurrió un error inesperado.', respuesta.status);
    return datos;
}

export const api = {
    get: (ruta, params) => pedir('GET', ruta, { params }),
    post: (ruta, cuerpo) => pedir('POST', ruta, { cuerpo }),
    put: (ruta, cuerpo) => pedir('PUT', ruta, { cuerpo }),
    patch: (ruta, cuerpo) => pedir('PATCH', ruta, { cuerpo }),
    del: (ruta) => pedir('DELETE', ruta),
    subir: (ruta, form, metodo = 'POST') => pedir(metodo, ruta, { form }),
};
