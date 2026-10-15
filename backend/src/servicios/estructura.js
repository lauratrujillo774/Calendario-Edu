// Estructura académica: grados → materias (pensum) → grupos → estudiantes.
import { connection } from '../config/mysql/dbmysql.js';
import { ErrorHttp } from '../utils/validar.js';

export const edadDe = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const n = new Date(`${fechaNacimiento}T00:00:00Z`);
    const hoy = new Date();
    let edad = hoy.getUTCFullYear() - n.getUTCFullYear();
    if (hoy.getUTCMonth() < n.getUTCMonth() || (hoy.getUTCMonth() === n.getUTCMonth() && hoy.getUTCDate() < n.getUTCDate())) edad--;
    return edad;
};

// ---------- Grado y grupo por número ----------
// Los grupos se llaman "<grado>-<número>": 11-1, 11-2… (Transición usa "T"). Se crean solos si todavía no existen.
export async function gradoPorNumero(numero) {
    const n = Number(numero);
    if (!Number.isInteger(n) || n < 0 || n > 11) throw new ErrorHttp(400, 'El grado debe ser un número de 0 (Transición) a 11.');
    const [[g]] = await connection.query('SELECT id, nombre, orden FROM grados WHERE orden = ?', [n]);
    if (!g) throw new ErrorHttp(400, `No existe el grado ${n}.`);
    return g;
}
// "11-2" → 2 (si el nombre no tiene ese formato, null)
export const numeroDeGrupo = (nombre) => { const m = /-(\d{1,2})$/.exec(String(nombre)); return m ? Number(m[1]) : null; };
export const prefijoGrado =(grado) => (grado.orden > 0 ? String(grado.orden) : 'T');
export async function asegurarGrupo(gradoId, numero) {
    const n = Number(numero);
    if (!Number.isInteger(n) || n < 1 || n > 30) throw new ErrorHttp(400, 'El grupo debe ser un número de 1 a 30.');
    const [[grado]] = await connection.query('SELECT id, nombre, orden FROM grados WHERE id = ?', [gradoId]);
    if (!grado) throw new ErrorHttp(400, 'El grado no existe.');
    const nombre = `${prefijoGrado(grado)}-${n}`;
    const [[existente]] = await connection.query('SELECT id, grado_id FROM grupos WHERE nombre = ? AND anio = YEAR(CURDATE())', [nombre]);
    if (existente) {
        if (existente.grado_id !== gradoId) await connection.query('UPDATE grupos SET grado_id = ? WHERE id = ?', [gradoId, existente.id]);
        return existente.id;
    }
    const [r] = await connection.query('INSERT INTO grupos (nombre, grado_id, anio) VALUES (?, ?, YEAR(CURDATE()))', [nombre, gradoId]);
    return r.insertId;
}
// Matricula al estudiante en un grado: elige (o crea) el grupo, deja una sola matrícula y guarda el grado en su perfil
export async function matricularEnGrado(estudianteId, gradoId, grupoId = null) {
    const [[grado]] = await connection.query('SELECT id, nombre, orden FROM grados WHERE id = ?', [gradoId]);
    if (!grado) throw new ErrorHttp(400, 'El grado no existe.');
    let grupo = null;
    if (grupoId) {
        [[grupo]] = await connection.query('SELECT id FROM grupos WHERE id = ? AND grado_id = ?', [grupoId, gradoId]);
        if (!grupo) throw new ErrorHttp(400, 'Ese grupo no pertenece al grado elegido.');
    } else {
        // Si ya está matriculado en un grupo de ese grado, se queda donde está
        [[grupo]] = await connection.query('SELECT g.id FROM matriculas mt JOIN grupos g ON g.id = mt.grupo_id WHERE mt.estudiante_id = ? AND g.grado_id = ? ORDER BY g.anio DESC LIMIT 1', [estudianteId, gradoId]);
        if (!grupo) [[grupo]] = await connection.query('SELECT id FROM grupos WHERE grado_id = ? ORDER BY anio DESC, nombre LIMIT 1', [gradoId]);
        if (!grupo) {
            const nombre = `${prefijoGrado(grado)}-1`;
            const [r] = await connection.query('INSERT INTO grupos (nombre, grado_id, anio) VALUES (?, ?, YEAR(CURDATE()))', [nombre, gradoId]);
            grupo = { id: r.insertId };
        }
    }
    await connection.query('DELETE FROM matriculas WHERE estudiante_id = ? AND grupo_id <> ?', [estudianteId, grupo.id]);
    await connection.query('INSERT IGNORE INTO matriculas (estudiante_id, grupo_id) VALUES (?, ?)', [estudianteId, grupo.id]);
    await connection.query('UPDATE usuarios SET grado_id = ? WHERE id = ?', [gradoId, estudianteId]);
    return grupo.id;
}

// Perfil completo de una persona (lo usan "Configuración" y las pantallas del administrador)
export async function perfilCompleto(usuarioId) {
    const [[u]] = await connection.query(
        `SELECT u.id, u.nombre, u.nombres, u.apellidos, u.correo, u.identificacion, u.fecha_nacimiento, u.grado_id, u.activo, u.notif_correo, (u.foto IS NOT NULL) AS tiene_foto, (u.contrasena_hash = 'GOOGLE') AS solo_google,
                r.nombre AS rol, gr.nombre AS grado, gr.orden AS grado_numero
         FROM usuarios u JOIN roles r ON r.id = u.rol_id LEFT JOIN grados gr ON gr.id = u.grado_id WHERE u.id = ?`, [usuarioId]);
    if (!u) return null;
    const perfil = { ...u, activo: Boolean(u.activo), notif_correo: Boolean(u.notif_correo), tiene_foto: Boolean(u.tiene_foto), solo_google: Boolean(u.solo_google), edad: edadDe(u.fecha_nacimiento) };
    if (u.rol === 'estudiante') {
        const [[g]] = await connection.query(
            `SELECT g.id, g.nombre FROM matriculas mt JOIN grupos g ON g.id = mt.grupo_id WHERE mt.estudiante_id = ? ORDER BY g.anio DESC LIMIT 1`, [usuarioId]);
        perfil.grupo = g ?? null;
        perfil.grupo_numero = g ? numeroDeGrupo(g.nombre) : null;
        // Materias del grado (pensum) más las que el propio estudiante registró (`propia` = se puede quitar)
        perfil.materias = (await connection.query(
            `SELECT m.id, m.nombre, m.color, (em.materia_id IS NOT NULL AND gm.materia_id IS NULL) AS propia,
                    (SELECT GROUP_CONCAT(DISTINCT p.nombre ORDER BY p.nombre SEPARATOR ', ') FROM asignaciones a JOIN usuarios p ON p.id = a.profesor_id
                      WHERE a.materia_id = m.id AND a.grupo_id = ?) AS docentes
             FROM materias m
             LEFT JOIN grado_materias gm ON gm.materia_id = m.id AND gm.grado_id = ?
             LEFT JOIN estudiante_materias em ON em.materia_id = m.id AND em.usuario_id = ?
             WHERE gm.materia_id IS NOT NULL OR em.materia_id IS NOT NULL ORDER BY m.nombre`, [g?.id ?? 0, u.grado_id ?? 0, usuarioId]))[0]
            .map((m) => ({ ...m, propia: Boolean(m.propia) }));
    }
    return perfil;
}
