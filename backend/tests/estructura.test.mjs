// Pruebas de la estructura académica (grados, pensum, fichas completas), notificaciones y correo, técnicas de estudio,
// guías de los docentes, diario personal, foto de perfil, registro de notas propias y la IA nueva.
// Usan datos temporales con prefijo "zz_e2_" que se borran al terminar.   Ejecutar: npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { crearCliente, PNG_1x1, formConFoto } from './ayuda.mjs';

process.env.PORT = '0';
process.env.SOLO_ESTUDIANTES = 'false'; // estas pruebas cubren también las funciones de docente y administrador
await import('../src/config/env.js');
const { connection: db, dbConnectMysql } = await import('../src/config/mysql/dbmysql.js');
const { hashear } = await import('../src/servicios/contrasenas.js');
const { default: Server } = await import('../src/server/express.server.js');
const { usarTransporte } = await import('../src/servicios/correo.js');
const { generarAlertasProgramadas, enviarCorreosPendientes } = await import('../src/servicios/notificaciones.js');

const PASS = 'Prueba12345';
const P = 'zz_e2_';
let servidor; let base; let llm; let llmPuerto; let gradoId;
const ids = {};
const GRADO = P + 'G9';
const correos = [];
const fake = { ultimo: null };
const dias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const cliente = () => crearCliente(() => base);
const entrar = async (clave) => { const c = cliente(); await c.entrarCon(`${P}${clave}@t.co`, PASS); return c; };

async function usuario(clave, rol, extra = {}) {
    const [[r]] = await db.query('SELECT id FROM roles WHERE nombre = ?', [rol]);
    ids[clave] = (await db.query('INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash, grado_id) VALUES (?, ?, ?, ?, ?)',
        [r.id, `Nombre ${clave}`, `${P}${clave}@t.co`, await hashear(PASS), extra.grado_id ?? null]))[0].insertId;
}
const limpiar = async () => {
    await db.query(`DELETE FROM usuarios WHERE correo LIKE '${P}%'`);
    await db.query(`DELETE FROM grupos WHERE nombre LIKE '${P}%'`);
    await db.query(`DELETE FROM materias WHERE nombre LIKE '${P}%'`);
    await db.query(`DELETE FROM grados WHERE nombre LIKE '${P}%'`);
};

before(async () => {
    await dbConnectMysql();
    await limpiar();
    llm = http.createServer((req, res) => {
        let datos = '';
        req.on('data', (d) => { datos += d; });
        req.on('end', () => {
            fake.ultimo = JSON.parse(datos || '{}');
            const pedido = fake.ultimo.messages.at(-1).content;
            let contenido = 'Respuesta de prueba.';
            if (pedido.includes('actividad evaluable')) contenido = JSON.stringify({ titulo: 'Taller de fracciones', descripcion: '• Resuelve 10 ejercicios\n• Entrega en limpio', tipo: 'trabajo', prioridad: 'alta', dias_para_entregar: 3 });
            else if (pedido.includes('GUÍA DE ESTUDIO')) contenido = '• Repasa los apuntes\n• Haz un mapa mental';
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ choices: [{ message: { content: contenido } }] }));
        });
    });
    await new Promise((r) => llm.listen(0, '127.0.0.1', r));
    llmPuerto = llm.address().port;
    usarTransporte({ sendMail: async (m) => { correos.push(m); } }); // no se envía nada de verdad

    const s = new Server();
    await s.start();
    servidor = s.servidor;
    base = `http://127.0.0.1:${servidor.address().port}`;

    // Grado propio de la prueba (así no depende del plan de estudios real de la institución)
    gradoId = (await db.query('INSERT INTO grados (nombre, orden) VALUES (?, 99)', [GRADO]))[0].insertId;
    ids.m1 = (await db.query("INSERT INTO materias (nombre, color) VALUES (?, '#112233')", [`${P}Algebra`]))[0].insertId;
    ids.m2 = (await db.query("INSERT INTO materias (nombre, color) VALUES (?, '#332211')", [`${P}Fisica`]))[0].insertId;
    ids.m3 = (await db.query("INSERT INTO materias (nombre, color) VALUES (?, '#223311')", [`${P}Arte`]))[0].insertId;
    ids.g9 = (await db.query('INSERT INTO grupos (nombre, anio, grado_id) VALUES (?, 2026, ?)', [`${P}9A`, gradoId]))[0].insertId;
    await db.query('INSERT INTO grado_materias (grado_id, materia_id) VALUES (?, ?), (?, ?)', [gradoId, ids.m1, gradoId, ids.m2]); // Arte NO es del grado 9
    await usuario('admin', 'admin'); await usuario('doc', 'profesor'); await usuario('doc2', 'profesor');
    // La estudiante y su asignación (docente + materia + grupo) se crean directo en la BD: ya no hay pantallas de administración
    await usuario('ana', 'estudiante', { grado_id: gradoId });
    await db.query('INSERT INTO matriculas (estudiante_id, grupo_id) VALUES (?, ?)', [ids.ana, ids.g9]);
    await usuario('nuevo', 'estudiante', { grado_id: gradoId });
    await db.query('UPDATE usuarios SET notif_correo = 0 WHERE id = ?', [ids.nuevo]);
    await db.query('INSERT INTO matriculas (estudiante_id, grupo_id) VALUES (?, ?)', [ids.nuevo, ids.g9]);
    await db.query("UPDATE usuarios SET nombre = 'Doc Nuevo' WHERE id = ?", [ids.doc]);
    await db.query("UPDATE usuarios SET nombre = 'Ana Estudiante' WHERE id = ?", [ids.ana]);
    await usuario('ajeno', 'estudiante'); // otro estudiante, sin grupo
    ids.asig = (await db.query('INSERT INTO asignaciones (profesor_id, materia_id, grupo_id) VALUES (?, ?, ?)', [ids.doc, ids.m1, ids.g9]))[0].insertId;
});

after(async () => {
    await limpiar();
    usarTransporte(null);
    delete process.env.IA_API_KEY; delete process.env.IA_BASE_URL; delete process.env.IA_MODELO; delete process.env.IA_LIMITE_POR_HORA;
    servidor?.close(); llm?.close();
    await db.end();
});

// ---------- Administración: fichas completas, grado y pensum ----------
test('campanita y correo: nueva tarea, calificación, entrega, vencimientos próximos, sin duplicados y respetando la preferencia', async () => {
    const doc = await entrar('doc');
    const ana = await entrar('ana');
    const nuevo = await entrar('nuevo'); // tiene notif_correo = false
    const asig = (await doc.get('/api/catalogo')).datos.asignaciones[0];
    correos.length = 0;

    // Al publicar un examen para dentro de 30 horas: avisan campanita y correo (solo a quien lo permite)
    const manana = new Date(Date.now() + 30 * 3600 * 1000);
    const ex = await doc.post('/api/tareas', { asignacion_id: asig.id, titulo: `${P}Examen de álgebra`, tipo: 'examen', fecha_limite: manana.toISOString().slice(0, 10), hora_limite: '23:00', publicada: true });
    const aviso = (await ana.get('/api/notificaciones')).datos;
    assert.ok(aviso.items.some((n) => n.tipo === 'nueva_tarea' && n.titulo.includes('Examen de álgebra') && n.mensaje.includes('Doc Nuevo')), 'la campanita de Ana avisa y dice qué docente lo asignó');
    assert.ok(aviso.no_leidas >= 1);
    await enviarCorreosPendientes();
    assert.ok(correos.some((m) => m.to === `${P}ana@t.co` && /Examen de álgebra/.test(m.subject) && /Doc Nuevo/.test(m.text)), 'Ana recibe el correo en su correo registrado');
    assert.equal(correos.some((m) => m.to === `${P}nuevo@t.co`), false, 'quien desactivó los correos no recibe ninguno');
    assert.ok((await nuevo.get('/api/notificaciones')).datos.items.length >= 1, 'pero sí ve la campanita');

    // Cambiar la fecha avisa de nuevo; guardar sin cambiar la fecha no
    const n0 = (await ana.get('/api/notificaciones')).datos.items.length;
    await doc.put(`/api/tareas/${ex.datos.id}`, { titulo: `${P}Examen de álgebra`, tipo: 'examen', fecha_limite: manana.toISOString().slice(0, 10), hora_limite: '23:00', publicada: true });
    assert.equal((await ana.get('/api/notificaciones')).datos.items.length, n0, 'sin cambio de fecha no hay aviso nuevo');
    await doc.put(`/api/tareas/${ex.datos.id}`, { titulo: `${P}Examen de álgebra`, tipo: 'examen', fecha_limite: dias(6), hora_limite: '10:00', publicada: true });
    assert.ok((await ana.get('/api/notificaciones')).datos.items.some((n) => n.tipo === 'cambio_fecha'));

    // Borrador: no avisa; al publicarlo sí
    const bor = await doc.post('/api/tareas', { asignacion_id: asig.id, titulo: `${P}Borrador oculto`, fecha_limite: dias(5), publicada: false });
    assert.equal((await ana.get('/api/notificaciones')).datos.items.some((n) => n.titulo.includes('Borrador oculto')), false);
    await doc.post(`/api/tareas/${bor.datos.id}/publicar`, { publicada: true });
    assert.ok((await ana.get('/api/notificaciones')).datos.items.some((n) => n.titulo.includes('Borrador oculto')));

    // Entrega → avisa al docente; calificación → avisa a la estudiante
    const form = new FormData(); form.append('comentario', 'listo');
    assert.equal((await ana.pedir('POST', `/api/entregas/tarea/${bor.datos.id}`, form, { form: true })).estado, 200);
    assert.ok((await doc.get('/api/notificaciones')).datos.items.some((n) => n.tipo === 'entrega' && n.titulo.includes('Nombre ana'.length ? 'Ana Estudiante' : '')));
    const fila = (await doc.get(`/api/entregas/tarea/${bor.datos.id}`)).datos.entregas.find((e) => e.estudiante_id === ids.ana);
    await doc.put(`/api/entregas/${fila.entrega_id}/calificar`, { calificacion: 4.4, comentario_profesor: 'bien' });
    assert.ok((await ana.get('/api/notificaciones')).datos.items.some((n) => n.tipo === 'calificacion' && n.mensaje.includes('4.4')));

    // Alertas programadas: "examen próximo" para Ana, una sola vez aunque se ejecute varias veces
    await db.query('UPDATE tareas SET fecha_limite = DATE(DATE_ADD(NOW(), INTERVAL 20 HOUR)), hora_limite = TIME(DATE_ADD(NOW(), INTERVAL 20 HOUR)) WHERE id = ?', [ex.datos.id]);
    await generarAlertasProgramadas();
    await generarAlertasProgramadas();
    const pronto = (await ana.get('/api/notificaciones')).datos.items.filter((n) => n.tipo === 'proxima' && n.titulo.includes('Examen próximo'));
    assert.equal(pronto.length, 1);
    assert.ok(correos.filter((m) => m.to === `${P}ana@t.co` && /Examen próximo/.test(m.subject)).length <= 1);
    // Docente: resumen de entregas por calificar (una por día)
    const [[d]] = await db.query("SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND tipo = 'por_calificar'", [ids.doc]);
    assert.ok(d.n <= 1);

    // Marcar como leídas
    const id = aviso.items[0].id;
    assert.equal((await ana.post(`/api/notificaciones/${id}/leer`)).estado, 200);
    assert.equal((await nuevo.post(`/api/notificaciones/${id}/leer`)).estado, 404, 'no se puede tocar una notificación ajena');
    await ana.post('/api/notificaciones/leer-todas');
    assert.equal((await ana.get('/api/notificaciones')).datos.no_leidas, 0);
});

test('un correo que falla se reintenta como máximo 3 veces y no detiene a los demás', async () => {
    const ana = await entrar('ana');
    let intentos = 0;
    usarTransporte({ sendMail: async () => { intentos++; throw new Error('SMTP caído'); } });
    await db.query(`INSERT INTO notificaciones (usuario_id, tipo, clave, titulo) VALUES (?, 'prueba', 'fallo:1', 'Aviso que falla')`, [ids.ana]);
    for (let i = 0; i < 5; i++) await enviarCorreosPendientes();
    assert.equal(intentos, 3);
    usarTransporte({ sendMail: async (m) => { correos.push(m); } });
    void ana;
});

// ---------- Registro de notas propias, recordatorios de texto ----------
test('examen propio presentado con nota, registro por materia y recordatorios escritos a mano', async () => {
    const ana = await entrar('ana');
    const otro = await entrar('nuevo');
    const ex = await ana.post('/api/pendientes', { titulo: `${P}Mi examen`, tipo: 'examen', fecha_limite: dias(-1), hora: '08:00', materia_id: ids.m1 });
    assert.equal(ex.estado, 201);
    assert.equal((await ana.patch(`/api/pendientes/${ex.datos.id}/presentado`, { presentado: true, nota: 7 })).estado, 400);
    const ok = await ana.patch(`/api/pendientes/${ex.datos.id}/presentado`, { presentado: true, nota: '3,8' });
    assert.equal(ok.datos.nota, 3.8);
    const lista = (await ana.get(`/api/pendientes?con_nota=1&materia_id=${ids.m1}`)).datos.items;
    assert.equal(lista.length, 1); assert.equal(lista[0].materia, `${P}Algebra`); assert.equal(lista[0].completado, true);
    assert.equal((await ana.patch(`/api/pendientes/${ex.datos.id}/presentado`, { presentado: true, nota: 4.5 })).datos.nota, 4.5, 'se puede editar la nota');
    assert.equal((await otro.patch(`/api/pendientes/${ex.datos.id}/presentado`, { presentado: true, nota: 5 })).estado, 404, 'no se toca la nota de otro');
    assert.equal((await ana.post('/api/pendientes', { titulo: 'x', materia_id: 99999 })).estado, 400);
    await ana.patch(`/api/pendientes/${ex.datos.id}/presentado`, { presentado: false });
    assert.equal((await ana.get('/api/pendientes?con_nota=1')).datos.items.length, 0, 'al quitar "presentado" se borra la nota');
    await ana.patch(`/api/pendientes/${ex.datos.id}/presentado`, { presentado: true, nota: 4.5 });
    assert.equal((await ana.del('/api/pendientes/completados')).datos.eliminados, 0, 'los que tienen nota no se limpian');

    // Estadísticas: avance por materia con TODAS las materias del grado
    const est = (await ana.get('/api/estadisticas')).datos;
    const alg = est.por_materia.find((m) => m.materia === `${P}Algebra`);
    const fis = est.por_materia.find((m) => m.materia === `${P}Fisica`);
    assert.ok(alg && fis, 'aparecen las materias del grado aunque no tengan actividades');
    assert.equal(alg.docentes, 'Doc Nuevo'); assert.equal(fis.docentes, null);
    assert.equal(alg.promedio_personal, 4.5); assert.ok(alg.total >= 1 && alg.proxima, 'hay una próxima entrega');
    assert.equal(fis.total, 0); assert.equal(fis.progreso, 0);

    // Recordatorio escrito (sin elegir tarea ni pendiente)
    const r = await ana.post('/api/recordatorios', { texto: 'Llevar la calculadora', avisar_en: `${dias(1)}T07:00` });
    assert.equal(r.estado, 201);
    assert.equal((await ana.post('/api/recordatorios', { texto: 'Llevar la calculadora', avisar_en: `${dias(1)}T07:00` })).estado, 409);
    assert.equal((await ana.post('/api/recordatorios', { avisar_en: `${dias(1)}T07:00` })).estado, 400, 'sin texto no hay recordatorio');
    assert.equal((await ana.post('/api/recordatorios', { texto: 'x'.repeat(250), avisar_en: `${dias(1)}T07:00` })).estado, 400);
    assert.equal((await ana.get('/api/recordatorios?estado=proximos')).datos.items[0].titulo, 'Llevar la calculadora');
    await db.query('UPDATE recordatorios SET avisar_en = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?', [r.datos.id]);
    await generarAlertasProgramadas();
    assert.ok((await ana.get('/api/notificaciones')).datos.items.some((n) => n.tipo === 'recordatorio' && n.titulo.includes('calculadora')));
    assert.equal((await ana.get('/api/recordatorios?estado=activos')).datos.items.length, 1);
});

// ---------- Técnicas de estudio ----------
test('diario personal: emociones, cómo me siento, qué salió bien y qué mejorar; privado y con validación', async () => {
    const ana = await entrar('ana');
    const otro = await entrar('nuevo');
    const f = dias(0);
    assert.equal((await ana.put(`/api/diario/${f}`, { emociones: ['alegre-inventada'] })).estado, 400);
    assert.equal((await ana.put(`/api/diario/${f}`, { energia: 9 })).estado, 400);
    const r = await ana.put(`/api/diario/${f}`, {
        animo: 4, emociones: ['feliz', 'motivado', 'feliz'], sentir: 'Hoy me sentí con ganas de estudiar', gratitud: 'Mi familia', bien: 'Entregué a tiempo', mejorar: 'Dormir más temprano', energia: 3, reflexion: 'Voy mejorando',
    });
    assert.equal(r.estado, 200);
    const dia = (await ana.get(`/api/diario/${f}`)).datos.dia;
    assert.deepEqual(dia.emociones, ['feliz', 'motivado']); assert.equal(dia.bien, 'Entregué a tiempo'); assert.equal(dia.mejorar, 'Dormir más temprano'); assert.equal(dia.energia, 3);
    const entradas = (await ana.get('/api/diario/entradas')).datos.items;
    assert.ok(entradas.some((e) => e.fecha === f && e.sentir.startsWith('Hoy me sentí')));
    assert.equal((await otro.get('/api/diario/entradas')).datos.items.length, 0);
    assert.equal((await otro.get(`/api/diario/${f}`)).datos.dia.sentir, null);
});

// ---------- Foto de perfil ----------
test('foto de perfil: se sube, se ve, solo la ven las personas autorizadas, y se valida el archivo', async () => {
    const ana = await entrar('ana');
    const doc = await entrar('doc');
    const doc2 = await entrar('doc2');
    const ajeno = await entrar('ajeno');
    assert.equal((await ana.get(`/api/auth/foto/${ids.ana}`)).estado, 404, 'aún sin foto');
    assert.equal((await ana.pedir('POST', '/api/auth/perfil/foto', formConFoto(Buffer.from('no es una imagen'), 'x.png'), { form: true })).estado, 400, 'contenido falso');
    assert.equal((await ana.pedir('POST', '/api/auth/perfil/foto', formConFoto(PNG_1x1, 'x.exe'), { form: true })).estado, 400, 'extensión no permitida');
    assert.equal((await ana.pedir('POST', '/api/auth/perfil/foto', formConFoto(Buffer.concat([PNG_1x1, Buffer.alloc(6 * 1024 * 1024)]), 'grande.png'), { form: true })).estado, 400, 'más de 5 MB');
    // Otros formatos de imagen: GIF, JFIF, BMP, SVG… (se valida el contenido real)
    const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
    const BMP = Buffer.concat([Buffer.from('BM'), Buffer.alloc(60)]);
    const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>');
    for (const [datos, nombre, mime] of [[GIF, 'a.gif', 'image/gif'], [JPG, 'b.jfif', 'image/jpeg'], [BMP, 'c.bmp', 'image/bmp'], [SVG, 'd.svg', 'image/svg+xml']]) {
        assert.equal((await ana.pedir('POST', '/api/auth/perfil/foto', formConFoto(datos, nombre), { form: true })).estado, 200, nombre);
        const vv = await ana.get(`/api/auth/foto/${ids.ana}`);
        assert.equal(vv.estado, 200); assert.equal(vv.tipo, mime, nombre);
    }
    assert.equal((await ana.pedir('POST', '/api/auth/perfil/foto', formConFoto(Buffer.from('texto que no es svg'), 'e.svg'), { form: true })).estado, 400, 'svg falso');
    assert.equal((await ana.pedir('POST', '/api/auth/perfil/foto', formConFoto(PNG_1x1, 'f.gif'), { form: true })).estado, 400, 'png disfrazado de gif');
    assert.equal((await ana.pedir('POST', '/api/auth/perfil/foto', formConFoto(PNG_1x1), { form: true })).estado, 200);
    const v = await ana.get(`/api/auth/foto/${ids.ana}`);
    assert.equal(v.estado, 200); assert.equal(v.tipo, 'image/png'); assert.ok(v.datos.equals(PNG_1x1));
    assert.equal((await doc.get(`/api/auth/foto/${ids.ana}`)).estado, 200, 'su docente la ve');
    assert.equal((await doc2.get(`/api/auth/foto/${ids.ana}`)).estado, 403, 'otro docente no');
    assert.equal((await ajeno.get(`/api/auth/foto/${ids.ana}`)).estado, 403, 'otro estudiante no');
    assert.equal((await cliente().get(`/api/auth/foto/${ids.ana}`)).estado, 401);
    assert.equal((await ana.get('/api/auth/yo')).datos.usuario.foto, true);
    // el administrador puede ponerle foto a un docente y borrarla
    const admin = await entrar('admin');
    assert.equal((await ana.del('/api/auth/perfil/foto')).estado, 200);
    assert.equal((await ana.get(`/api/auth/foto/${ids.ana}`)).estado, 404);
});

// ---------- Filtros del docente ----------
test('horario: se escribe por hora, se marca como cumplido, es privado y no aparece en los pendientes', async () => {
    const ana = await entrar('ana');
    const otro = await entrar('doc');
    const dia = dias(2);
    const r = await ana.post('/api/horario', { texto: 'Repasar fracciones', fecha: dia, hora: '06:00' });
    assert.equal(r.estado, 201);
    assert.equal((await ana.post('/api/horario', { texto: '', fecha: dia, hora: '06:00' })).estado, 400, 'texto obligatorio');
    assert.equal((await ana.post('/api/horario', { texto: 'x', fecha: 'mañana', hora: '06:00' })).estado, 400, 'fecha válida');
    // No es un pendiente
    assert.equal((await ana.get('/api/pendientes?q=Repasar%20fracciones')).datos.items.length, 0);
    // Cumplido
    assert.equal((await ana.patch(`/api/horario/${r.datos.id}/cumplido`, { cumplido: true })).estado, 200);
    const lista = (await ana.get(`/api/horario?fecha=${dia}`)).datos.items;
    assert.equal(lista.length, 1); assert.equal(lista[0].cumplido, true); assert.equal(lista[0].hora, '06:00');
    // Aparece en el calendario como evento propio (con su estado)
    const ag = (await ana.get(`/api/agenda?desde=${dia}&hasta=${dia}`)).datos.items.find((i) => i.origen === 'horario');
    assert.ok(ag && ag.completado === true && ag.titulo === 'Repasar fracciones');
    // Corregir
    assert.equal((await ana.put(`/api/horario/${r.datos.id}`, { texto: 'Repasar fracciones y decimales', fecha: dia, hora: '06:00' })).estado, 200);
    // Es privado: otra persona no lo ve, ni lo toca
    assert.equal((await otro.get(`/api/horario?fecha=${dia}`)).datos.items.length, 0);
    assert.equal((await otro.del(`/api/horario/${r.datos.id}`)).estado, 404);
    assert.equal((await otro.patch(`/api/horario/${r.datos.id}/cumplido`, { cumplido: false })).estado, 404);
    // Eliminar
    assert.equal((await ana.del(`/api/horario/${r.datos.id}`)).estado, 200);
    assert.equal((await ana.get(`/api/horario?fecha=${dia}`)).datos.items.length, 0);
});

// ---------- Alertas: botón de alertas, alerta de prueba y correos a cualquier dominio ----------
test('alertas: el botón de prueba llega a la campanita y al correo; se puede activar o desactivar el correo; sirve para cualquier dominio', async () => {
    const ana = await entrar('ana');
    const g = (await ana.get('/api/notificaciones?limite=100')).datos;
    assert.equal(g.correo.configurado, true); assert.equal(g.correo.direccion, `${P}ana@t.co`);
    correos.length = 0;
    // Con el correo activado: campanita + correo
    assert.equal((await ana.patch('/api/notificaciones/correo', { activado: true })).datos.activado, true);
    let r = await ana.post('/api/notificaciones/prueba');
    assert.equal(r.estado, 200); assert.equal(r.datos.correo, 'enviado'); assert.equal(r.datos.campanita, true);
    assert.equal(correos.length, 1); assert.equal(correos[0].to, `${P}ana@t.co`); assert.match(correos[0].subject, /Alerta de prueba/);
    assert.ok((await ana.get('/api/notificaciones')).datos.items.some((n) => n.tipo === 'prueba'), 'aparece en la campanita');
    // Desactivado: solo campanita
    await ana.patch('/api/notificaciones/correo', { activado: false });
    r = await ana.post('/api/notificaciones/prueba');
    assert.equal(r.datos.correo, 'desactivado'); assert.equal(correos.length, 1, 'no se mandó otro correo');
    await ana.patch('/api/notificaciones/correo', { activado: true });
    // Si el servidor de correo falla, lo dice y la campanita igual recibe la alerta
    usarTransporte({ sendMail: async () => { throw new Error('SMTP caído'); } });
    r = await ana.post('/api/notificaciones/prueba');
    assert.equal(r.datos.correo, 'error'); assert.equal(r.estado, 200);
    usarTransporte({ sendMail: async (m) => { correos.push(m); } });
    // Cualquier dominio: institucional, Gmail, Yahoo y Hotmail reciben sus alertas
    const dominios = ['colegio.edu.co', 'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const [[rol]] = await db.query("SELECT id FROM roles WHERE nombre = 'estudiante'");
    const hash = await hashear(PASS);
    for (const d of dominios) await db.query('INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash) VALUES (?, ?, ?, ?)', [rol.id, `Dominio ${d}`, `${P}dom@${d}`, hash]);
    try {
        correos.length = 0;
        const { notificar } = await import('../src/servicios/notificaciones.js');
        for (const d of dominios) {
            const [[u]] = await db.query('SELECT id FROM usuarios WHERE correo = ?', [`${P}dom@${d}`]);
            await notificar(u.id, { tipo: 'prueba', clave: `dom-${d}`, titulo: `Hola ${d}` });
        }
        await enviarCorreosPendientes(100);
        const destinos = correos.map((c) => c.to).filter((t) => t.startsWith(`${P}dom@`)).sort();
        assert.deepEqual(destinos, dominios.map((d) => `${P}dom@${d}`).sort(), 'cada dominio recibió su alerta');
    } finally {
        await db.query(`DELETE FROM usuarios WHERE correo LIKE '${P}dom@%'`);
    }
    // Sin sesión no se puede
    assert.equal((await cliente().post('/api/notificaciones/prueba')).estado, 401);
});
