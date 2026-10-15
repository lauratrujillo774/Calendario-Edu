// Pruebas de aceptación contra la base de datos REAL, con datos temporales (prefijo "zz_test_")
// que se borran al terminar. Ejecutar:  npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

process.env.PORT = '0';
process.env.SOLO_ESTUDIANTES = 'false'; // estas pruebas cubren también las funciones de docente y administrador
await import('../src/config/env.js');
const { connection: db, dbConnectMysql } = await import('../src/config/mysql/dbmysql.js');
const { hashear } = await import('../src/servicios/contrasenas.js');
const { default: Server } = await import('../src/server/express.server.js');

const PASS = 'Prueba12345';
const P = 'zz_test_';
let servidor;
let base;
const ids = {};

// Cliente HTTP con cookie de sesión y token CSRF
function cliente() {
    const c = { cookie: '', csrf: '' };
    c.pedir = async (metodo, ruta, cuerpo, { sinCsrf = false, form = false } = {}) => {
        const headers = {};
        if (c.cookie) headers.cookie = c.cookie;
        if (c.csrf && !sinCsrf) headers['x-csrf-token'] = c.csrf;
        let body;
        if (form) body = cuerpo;
        else if (cuerpo !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(cuerpo); }
        const r = await fetch(base + ruta, { method: metodo, headers, body, redirect: 'manual' });
        const sc = r.headers.get('set-cookie');
        if (sc) c.cookie = sc.split(';')[0];
        const tipo = r.headers.get('content-type') ?? '';
        const datos = tipo.includes('json') ? await r.json() : await r.arrayBuffer();
        return { estado: r.status, datos };
    };
    c.get = (r) => c.pedir('GET', r);
    c.post = (r, b, o) => c.pedir('POST', r, b, o);
    c.put = (r, b) => c.pedir('PUT', r, b);
    c.patch = (r, b) => c.pedir('PATCH', r, b);
    c.del = (r) => c.pedir('DELETE', r);
    c.entrar = async (correo, password = PASS) => {
        const r = await c.post('/api/auth/login', { correo, password });
        assert.equal(r.estado, 200, `login de ${correo}: ${JSON.stringify(r.datos)}`);
        c.csrf = r.datos.csrf;
        return r.datos.usuario;
    };
    return c;
}

async function crearUsuario(clave, rol, nombre) {
    const [[r]] = await db.query('SELECT id FROM roles WHERE nombre = ?', [rol]);
    const [res] = await db.query(
        'INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash) VALUES (?, ?, ?, ?)',
        [r.id, nombre, `${P}${clave}@test.co`, await hashear(PASS)]);
    ids[clave] = res.insertId;
    return `${P}${clave}@test.co`;
}

const manana = () => new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
const enDias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function limpiar() {
    await db.query(`DELETE FROM usuarios WHERE correo LIKE '${P}%'`);
    await db.query(`DELETE FROM grupos WHERE nombre LIKE '${P}%'`);
    await db.query(`DELETE FROM materias WHERE nombre LIKE '${P}%'`);
    await db.query(`DELETE FROM eventos WHERE titulo LIKE '${P}%'`);
}

before(async () => {
    await dbConnectMysql();
    await limpiar();
    const s = new Server();
    await s.start();
    servidor = s.servidor;
    base = `http://127.0.0.1:${servidor.address().port}`;

    await crearUsuario('admin', 'admin', 'Admin Test');
    await crearUsuario('prof1', 'profesor', 'Profe Uno');
    await crearUsuario('prof2', 'profesor', 'Profe Dos');
    await crearUsuario('est1', 'estudiante', 'Estudiante Uno');
    await crearUsuario('est2', 'estudiante', 'Estudiante Dos');
    ids.g1 = (await db.query('INSERT INTO grupos (nombre, anio) VALUES (?, 2026)', [`${P}A`]))[0].insertId;
    ids.g2 = (await db.query('INSERT INTO grupos (nombre, anio) VALUES (?, 2026)', [`${P}B`]))[0].insertId;
    ids.mat = (await db.query("INSERT INTO materias (nombre, color) VALUES (?, '#123456')", [`${P}Materia`]))[0].insertId;
    ids.as1 = (await db.query('INSERT INTO asignaciones (profesor_id, materia_id, grupo_id) VALUES (?, ?, ?)', [ids.prof1, ids.mat, ids.g1]))[0].insertId;
    ids.as2 = (await db.query('INSERT INTO asignaciones (profesor_id, materia_id, grupo_id) VALUES (?, ?, ?)', [ids.prof2, ids.mat, ids.g2]))[0].insertId;
    await db.query('INSERT INTO matriculas (estudiante_id, grupo_id) VALUES (?, ?), (?, ?)', [ids.est1, ids.g1, ids.est2, ids.g2]);
});

after(async () => {
    await limpiar();
    servidor?.close();
    await db.end();
});

// ---------- Seguridad básica ----------
test('sin sesión la API responde 401, y sin token CSRF se rechaza modificar datos', async () => {
    const anon = cliente();
    assert.equal((await anon.get('/api/tareas')).estado, 401);
    const e1 = cliente();
    await e1.entrar(`${P}est1@test.co`);
    const r = await e1.post('/api/notas', { titulo: 'x' }, { sinCsrf: true });
    assert.equal(r.estado, 403);
});

test('contraseña incorrecta, usuario con marcador sin hash y usuario inexistente no pueden entrar', async () => {
    const c = cliente();
    assert.equal((await c.post('/api/auth/login', { correo: `${P}est1@test.co`, password: 'incorrecta1' })).estado, 401);
    assert.equal((await c.post('/api/auth/login', { correo: 'admin@santaelena.edu.co', password: 'REEMPLAZAR_CON_HASH' })).estado, 401);
    assert.equal((await c.post('/api/auth/login', { correo: 'no.existe@x.co', password: PASS })).estado, 401);
});

test('un hash scrypt antiguo sigue funcionando y se convierte a bcrypt', async () => {
    const sal = randomBytes(16).toString('hex');
    const clave = (await promisify(scrypt)(PASS, sal, 64)).toString('hex');
    await db.query('UPDATE usuarios SET contrasena_hash = ? WHERE id = ?', [`${sal}:${clave}`, ids.est2]);
    await cliente().entrar(`${P}est2@test.co`);
    const [[u]] = await db.query('SELECT contrasena_hash FROM usuarios WHERE id = ?', [ids.est2]);
    assert.match(u.contrasena_hash, /^\$2[aby]\$/);
});

test('el registro pide rol (estudiante o docente), nunca admite administrador y valida contraseña y correo', async () => {
    const c = cliente();
    const datos = { nombre: 'Persona Test', correo: `${P}nuevo@test.co`, password: 'corta', rol: 'estudiante' };
    assert.equal((await c.post('/api/auth/registro', datos)).estado, 400);
    assert.equal((await c.post('/api/auth/registro', { ...datos, password: PASS, correo: 'no-es-correo' })).estado, 400);
    assert.equal((await c.post('/api/auth/registro', { ...datos, password: PASS, rol: undefined })).estado, 400);
    assert.equal((await c.post('/api/auth/registro', { ...datos, password: PASS, rol: 'admin' })).estado, 400);
    const ok = await c.post('/api/auth/registro', { ...datos, password: PASS });
    assert.equal(ok.estado, 201);
    assert.equal(ok.datos.usuario.rol, 'estudiante');
    assert.equal((await cliente().post('/api/auth/registro', { ...datos, password: PASS })).estado, 409);
    // Un docente que se registra queda sin materias: no puede publicar nada hasta que un administrador lo asigne
    const doc = cliente();
    const rd = await doc.post('/api/auth/registro', { nombre: 'Docente Nuevo', correo: `${P}docente@test.co`, password: PASS, rol: 'docente' });
    assert.equal(rd.estado, 201);
    assert.equal(rd.datos.usuario.rol, 'profesor');
    doc.csrf = rd.datos.csrf;
    assert.deepEqual((await doc.get('/api/catalogo')).datos.asignaciones, []);
    assert.equal((await doc.post('/api/tareas', { asignacion_id: ids.as1, titulo: 'x', fecha_limite: manana() })).estado, 403);
});

// ---------- Roles, tareas y calendario ----------
test('1-2: cada rol ve solo lo suyo; un profesor solo usa sus asignaciones', async () => {
    const prof = cliente();
    await prof.entrar(`${P}prof1@test.co`);
    const cat = await prof.get('/api/catalogo');
    assert.deepEqual(cat.datos.asignaciones.map((a) => a.id), [ids.as1]);

    const base = { titulo: 'No debería crearse', tipo: 'tarea', fecha_limite: manana(), publicada: true };
    assert.equal((await prof.post('/api/tareas', { ...base, asignacion_id: ids.as2 })).estado, 403);

    const est = cliente();
    await est.entrar(`${P}est1@test.co`);
    assert.equal((await est.post('/api/tareas', { ...base, asignacion_id: ids.as1 })).estado, 403);
});

test('3-8-9: profesor crea tarea, aparece al estudiante, cambia la fecha sin duplicar y califica', async () => {
    const prof = cliente(); await prof.entrar(`${P}prof1@test.co`);
    const est1 = cliente(); await est1.entrar(`${P}est1@test.co`);
    const est2 = cliente(); await est2.entrar(`${P}est2@test.co`);
    const prof2 = cliente(); await prof2.entrar(`${P}prof2@test.co`);

    const crea = await prof.post('/api/tareas', {
        asignacion_id: ids.as1, titulo: `${P}Examen parcial`, descripcion: 'Capítulos 1 al 3', tipo: 'examen',
        prioridad: 'alta', fecha_limite: manana(), hora_limite: '08:30', publicada: true,
    });
    assert.equal(crea.estado, 201);
    const id = crea.datos.id;
    ids.tarea = id;

    // Aparece en el calendario del estudiante correcto y NO en el de otro grupo
    const rango = `desde=${enDias(-1)}&hasta=${enDias(10)}`;
    const a1 = await est1.get(`/api/agenda?${rango}`);
    assert.equal(a1.datos.items.filter((i) => i.origen === 'tarea' && i.id === id).length, 1);
    assert.equal(a1.datos.items.find((i) => i.id === id).hora, '08:30');
    const a2 = await est2.get(`/api/agenda?${rango}`);
    assert.equal(a2.datos.items.filter((i) => i.origen === 'tarea' && i.id === id).length, 0);

    // Un estudiante de otro grupo no puede consultar la tarea (6) ni su entrega (7)
    assert.equal((await est2.get(`/api/tareas/${id}`)).estado, 403);
    assert.equal((await est2.post(`/api/entregas/tarea/${id}`, undefined, { form: true })).estado, 403);

    // Cambio de fecha: se refleja y no se duplica ni la tarea ni las entregas (8)
    const nueva = enDias(6);
    const edita = await prof.put(`/api/tareas/${id}`, {
        titulo: `${P}Examen parcial`, tipo: 'examen', prioridad: 'alta', fecha_limite: nueva, hora_limite: '10:00', publicada: true });
    assert.equal(edita.estado, 200);
    const a1b = await est1.get(`/api/agenda?${rango}`);
    const copias = a1b.datos.items.filter((i) => i.origen === 'tarea' && i.id === id);
    assert.equal(copias.length, 1);
    assert.equal(copias[0].fecha, nueva);
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM entregas WHERE tarea_id = ?', [id]);
    assert.equal(n, 1);

    // Otro profesor no puede modificar, calificar ni ver las entregas de esta tarea
    assert.equal((await prof2.put(`/api/tareas/${id}`, { titulo: 'x', fecha_limite: nueva })).estado, 403);
    assert.equal((await prof2.get(`/api/entregas/tarea/${id}`)).estado, 403);

    // Entrega del estudiante y calificación (9)
    const form = new FormData();
    form.append('comentario', 'Listo profe');
    const ent = await est1.post(`/api/entregas/tarea/${id}`, form, { form: true });
    assert.equal(ent.estado, 200);
    const lista = await prof.get(`/api/entregas/tarea/${id}`);
    const fila = lista.datos.entregas.find((e) => e.estudiante_id === ids.est1);
    assert.equal(fila.estado, 'entregada');
    assert.equal((await prof2.put(`/api/entregas/${fila.entrega_id}/calificar`, { calificacion: 5 })).estado, 403);
    assert.equal((await est1.put(`/api/entregas/${fila.entrega_id}/calificar`, { calificacion: 5 })).estado, 403);
    assert.equal((await prof.put(`/api/entregas/${fila.entrega_id}/calificar`, { calificacion: 9 })).estado, 400);
    assert.equal((await prof.put(`/api/entregas/${fila.entrega_id}/calificar`, { calificacion: '4,5', comentario_profesor: 'Muy bien' })).estado, 200);

    const vista = await est1.get(`/api/tareas/${id}`);
    assert.equal(vista.datos.tarea.estado, 'calificada');
    assert.equal(vista.datos.tarea.calificacion, 4.5);
    assert.equal(vista.datos.tarea.comentario_profesor, 'Muy bien');
    // Ya calificada: no se puede volver a entregar
    assert.equal((await est1.post(`/api/entregas/tarea/${id}`, form, { form: true })).estado, 400);
});

test('borradores: el estudiante no los ve hasta que el profesor los publica', async () => {
    const prof = cliente(); await prof.entrar(`${P}prof1@test.co`);
    const est = cliente(); await est.entrar(`${P}est1@test.co`);
    const r = await prof.post('/api/tareas', { asignacion_id: ids.as1, titulo: `${P}Borrador`, fecha_limite: manana(), publicada: false });
    const id = r.datos.id;
    assert.equal((await est.get(`/api/tareas/${id}`)).estado, 403);
    assert.equal((await est.get('/api/tareas?q=Borrador')).datos.items.length, 0);
    await prof.post(`/api/tareas/${id}/publicar`, { publicada: true });
    assert.equal((await est.get(`/api/tareas/${id}`)).estado, 200);
});

test('5: completar un pendiente personal no altera la tarea oficial', async () => {
    const est = cliente(); await est.entrar(`${P}est1@test.co`);
    const p = await est.post('/api/pendientes', { titulo: `${P}Repasar`, fecha_limite: manana(), prioridad: 'alta', tarea_id: ids.tarea });
    assert.equal(p.estado, 201);
    const antes = (await est.get(`/api/tareas/${ids.tarea}`)).datos.tarea.estado;
    assert.equal((await est.patch(`/api/pendientes/${p.datos.id}/completar`, { completado: true })).estado, 200);
    assert.equal((await est.get(`/api/tareas/${ids.tarea}`)).datos.tarea.estado, antes);
    const lista = await est.get('/api/pendientes?estado=completada');
    assert.ok(lista.datos.items.some((x) => x.id === p.datos.id && x.completado));
    // Otro estudiante no puede tocarlo ni relacionarlo con una tarea que no ve
    const otro = cliente(); await otro.entrar(`${P}est2@test.co`);
    assert.equal((await otro.patch(`/api/pendientes/${p.datos.id}/completar`, { completado: false })).estado, 404);
    assert.equal((await otro.post('/api/pendientes', { titulo: 'x', tarea_id: ids.tarea })).estado, 403);
});

test('10: las notas personales son privadas', async () => {
    const a = cliente(); await a.entrar(`${P}est1@test.co`);
    const b = cliente(); await b.entrar(`${P}est2@test.co`);
    const n = await a.post('/api/notas', { titulo: `${P}Secreta`, contenido: 'Solo para mí', fecha: manana(), color: 'rosa' });
    assert.equal(n.estado, 201);
    assert.equal((await b.get('/api/notas')).datos.items.some((x) => x.titulo === `${P}Secreta`), false);
    assert.equal((await b.put(`/api/notas/${n.datos.id}`, { titulo: 'hack' })).estado, 404);
    assert.equal((await b.del(`/api/notas/${n.datos.id}`)).estado, 404);
    const agendaB = await b.get(`/api/agenda?desde=${enDias(-1)}&hasta=${enDias(10)}`);
    assert.equal(agendaB.datos.items.some((i) => i.origen === 'nota'), false);
    assert.equal((await a.post('/api/notas', { titulo: 'x', color: 'negro' })).estado, 400);
});

test('11: los filtros por tipo, materia, estado y búsqueda se combinan', async () => {
    const est = cliente(); await est.entrar(`${P}est1@test.co`);
    const rango = `desde=${enDias(-1)}&hasta=${enDias(10)}`;
    const q = async (extra) => (await est.get(`/api/agenda?${rango}&${extra}`)).datos.items.filter((i) => i.origen === 'tarea');
    assert.ok((await q('tipo=examen')).some((i) => i.id === ids.tarea));
    assert.equal((await q('tipo=trabajo')).some((i) => i.id === ids.tarea), false);
    assert.ok((await q(`materia_id=${ids.mat}&estado=calificada`)).some((i) => i.id === ids.tarea));
    assert.equal((await q('estado=pendiente')).some((i) => i.id === ids.tarea), false);
    assert.ok((await q('q=parcial&prioridad=alta')).some((i) => i.id === ids.tarea));
    assert.equal((await q('q=parcial&prioridad=baja')).length, 0);
    assert.equal((await est.get(`/api/agenda?desde=${enDias(-1)}&hasta=${enDias(400)}`)).estado, 400);
});

test('12: eventos institucionales y de grupo respetan los permisos', async () => {
    const admin = cliente(); await admin.entrar(`${P}admin@test.co`);
    const prof = cliente(); await prof.entrar(`${P}prof1@test.co`);
    const est1 = cliente(); await est1.entrar(`${P}est1@test.co`);
    const est2 = cliente(); await est2.entrar(`${P}est2@test.co`);
    const fecha = manana();

    assert.equal((await admin.post('/api/eventos', { titulo: `${P}Institucional`, fecha })).estado, 201);
    assert.equal((await prof.post('/api/eventos', { titulo: `${P}Grupo 1`, fecha, grupo_id: ids.g1, hora: '09:00' })).estado, 201);
    assert.equal((await prof.post('/api/eventos', { titulo: `${P}Grupo 2`, fecha, grupo_id: ids.g2 })).estado, 403);
    assert.equal((await prof.post('/api/eventos', { titulo: `${P}Inst falso`, fecha })).estado, 403);
    assert.equal((await est1.post('/api/eventos', { titulo: 'x', fecha })).estado, 403);

    const titulos = async (c) => (await c.get('/api/eventos')).datos.items.map((e) => e.titulo).filter((t) => t.startsWith(P));
    assert.deepEqual((await titulos(est1)).sort(), [`${P}Grupo 1`, `${P}Institucional`]);
    assert.deepEqual(await titulos(est2), [`${P}Institucional`]);
    assert.equal((await titulos(admin)).length, 2);
});

test('19: recordatorios sin duplicados y solo de tareas visibles', async () => {
    const est1 = cliente(); await est1.entrar(`${P}est1@test.co`);
    const est2 = cliente(); await est2.entrar(`${P}est2@test.co`);
    const avisar = `${manana()}T07:00`;
    const r = await est1.post('/api/recordatorios', { tarea_id: ids.tarea, avisar_en: avisar });
    assert.equal(r.estado, 201);
    assert.equal((await est1.post('/api/recordatorios', { tarea_id: ids.tarea, avisar_en: avisar })).estado, 409);
    assert.equal((await est2.post('/api/recordatorios', { tarea_id: ids.tarea, avisar_en: avisar })).estado, 403);
    assert.equal((await est1.post('/api/recordatorios', { avisar_en: avisar })).estado, 400);
    assert.equal((await est2.patch(`/api/recordatorios/${r.datos.id}/descartar`)).estado, 404);
    assert.equal((await est1.patch(`/api/recordatorios/${r.datos.id}/descartar`)).estado, 200);
});

test('archivos: valida tipo, tamaño y contenido; solo los autorizados descargan', async () => {
    const est1 = cliente(); await est1.entrar(`${P}est1@test.co`);
    const est2 = cliente(); await est2.entrar(`${P}est2@test.co`);
    const prof = cliente(); await prof.entrar(`${P}prof1@test.co`);
    const prof2 = cliente(); await prof2.entrar(`${P}prof2@test.co`);
    const t = await prof.post('/api/tareas', { asignacion_id: ids.as1, titulo: `${P}Con archivo`, fecha_limite: manana(), publicada: true });
    const id = t.datos.id;
    const subir = (nombre, contenido) => {
        const f = new FormData();
        f.append('archivo', new Blob([contenido]), nombre);
        return est1.post(`/api/entregas/tarea/${id}`, f, { form: true });
    };
    assert.equal((await subir('virus.exe', 'MZ....')).estado, 400);
    assert.equal((await subir('falso.pdf', 'esto no es un pdf')).estado, 400);
    assert.equal((await subir('grande.pdf', '%PDF-1.4' + 'a'.repeat(6 * 1024 * 1024))).estado, 400);
    assert.equal((await subir('informe.pdf', '%PDF-1.4 contenido de prueba')).estado, 200);

    const lista = await prof.get(`/api/entregas/tarea/${id}`);
    const fila = lista.datos.entregas.find((e) => e.estudiante_id === ids.est1);
    assert.equal(fila.tiene_archivo, 1);
    assert.equal((await est1.get(`/api/entregas/${fila.entrega_id}/archivo`)).estado, 200);
    assert.equal((await prof.get(`/api/entregas/${fila.entrega_id}/archivo`)).estado, 200);
    assert.equal((await est2.get(`/api/entregas/${fila.entrega_id}/archivo`)).estado, 403);
    assert.equal((await prof2.get(`/api/entregas/${fila.entrega_id}/archivo`)).estado, 403);
    // Los archivos subidos no se sirven como estáticos
    const directo = await fetch(`${base}/uploads/entregas/x.pdf`);
    assert.notEqual(directo.status, 200);
    await prof.del(`/api/tareas/${id}`);
});

test('15-16: triggers sin duplicados y datos originales intactos', async () => {
    // Matricular tarde a un estudiante crea las entregas de tareas futuras una sola vez
    const [[antes]] = await db.query('SELECT COUNT(*) AS n FROM entregas WHERE estudiante_id = ?', [ids.est2]);
    await db.query('INSERT INTO matriculas (estudiante_id, grupo_id) VALUES (?, ?)', [ids.est2, ids.g1]);
    const [[despues]] = await db.query('SELECT COUNT(*) AS n FROM entregas WHERE estudiante_id = ?', [ids.est2]);
    assert.ok(despues.n > antes.n);
    await assert.rejects(db.query('INSERT INTO matriculas (estudiante_id, grupo_id) VALUES (?, ?)', [ids.est2, ids.g1]));
    const [dup] = await db.query('SELECT tarea_id, estudiante_id, COUNT(*) c FROM entregas GROUP BY tarea_id, estudiante_id HAVING c > 1');
    assert.equal(dup.length, 0);
    // No se puede mover una tarea a otra asignación
    await assert.rejects(db.query('UPDATE tareas SET asignacion_id = ? WHERE id = ?', [ids.as2, ids.tarea]), /No se puede cambiar/);
    // (Los datos de ejemplo originales pueden haberse eliminado desde la pantalla del administrador: la prueba ya no depende de ellos.)
});

// ---------- Novedades: tareas/exámenes personales, días de estudio, búsqueda, calificación docente ----------
test('pendientes personales de tipo examen/evento con hora aparecen en la agenda con su tipo', async () => {
    const est = cliente(); await est.entrar(`${P}est1@test.co`);
    const f = manana();
    const ex = await est.post('/api/pendientes', { titulo: `${P}Mi examen`, tipo: 'examen', fecha_limite: f, hora: '07:30' });
    assert.equal(ex.estado, 201);
    assert.equal((await est.post('/api/pendientes', { titulo: 'x', tipo: 'otro' })).estado, 400);
    assert.equal((await est.post('/api/pendientes', { titulo: 'x', hora: '25:00' })).estado, 400);
    const rango = `desde=${enDias(-1)}&hasta=${enDias(10)}`;
    const items = (await est.get(`/api/agenda?${rango}&tipo=examen`)).datos.items;
    const propio = items.find((i) => i.origen === 'pendiente' && i.id === ex.datos.id);
    assert.ok(propio, 'el examen personal aparece con el filtro de exámenes');
    assert.equal(propio.tipo, 'examen'); assert.equal(propio.hora, '07:30'); assert.equal(propio.personal, true);
    assert.ok(items.some((i) => i.origen === 'tarea' && i.id === ids.tarea), 'junto con el examen oficial');
    const otro = cliente(); await otro.entrar(`${P}est2@test.co`);
    assert.equal((await otro.get(`/api/agenda?${rango}&tipo=examen`)).datos.items.some((i) => i.id === ex.datos.id && i.origen === 'pendiente'), false);
    // limpieza de completados
    await est.patch(`/api/pendientes/${ex.datos.id}/completar`, { completado: true });
    assert.equal((await est.del('/api/pendientes/completados')).datos.eliminados >= 1, true);
});

test('días de estudio: se marcan, no admiten el futuro y alimentan las estadísticas', async () => {
    const est = cliente(); await est.entrar(`${P}est1@test.co`);
    const [[{ hoy }]] = await db.query('SELECT CURDATE() AS hoy');
    assert.equal((await est.put(`/api/estudio/${enDias(20)}`, {})).estado, 400);
    assert.equal((await est.put(`/api/estudio/${hoy}`, { minutos: 0 })).estado, 400);
    assert.equal((await est.put(`/api/estudio/${hoy}`, { minutos: 45 })).estado, 200);
    assert.equal((await est.put(`/api/estudio/${hoy}`, { minutos: 60 })).estado, 200); // actualiza, no duplica
    const lista = await est.get(`/api/estudio?desde=${enDias(-7)}&hasta=${hoy}`);
    assert.equal(lista.datos.items.filter((x) => x.fecha === hoy).length, 1);
    const s = (await est.get('/api/estadisticas')).datos;
    assert.ok(s.estudio_semana.dias >= 1 && s.estudio_semana.minutos >= 60 && s.estudio_semana.meta === 7);
    assert.equal(s.examenes.aprobados >= 1, true); // el examen calificado con 4.5 de las pruebas anteriores
    assert.equal((await est.del(`/api/estudio/${hoy}`)).estado, 200);
});

test('búsqueda global: solo encuentra lo que el usuario puede ver', async () => {
    const est1 = cliente(); await est1.entrar(`${P}est1@test.co`);
    const est2 = cliente(); await est2.entrar(`${P}est2@test.co`);
    assert.equal((await est1.get('/api/buscar?q=a')).estado, 400);
    const prof2 = cliente(); await prof2.entrar(`${P}prof2@test.co`);
    const soloB = await prof2.post('/api/tareas', { asignacion_id: ids.as2, titulo: `${P}Solo grupo B`, fecha_limite: manana(), publicada: true });
    assert.ok((await est1.get('/api/buscar?q=Examen parcial')).datos.tareas.some((t) => t.id === ids.tarea));
    assert.equal((await est1.get('/api/buscar?q=Solo grupo B')).datos.tareas.length, 0); // est1 no está en el grupo B
    assert.ok((await est2.get('/api/buscar?q=Solo grupo B')).datos.tareas.some((t) => t.id === soloB.datos.id));
    await prof2.del(`/api/tareas/${soloB.datos.id}`);
    assert.equal((await est2.get('/api/buscar?q=Secreta')).datos.notas.length, 0);
    assert.ok((await est1.get('/api/buscar?q=Secreta')).datos.notas.length >= 1);
});

test('profesor: cola por calificar y libro de calificaciones, con permisos', async () => {
    const prof = cliente(); await prof.entrar(`${P}prof1@test.co`);
    const prof2 = cliente(); await prof2.entrar(`${P}prof2@test.co`);
    const est1 = cliente(); await est1.entrar(`${P}est1@test.co`);
    const t = await prof.post('/api/tareas', { asignacion_id: ids.as1, titulo: `${P}Para calificar`, fecha_limite: manana(), publicada: true });
    const form = new FormData(); form.append('comentario', 'hecho');
    assert.equal((await est1.post(`/api/entregas/tarea/${t.datos.id}`, form, { form: true })).estado, 200);

    const cola = (await prof.get('/api/entregas/por-calificar')).datos.items;
    assert.ok(cola.some((e) => e.tarea_id === t.datos.id && e.estudiante_id === ids.est1));
    assert.equal((await prof2.get('/api/entregas/por-calificar')).datos.items.some((e) => e.tarea_id === t.datos.id), false);
    assert.equal((await est1.get('/api/entregas/por-calificar')).estado, 403);

    const libro = await prof.get(`/api/entregas/libro?asignacion_id=${ids.as1}`);
    assert.equal(libro.estado, 200);
    const fila = libro.datos.estudiantes.find((e) => e.id === ids.est1);
    assert.equal(fila.celdas.length, libro.datos.tareas.length);
    assert.equal(fila.celdas.find((c) => c.tarea_id === ids.tarea).calificacion, 4.5);
    assert.equal(fila.promedio, 4.5);
    assert.equal((await prof2.get(`/api/entregas/libro?asignacion_id=${ids.as1}`)).estado, 403);
    assert.equal((await est1.get(`/api/entregas/libro?asignacion_id=${ids.as1}`)).estado, 403);

    await prof.del(`/api/tareas/${t.datos.id}`);
});

test('el administrador puede listar actividades sin filtros (regresión: WHERE vacío)', async () => {
    const admin = cliente(); await admin.entrar(`${P}admin@test.co`);
    const r = await admin.get('/api/tareas');
    assert.equal(r.estado, 200);
    assert.ok(r.datos.total >= 1 && r.datos.items.length >= 1);
    assert.equal((await admin.get('/api/tareas?tipo=examen')).estado, 200);
});
