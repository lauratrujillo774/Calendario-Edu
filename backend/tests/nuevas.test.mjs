// Pruebas de las funciones nuevas: diario/bullet journal, hábitos, colecciones, planeación, asistencia e IA (con un servidor de IA falso).
// Usan datos temporales con prefijo "zz_nuevas_" que se borran al terminar.   Ejecutar: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.PORT = '0';
process.env.SOLO_ESTUDIANTES = 'false'; // estas pruebas cubren también las funciones de docente y administrador
await import('../src/config/env.js');
const { connection: db, dbConnectMysql } = await import('../src/config/mysql/dbmysql.js');
const { hashear } = await import('../src/servicios/contrasenas.js');
const { default: Server } = await import('../src/server/express.server.js');

const PASS = 'Prueba12345';
const P = 'zz_nuevas_';
let servidor; let base; let llm; let llmPuerto;
const ids = {};
const fake = { modo: 'ok', ultimo: null, llamadas: 0 };
const dias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function cliente() {
    const c = { cookie: '', csrf: '' };
    c.pedir = async (metodo, ruta, cuerpo) => {
        const headers = {};
        if (c.cookie) headers.cookie = c.cookie;
        if (c.csrf) headers['x-csrf-token'] = c.csrf;
        let body;
        if (cuerpo !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(cuerpo); }
        const r = await fetch(base + ruta, { method: metodo, headers, body });
        const sc = r.headers.get('set-cookie');
        if (sc) c.cookie = sc.split(';')[0];
        return { estado: r.status, datos: await r.json().catch(() => ({})) };
    };
    c.get = (r) => c.pedir('GET', r);
    c.post = (r, b) => c.pedir('POST', r, b ?? {});
    c.put = (r, b) => c.pedir('PUT', r, b ?? {});
    c.patch = (r, b) => c.pedir('PATCH', r, b ?? {});
    c.del = (r) => c.pedir('DELETE', r);
    c.entrar = async (clave) => {
        const r = await c.post('/api/auth/login', { correo: `${P}${clave}@t.co`, password: PASS });
        assert.equal(r.estado, 200);
        c.csrf = r.datos.csrf;
    };
    return c;
}

async function usuario(clave, rol) {
    const [[r]] = await db.query('SELECT id FROM roles WHERE nombre = ?', [rol]);
    ids[clave] = (await db.query('INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash) VALUES (?, ?, ?, ?)', [r.id, `Nombre ${clave}`, `${P}${clave}@t.co`, await hashear(PASS)]))[0].insertId;
}
const limpiar = async () => {
    await db.query(`DELETE FROM usuarios WHERE correo LIKE '${P}%'`);
    await db.query(`DELETE FROM grupos WHERE nombre LIKE '${P}%'`);
    await db.query(`DELETE FROM materias WHERE nombre LIKE '${P}%'`);
};

before(async () => {
    await dbConnectMysql();
    await limpiar();
    // Servidor de IA falso (formato OpenAI): guarda lo último que recibió y responde según lo que se pida
    llm = http.createServer((req, res) => {
        let datos = '';
        req.on('data', (d) => { datos += d; });
        req.on('end', () => {
            fake.llamadas++;
            fake.autorizacion = req.headers.authorization;
            fake.ultimo = JSON.parse(datos || '{}');
            if (fake.modo !== 'ok') { res.writeHead(Number(fake.modo)); res.end('{}'); return; }
            const pedido = fake.ultimo.messages.at(-1).content;
            const hoy = new Date().toISOString().slice(0, 10);
            let contenido = 'Respuesta de prueba del asistente.';
            if (pedido.includes('plan de estudio')) {
                contenido = '```json\n' + JSON.stringify({
                    resumen: 'Plan de prueba', consejos: ['Descansa', 'Repasa'],
                    bloques: [
                        { fecha: hoy, hora: '16:00', duracion_min: 50, titulo: 'Repasar para el examen', detalle: 'Haz ejercicios', tipo: 'examen' },
                        { fecha: '2001-01-01', hora: '16:00', duracion_min: 50, titulo: 'Fuera de rango', detalle: '', tipo: 'tarea' },
                        { fecha: hoy, hora: '99:99', duracion_min: 5000, titulo: 'Duración enorme', detalle: 'x', tipo: 'raro' },
                    ],
                }) + '\n```';
            } else if (pedido.includes('BORRADOR de retroalimentación')) contenido = 'Ana, buen trabajo. Mejora la claridad. La próxima vez revisa tus pasos.';
            else if (pedido.includes('plan para UNA clase')) {
                contenido = JSON.stringify({ objetivos: ['Comprender el tema'], actividades: [{ minutos: 15, descripcion: 'Inicio con una pregunta' }, { minutos: 30, descripcion: 'Práctica guiada' }], recursos: ['Tablero'], evaluacion: 'Ticket de salida' });
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: contenido } }] }));
        });
    });
    await new Promise((r) => llm.listen(0, '127.0.0.1', r));
    llmPuerto = llm.address().port;

    const s = new Server();
    await s.start();
    servidor = s.servidor;
    base = `http://127.0.0.1:${servidor.address().port}`;
    await usuario('prof1', 'profesor'); await usuario('prof2', 'profesor'); await usuario('est1', 'estudiante'); await usuario('est2', 'estudiante');
    await usuario('est3', 'estudiante'); await usuario('admin', 'admin');
    ids.g1 = (await db.query('INSERT INTO grupos (nombre, anio) VALUES (?, 2026)', [`${P}A`]))[0].insertId;
    ids.g2 = (await db.query('INSERT INTO grupos (nombre, anio) VALUES (?, 2026)', [`${P}B`]))[0].insertId;
    ids.m = (await db.query("INSERT INTO materias (nombre, color) VALUES (?, '#223344')", [`${P}Mat`]))[0].insertId;
    ids.a1 = (await db.query('INSERT INTO asignaciones (profesor_id, materia_id, grupo_id) VALUES (?, ?, ?)', [ids.prof1, ids.m, ids.g1]))[0].insertId;
    ids.a2 = (await db.query('INSERT INTO asignaciones (profesor_id, materia_id, grupo_id) VALUES (?, ?, ?)', [ids.prof2, ids.m, ids.g2]))[0].insertId;
    await db.query('INSERT INTO matriculas (estudiante_id, grupo_id) VALUES (?, ?), (?, ?)', [ids.est1, ids.g1, ids.est2, ids.g2]);
});

after(async () => {
    await limpiar();
    delete process.env.IA_API_KEY; delete process.env.IA_BASE_URL; delete process.env.IA_MODELO; delete process.env.IA_LIMITE_POR_HORA;
    servidor?.close(); llm?.close();
    await db.end();
});

// ---------- Bullet journal y diario ----------
test('diario Hobonichi: ánimo, gratitud y reflexión se guardan por día y son privados', async () => {
    const a = cliente(); await a.entrar('est1');
    const b = cliente(); await b.entrar('est2');
    const f = dias(0);
    assert.equal((await a.put(`/api/diario/${f}`, { animo: 9 })).estado, 400);
    assert.equal((await a.put(`/api/diario/${f}`, { animo: 4, gratitud: 'Mi familia', reflexion: 'Aprendí a organizarme', memo: 'Llevar el cuaderno' })).estado, 200);
    assert.equal((await a.put(`/api/diario/${f}`, { animo: 5, gratitud: 'Mi familia' })).estado, 200); // actualiza, no duplica
    const dia = (await a.get(`/api/diario/${f}`)).datos.dia;
    assert.equal(dia.animo, 5); assert.equal(dia.gratitud, 'Mi familia');
    const otro = (await b.get(`/api/diario/${f}`)).datos.dia;
    assert.equal(otro.animo, null); assert.equal(otro.gratitud, null);
    assert.equal((await a.get(`/api/diario?desde=${dias(-3)}&hasta=${dias(1)}`)).datos.items.length, 1);
});

test('hábitos: recomendados por rol, marcar días (no futuros) y privacidad', async () => {
    const est = cliente(); await est.entrar('est1');
    const prof = cliente(); await prof.entrar('prof1');
    const otro = cliente(); await otro.entrar('est2');
    assert.ok((await est.post('/api/habitos/sugeridos')).datos.creados >= 3);
    assert.equal((await est.post('/api/habitos/sugeridos')).datos.creados, 0); // no repite
    const lista = (await est.get('/api/habitos')).datos;
    assert.ok(lista.habitos.some((h) => h.nombre === 'Estudiar'));
    await prof.post('/api/habitos/sugeridos');
    assert.ok((await prof.get('/api/habitos')).datos.habitos.some((h) => h.nombre === 'Planear la clase'), 'el docente recibe hábitos de docente');

    const h = lista.habitos[0];
    const hoy = lista.hoy;
    assert.equal((await est.put(`/api/habitos/${h.id}/dias/${hoy}`)).estado, 200);
    assert.equal((await est.put(`/api/habitos/${h.id}/dias/${hoy}`)).estado, 200); // idempotente
    assert.equal((await est.put(`/api/habitos/${h.id}/dias/${dias(10)}`)).estado, 400);
    const despues = (await est.get('/api/habitos')).datos.habitos.find((x) => x.id === h.id);
    assert.deepEqual(despues.dias, [hoy]); assert.equal(despues.racha, 1);
    assert.equal((await otro.put(`/api/habitos/${h.id}/dias/${hoy}`)).estado, 404);
    assert.equal((await otro.del(`/api/habitos/${h.id}`)).estado, 404);
    assert.equal((await est.post('/api/habitos', { nombre: 'Meta mala', meta_semanal: 9 })).estado, 400);
    assert.equal((await est.del(`/api/habitos/${h.id}/dias/${hoy}`)).estado, 200);
});

