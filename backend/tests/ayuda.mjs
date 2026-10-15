// Utilidades compartidas por las pruebas nuevas (no es una prueba: no termina en .test.mjs)
import assert from 'node:assert/strict';

// Cliente HTTP con cookie de sesión y token CSRF. `base()` devuelve la URL del servidor de pruebas.
export function crearCliente(base) {
    const c = { cookie: '', csrf: '' };
    c.pedir = async (metodo, ruta, cuerpo, { form = false } = {}) => {
        const headers = {};
        if (c.cookie) headers.cookie = c.cookie;
        if (c.csrf) headers['x-csrf-token'] = c.csrf;
        let body;
        if (form) body = cuerpo;
        else if (cuerpo !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(cuerpo); }
        const r = await fetch(base() + ruta, { method: metodo, headers, body });
        const sc = r.headers.get('set-cookie');
        if (sc) c.cookie = sc.split(';')[0];
        const tipo = r.headers.get('content-type') ?? '';
        return { estado: r.status, tipo, datos: tipo.includes('json') ? await r.json().catch(() => ({})) : Buffer.from(await r.arrayBuffer()) };
    };
    c.get = (r) => c.pedir('GET', r);
    c.post = (r, b) => c.pedir('POST', r, b ?? {});
    c.put = (r, b) => c.pedir('PUT', r, b ?? {});
    c.patch = (r, b) => c.pedir('PATCH', r, b ?? {});
    c.del = (r) => c.pedir('DELETE', r);
    c.entrarCon = async (correo, password) => {
        const r = await c.post('/api/auth/login', { correo, password });
        assert.equal(r.estado, 200, `login de ${correo}: ${JSON.stringify(r.datos)}`);
        c.csrf = r.datos.csrf;
        return r.datos.usuario;
    };
    return c;
}

// PNG válido de 1×1 píxel
export const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

export function formConFoto(bytes, nombre = 'foto.png') {
    const f = new FormData();
    f.append('foto', new Blob([bytes]), nombre);
    return f;
}
