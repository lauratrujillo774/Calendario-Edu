// EduCal es solo para estudiantes: registro, inicio de sesión (correo y Google), cuentas de docente/administrador bloqueadas y
// el estudiante escribiendo su grado y su grupo. Usa datos temporales con prefijo "zz_es_" que se borran al terminar.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { crearCliente } from './ayuda.mjs';

process.env.PORT = '0';
delete process.env.SOLO_ESTUDIANTES; // regla por defecto: solo estudiantes
await import('../src/config/env.js');
const { connection: db, dbConnectMysql } = await import('../src/config/mysql/dbmysql.js');
const { hashear } = await import('../src/servicios/contrasenas.js');
const { default: Server } = await import('../src/server/express.server.js');
const { usarVerificadorGoogle } = await import('../src/servicios/google.js');

const P = 'zz_es_';
const PASS = 'Prueba12345';
let servidor; let base;
const cliente = () => crearCliente(() => base);
const limpiar = async () => {
    await db.query(`DELETE FROM usuarios WHERE correo LIKE '${P}%'`);
    await db.query("DELETE FROM usuarios WHERE correo LIKE 'zz\\_es\\_%@gmail.com'");
};

before(async () => {
    await dbConnectMysql();
    await limpiar();
    const s = new Server();
    await s.start();
    servidor = s.servidor;
    base = `http://127.0.0.1:${servidor.address().port}`;
});
after(async () => {
    await limpiar();
    usarVerificadorGoogle(null);
    await new Promise((r) => servidor.close(r));
    await db.end();
});

test('registro: solo estudiantes, con nombres y apellidos, y grado y grupo opcionales', async () => {
    const c = cliente();
    // El rol docente o administrador ya no se puede elegir
    for (const rol of ['docente', 'profesor', 'admin']) {
        assert.equal((await c.post('/api/auth/registro', { nombres: 'Luz', apellidos: 'Mora', correo: `${P}luz@t.co`, password: PASS, rol })).estado, 400, rol);
    }
    // Sin rol: es estudiante
    const r = await c.post('/api/auth/registro', { nombres: 'Luz', apellidos: 'Mora', correo: `${P}luz@t.co`, password: PASS });
    assert.equal(r.estado, 201);
    assert.equal(r.datos.usuario.rol, 'estudiante');
    c.csrf = r.datos.csrf;
    const yo = (await c.get('/api/auth/perfil')).datos.perfil;
    assert.equal(yo.nombres, 'Luz'); assert.equal(yo.apellidos, 'Mora'); assert.equal(yo.nombre, 'Luz Mora');
    // Con grado y grupo escritos como número
    const c2 = cliente();
    const r2 = await c2.post('/api/auth/registro', { nombres: 'Ivan', apellidos: 'Rios', correo: `${P}ivan@t.co`, password: PASS, grado_numero: 11, grupo_numero: 1, rol: 'estudiante' });
    assert.equal(r2.estado, 201);
    c2.csrf = r2.datos.csrf;
    const p2 = (await c2.get('/api/auth/perfil')).datos.perfil;
    assert.equal(p2.grado_numero, 11); assert.equal(p2.grupo.nombre, '11-1'); assert.ok(p2.materias.length >= 10, 'recibe las materias de su grado');
    // Validaciones
    assert.equal((await cliente().post('/api/auth/registro', { nombres: 'Ana', apellidos: 'X', correo: `${P}ana@t.co`, password: PASS, grado_numero: 40 })).estado, 400, 'grado inválido');
    assert.equal((await cliente().post('/api/auth/registro', { nombres: 'Ana', apellidos: 'Xy', correo: `${P}luz@t.co`, password: PASS })).estado, 409, 'correo repetido');
    assert.equal((await cliente().post('/api/auth/registro', { nombres: 'Ana', apellidos: 'Xy', correo: `${P}ana@t.co`, password: 'corta' })).estado, 400, 'contraseña corta');
    // La cuenta nueva no quedó creada con el grado inválido
    assert.equal((await db.query('SELECT id FROM usuarios WHERE correo = ?', [`${P}ana@t.co`]))[0].length, 0);
});

test('inicio de sesión: las cuentas de docente y administrador ya no entran, ni siquiera con sesión abierta', async () => {
    const hash = await hashear(PASS);
    const [[rp]] = await db.query("SELECT id FROM roles WHERE nombre = 'profesor'");
    const [[ra]] = await db.query("SELECT id FROM roles WHERE nombre = 'admin'");
    await db.query('INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash) VALUES (?, ?, ?, ?), (?, ?, ?, ?)',
        [rp.id, 'Doc Antiguo', `${P}doc@t.co`, hash, ra.id, 'Admin Antiguo', `${P}adm@t.co`, hash]);
    for (const quien of ['doc', 'adm']) {
        const c = cliente();
        const r = await c.post('/api/auth/login', { correo: `${P}${quien}@t.co`, password: PASS });
        assert.equal(r.estado, 403, quien);
        assert.match(r.datos.message, /solo para estudiantes/);
    }
    // Una sesión que ya existía de esa cuenta deja de funcionar
    process.env.SOLO_ESTUDIANTES = 'false';
    const abierta = cliente();
    await abierta.entrarCon(`${P}adm@t.co`, PASS);
    assert.equal((await abierta.get('/api/auth/yo')).estado, 200);
    delete process.env.SOLO_ESTUDIANTES;
    assert.equal((await abierta.get('/api/auth/yo')).estado, 401, 'la sesión del administrador ya no vale');
    // Un estudiante entra con normalidad
    const est = cliente();
    const u = await est.entrarCon(`${P}luz@t.co`, PASS);
    assert.equal(u.rol, 'estudiante');
});

test('Google: crea la cuenta de estudiante la primera vez y luego inicia sesión; verifica el token y respeta las reglas', async () => {
    const correo = `${P}maria@gmail.com`;
    const verdadero = { email: correo, email_verified: true, name: 'Maria Lopez', given_name: 'Maria', family_name: 'Lopez', sub: '123' };
    usarVerificadorGoogle(async (credencial) => {
        if (credencial === 'valida') return verdadero;
        if (credencial === 'no-verificado') return { ...verdadero, email_verified: false };
        if (credencial === 'docente') return { ...verdadero, email: `${P}doc@t.co` };
        const e = new Error('token falso'); e.status = 401; throw e;
    });
    const c = cliente();
    // Credencial inválida o correo sin verificar
    assert.equal((await c.post('/api/auth/google', { credential: 'falsa' })).estado >= 400, true);
    assert.equal((await c.post('/api/auth/google', { credential: 'no-verificado' })).estado, 401);
    // Primera vez: registro
    const r = await c.post('/api/auth/google', { credential: 'valida' });
    assert.equal(r.estado, 201); assert.equal(r.datos.nuevo, true); assert.equal(r.datos.usuario.rol, 'estudiante');
    c.csrf = r.datos.csrf;
    const perfil = (await c.get('/api/auth/perfil')).datos.perfil;
    assert.equal(perfil.nombres, 'Maria'); assert.equal(perfil.apellidos, 'Lopez'); assert.equal(perfil.correo, correo);
    // Segunda vez: inicia sesión en la misma cuenta
    const c2 = cliente();
    const r2 = await c2.post('/api/auth/google', { credential: 'valida' });
    assert.equal(r2.estado, 200); assert.equal(r2.datos.nuevo, false); assert.equal(r2.datos.usuario.id, r.datos.usuario.id);
    assert.equal((await db.query('SELECT id FROM usuarios WHERE correo = ?', [correo]))[0].length, 1, 'no se duplica');
    // Con una cuenta de Google nadie puede entrar con contraseña (no tiene)
    assert.equal((await cliente().post('/api/auth/login', { correo, password: 'GOOGLE' })).estado, 401);
    // Si el correo es de una cuenta de docente/administrador, no entra
    assert.equal((await cliente().post('/api/auth/google', { credential: 'docente' })).estado, 403);
    // Una cuenta que ya existía con contraseña entra con Google (el correo está verificado por Google)
    usarVerificadorGoogle(async () => ({ ...verdadero, email: `${P}luz@t.co`, name: 'Luz Mora' }));
    const r3 = await cliente().post('/api/auth/google', { credential: 'valida' });
    assert.equal(r3.estado, 200); assert.equal(r3.datos.nuevo, false);
});

test('configuración pública: expone el Client ID de Google solo si está configurado', async () => {
    const antes = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    let r = await cliente().get('/api/auth/config');
    assert.equal(r.estado, 200); assert.equal(r.datos.google_client_id, null); assert.equal(r.datos.solo_estudiantes, true);
    process.env.GOOGLE_CLIENT_ID = 'abc123.apps.googleusercontent.com';
    r = await cliente().get('/api/auth/config');
    assert.equal(r.datos.google_client_id, 'abc123.apps.googleusercontent.com');
    if (antes === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = antes;
    // Sin configurar y sin verificador de prueba, Google responde 503 con un mensaje claro
    usarVerificadorGoogle(null);
    delete process.env.GOOGLE_CLIENT_ID;
    assert.equal((await cliente().post('/api/auth/google', { credential: 'x' })).estado, 503);
    if (antes !== undefined) process.env.GOOGLE_CLIENT_ID = antes;
});

test('el estudiante escribe su grado y su grupo, y puede cambiarlos', async () => {
    const c = cliente();
    await c.entrarCon(`${P}luz@t.co`, PASS);
    const antes = new Set((await db.query("SELECT id FROM grupos WHERE nombre IN ('10-2', '11-3')"))[0].map((g) => g.id));
    try {
        let r = await c.put('/api/auth/perfil', { nombres: 'Luz', apellidos: 'Mora', grado_numero: 10, grupo_numero: 2 });
        assert.equal(r.estado, 200);
        assert.equal(r.datos.perfil.grado_numero, 10); assert.equal(r.datos.perfil.grupo.nombre, '10-2');
        // Cambia de grado (antes solo lo podía hacer un administrador)
        r = await c.put('/api/auth/perfil', { nombres: 'Luz', apellidos: 'Mora', grado_numero: 11, grupo_numero: 3 });
        assert.equal(r.estado, 200);
        assert.equal(r.datos.perfil.grado_numero, 11); assert.equal(r.datos.perfil.grupo.nombre, '11-3');
        assert.equal((await db.query('SELECT COUNT(*) AS n FROM matriculas m JOIN usuarios u ON u.id = m.estudiante_id WHERE u.correo = ?', [`${P}luz@t.co`]))[0][0].n, 1, 'una sola matrícula');
        // Cambiar solo el nombre no lo saca de su grupo
        r = await c.put('/api/auth/perfil', { nombres: 'Luz Maria', apellidos: 'Mora' });
        assert.equal(r.datos.perfil.grupo.nombre, '11-3');
        assert.equal((await c.put('/api/auth/perfil', { nombres: 'Luz', apellidos: 'Mora', grado_numero: 99 })).estado, 400);
    } finally {
        await db.query(`DELETE FROM usuarios WHERE correo = '${P}luz@t.co'`);
        for (const g of (await db.query("SELECT id FROM grupos WHERE nombre IN ('10-2', '11-3', '11-1')"))[0]) {
            if (!antes.has(g.id) && g.id) await db.query('DELETE FROM grupos WHERE id = ? AND NOT EXISTS (SELECT 1 FROM matriculas WHERE grupo_id = grupos.id)', [g.id]);
        }
    }
});
