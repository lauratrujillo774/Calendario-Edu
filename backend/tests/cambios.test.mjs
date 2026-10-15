// Pruebas de los cambios de octubre: materias que registra el estudiante y conexión de la IA por n8n.
// Usan datos temporales con prefijo "zz_c3_" que se borran al terminar.   Ejecutar: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { crearCliente } from './ayuda.mjs';

process.env.PORT = '0';
await import('../src/config/env.js');
const { connection: db, dbConnectMysql } = await import('../src/config/mysql/dbmysql.js');
const { hashear } = await import('../src/servicios/contrasenas.js');
const { default: Server } = await import('../src/server/express.server.js');

const PASS = 'Prueba12345';
const P = 'zz_c3_';
let servidor; let base; let n8n; let n8nPuerto; let gradoId;
const ids = {};
const visto = { cuerpo: null, secreto: null, modo: 'ok' };
const cliente = () => crearCliente(() => base);
const limpiar = async () => {
    await db.query(`DELETE FROM usuarios WHERE correo LIKE '${P}%'`);
    await db.query(`DELETE FROM materias WHERE nombre LIKE '${P}%' OR nombre LIKE '%Robotica ${P}%'`);
    await db.query(`DELETE FROM grados WHERE nombre LIKE '${P}%'`);
};

before(async () => {
    await dbConnectMysql();
    await limpiar();
    // «n8n» falso: guarda lo que recibe y responde como lo haría el flujo de docs/n8n/educal-ia.workflow.json
    n8n = http.createServer((req, res) => {
        let datos = '';
        req.on('data', (d) => { datos += d; });
        req.on('end', () => {
            visto.cuerpo = JSON.parse(datos || '{}');
            visto.secreto = req.headers['x-educal-secreto'];
            if (visto.modo === 'rechazo') { res.writeHead(403); res.end('{}'); return; }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(visto.modo === 'lista' ? JSON.stringify([{ output: 'Respuesta en lista.' }]) : JSON.stringify({ respuesta: 'Hola desde n8n.' }));
        });
    });
    await new Promise((r) => n8n.listen(0, '127.0.0.1', r));
    n8nPuerto = n8n.address().port;

    const s = new Server();
    await s.start();
    servidor = s.servidor;
    base = `http://127.0.0.1:${servidor.address().port}`;

    gradoId = (await db.query('INSERT INTO grados (nombre, orden) VALUES (?, 98)', [`${P}G`]))[0].insertId;
    ids.mGrado = (await db.query("INSERT INTO materias (nombre, color) VALUES (?, '#112233')", [`${P}Matematicas`]))[0].insertId;
    await db.query('INSERT INTO grado_materias (grado_id, materia_id) VALUES (?, ?)', [gradoId, ids.mGrado]);
    const [[rol]] = await db.query("SELECT id FROM roles WHERE nombre = 'estudiante'");
    for (const clave of ['ana', 'luis']) {
        ids[clave] = (await db.query('INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash, grado_id) VALUES (?, ?, ?, ?, ?)',
            [rol.id, `Nombre ${clave}`, `${P}${clave}@t.co`, await hashear(PASS), clave === 'ana' ? gradoId : null]))[0].insertId;
    }
});

after(async () => {
    await limpiar();
    for (const k of ['N8N_WEBHOOK_URL', 'N8N_SECRETO']) delete process.env[k];
    servidor?.close(); n8n?.close();
    await db.end();
});

test('el estudiante registra las materias que ve (nueva o existente), las ve en su catálogo y perfil, y las quita', async () => {
    const ana = cliente(); await ana.entrarCon(`${P}ana@t.co`, PASS);
    let r = await ana.get('/api/mis-materias');
    assert.equal(r.estado, 200);
    assert.deepEqual(r.datos.items.map((m) => [m.nombre, m.del_grado, m.propia]), [[`${P}Matematicas`, true, false]], 'al inicio solo las del plan de su grado');

    assert.equal((await ana.post('/api/mis-materias', {})).estado, 400, 'hay que decir cuál');
    assert.equal((await ana.post('/api/mis-materias', { nombre: 'a' })).estado, 400, 'nombre muy corto');
    assert.equal((await ana.post('/api/mis-materias', { materia_id: 999999 })).estado, 400, 'materia inexistente');

    r = await ana.post('/api/mis-materias', { nombre: `  Robotica ${P}  ` });
    assert.equal(r.estado, 201);
    const robotica = r.datos.items.find((m) => m.nombre === `Robotica ${P}`);
    assert.ok(robotica?.propia, 'la nueva queda como propia (se espacios recortados)');
    // Repetirla (aunque cambien mayúsculas) no la duplica
    r = await ana.post('/api/mis-materias', { nombre: `ROBOTICA ${P}` });
    assert.equal(r.datos.items.filter((m) => m.nombre.toLowerCase() === `robotica ${P}`.toLowerCase()).length, 1);
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM materias WHERE nombre = ?', [`Robotica ${P}`]);
    assert.equal(n, 1, 'no se crean materias repetidas');

    // Aparece en el catálogo (listas desplegables) y en el perfil, y se puede usar en un pendiente
    assert.ok((await ana.get('/api/catalogo')).datos.materias.some((m) => m.id === robotica.id));
    const perfil = (await ana.get('/api/auth/perfil')).datos.perfil;
    assert.ok(perfil.materias.find((m) => m.id === robotica.id)?.propia);
    assert.equal(perfil.materias.find((m) => m.id === ids.mGrado)?.propia, false);
    assert.equal((await ana.post('/api/pendientes', { titulo: 'Prototipo', tipo: 'tarea', materia_id: robotica.id })).estado, 201);

    // Es privada: otra persona no la ve; las del grado no se pueden quitar
    const luis = cliente(); await luis.entrarCon(`${P}luis@t.co`, PASS);
    assert.ok(!(await luis.get('/api/catalogo')).datos.materias.some((m) => m.id === robotica.id), 'las materias registradas son de cada estudiante');
    assert.equal((await luis.del(`/api/mis-materias/${robotica.id}`)).estado, 404);
    assert.equal((await ana.del(`/api/mis-materias/${ids.mGrado}`)).estado, 404, 'las del plan de estudios no se quitan');
    r = await ana.del(`/api/mis-materias/${robotica.id}`);
    assert.equal(r.estado, 200);
    assert.ok(!r.datos.items.some((m) => m.id === robotica.id));
});

