// Reglas de acceso a los datos. TODA consulta de tareas/entregas/eventos pasa por aquí,
// así el servidor decide qué puede ver o modificar cada rol (no el navegador).
import { connection } from '../config/mysql/dbmysql.js';
import { ErrorHttp } from '../utils/validar.js';

const DESDE_TAREA = `
    FROM tareas t
    JOIN asignaciones a ON a.id = t.asignacion_id
    JOIN materias m ON m.id = a.materia_id
    JOIN grupos g ON g.id = a.grupo_id
    LEFT JOIN grados gr ON gr.id = g.grado_id
    JOIN usuarios p ON p.id = a.profesor_id`;

const COLUMNAS_TAREA = `
    t.id, t.titulo, t.descripcion, t.tipo, t.prioridad, t.fecha_limite, t.hora_limite,
    t.archivo_url, t.publicada, t.creado_en, t.actualizado_en,
    a.id AS asignacion_id, a.profesor_id, p.nombre AS profesor,
    m.id AS materia_id, m.nombre AS materia, m.color,
    g.id AS grupo_id, g.nombre AS grupo, g.grado_id, gr.nombre AS grado_nombre`;

const ESTUDIANTES_DEL_GRUPO = `
    JOIN matriculas mt ON mt.estudiante_id = e.estudiante_id AND mt.grupo_id = a.grupo_id`;

// ¿Quién es el "dueño" de las tareas que verá este usuario?
export function esAdmin(u) { return u.rol === 'admin'; }
export function esProfesor(u) { return u.rol === 'profesor'; }
export function esEstudiante(u) { return u.rol === 'estudiante'; }

// Construye la consulta de tareas según el rol. Devuelve { select, from, where, params }.
export function consultaTareas(u, f = {}) {
    const donde = [];
    const params = [];
    let select;
    let desde;

    if (esEstudiante(u)) {
        // Solo tareas PUBLICADAS de los grupos en los que está matriculado y que tienen entrega a su nombre
        select = `${COLUMNAS_TAREA},
            e.id AS entrega_id, e.estado, e.calificacion, e.fecha_entrega, e.calificado_en,
            e.comentario_profesor, e.comentario AS comentario_estudiante, e.archivo_nombre AS entrega_archivo,
            (e.estado = 'pendiente' AND TIMESTAMP(t.fecha_limite, t.hora_limite) < NOW()) AS vencida`;
        desde = `FROM entregas e
            JOIN tareas t ON t.id = e.tarea_id AND t.publicada = 1
            JOIN asignaciones a ON a.id = t.asignacion_id
            JOIN matriculas mt ON mt.estudiante_id = e.estudiante_id AND mt.grupo_id = a.grupo_id
            JOIN materias m ON m.id = a.materia_id
            JOIN grupos g ON g.id = a.grupo_id
            LEFT JOIN grados gr ON gr.id = g.grado_id
            JOIN usuarios p ON p.id = a.profesor_id`;
        donde.push('e.estudiante_id = ?');
        params.push(u.id);
        if (f.estado === 'vencida') donde.push("e.estado = 'pendiente' AND TIMESTAMP(t.fecha_limite, t.hora_limite) < NOW()");
        else if (['pendiente', 'entregada', 'calificada'].includes(f.estado)) {
            donde.push('e.estado = ?');
            params.push(f.estado);
        }
    } else {
        const cuenta = (condicion) => `(SELECT COUNT(*) FROM entregas e ${ESTUDIANTES_DEL_GRUPO} WHERE e.tarea_id = t.id ${condicion})`;
        select = `${COLUMNAS_TAREA},
            ${cuenta('')} AS total_estudiantes,
            ${cuenta("AND e.estado = 'pendiente'")} AS pendientes,
            ${cuenta("AND e.estado = 'entregada'")} AS entregadas,
            ${cuenta("AND e.estado = 'calificada'")} AS calificadas`;
        desde = DESDE_TAREA;
        if (esProfesor(u)) {
            donde.push('a.profesor_id = ?');
            params.push(u.id);
        }
        if (f.estado === 'borrador') donde.push('t.publicada = 0');
        else if (f.estado === 'publicada') donde.push('t.publicada = 1');
    }

    if (f.desde) { donde.push('t.fecha_limite >= ?'); params.push(f.desde); }
    if (f.hasta) { donde.push('t.fecha_limite <= ?'); params.push(f.hasta); }
    if (f.tarea_id) { donde.push('t.id = ?'); params.push(f.tarea_id); }
    if (f.materia_id) { donde.push('a.materia_id = ?'); params.push(f.materia_id); }
    if (f.grupo_id) { donde.push('a.grupo_id = ?'); params.push(f.grupo_id); }
    if (f.grado_id) { donde.push('g.grado_id = ?'); params.push(f.grado_id); }
    if (f.asignacion_id) { donde.push('a.id = ?'); params.push(f.asignacion_id); }
    if (f.tipo) { donde.push('t.tipo = ?'); params.push(f.tipo); }
    if (f.prioridad) { donde.push('t.prioridad = ?'); params.push(f.prioridad); }
    if (f.q) { donde.push('t.titulo LIKE ?'); params.push(`%${f.q}%`); }

    return { select, desde, donde: donde.length ? donde.join(' AND ') : '1 = 1', params };
}

export async function listarTareas(u, filtros = {}, { limite = 200, desplazamiento = 0 } = {}) {
    const c = consultaTareas(u, filtros);
    const sql = `SELECT ${c.select} ${c.desde} WHERE ${c.donde}
                 ORDER BY t.fecha_limite ASC, t.hora_limite ASC, t.id ASC LIMIT ? OFFSET ?`;
    const [filas] = await connection.query(sql, [...c.params, limite, desplazamiento]);
    const [[{ total }]] = await connection.query(`SELECT COUNT(*) AS total ${c.desde} WHERE ${c.donde}`, c.params);
    return { filas, total };
}

// Devuelve la tarea si el usuario puede verla; 404 si no existe, 403 si no tiene permiso.
// Con { gestion: true } exige además poder modificarla (su profesor o el administrador).
export async function tareaAutorizada(u, tareaId, { gestion = false } = {}) {
    const [filas] = await connection.query(`SELECT ${COLUMNAS_TAREA} ${DESDE_TAREA} WHERE t.id = ?`, [tareaId]);
    const tarea = filas[0];
    if (!tarea) throw new ErrorHttp(404, 'La tarea no existe.');
    if (esAdmin(u)) return tarea;
    if (esProfesor(u)) {
        if (tarea.profesor_id === u.id) return tarea;
        throw new ErrorHttp(403, 'Esta tarea no pertenece a tus materias.');
    }
    if (gestion) throw new ErrorHttp(403, 'Solo el profesor puede modificar las tareas.');
    const [[matricula]] = await connection.query(
        'SELECT 1 AS ok FROM matriculas WHERE estudiante_id = ? AND grupo_id = ?', [u.id, tarea.grupo_id]);
    if (!tarea.publicada || !matricula) throw new ErrorHttp(403, 'No tienes acceso a esta tarea.');
    return tarea;
}

// Asignaciones (materia + grupo + profesor) que el usuario puede ver/usar
export async function asignacionesDe(u) {
    let sql = `SELECT a.id, a.profesor_id, p.nombre AS profesor, m.id AS materia_id, m.nombre AS materia, m.color,
                      g.id AS grupo_id, g.nombre AS grupo, g.grado_id, gr.nombre AS grado
               FROM asignaciones a
               JOIN materias m ON m.id = a.materia_id
               JOIN grupos g ON g.id = a.grupo_id
               LEFT JOIN grados gr ON gr.id = g.grado_id
               JOIN usuarios p ON p.id = a.profesor_id`;
    const params = [];
    if (esProfesor(u)) { sql += ' WHERE a.profesor_id = ?'; params.push(u.id); }
    else if (esEstudiante(u)) {
        sql += ' WHERE a.grupo_id IN (SELECT grupo_id FROM matriculas WHERE estudiante_id = ?)';
        params.push(u.id);
    }
    sql += ' ORDER BY g.nombre, m.nombre';
    return (await connection.query(sql, params))[0];
}

// Filtro SQL de eventos/avisos visibles. `alias` es el alias de la tabla y `autor` su columna de creador.
export function filtroVisibilidadGrupo(u, alias, autor) {
    if (esAdmin(u)) return { sql: '1 = 1', params: [] };
    if (esProfesor(u)) {
        return {
            sql: `(${alias}.grupo_id IS NULL OR ${alias}.${autor} = ? OR
                   ${alias}.grupo_id IN (SELECT grupo_id FROM asignaciones WHERE profesor_id = ?))`,
            params: [u.id, u.id],
        };
    }
    return {
        sql: `(${alias}.grupo_id IS NULL OR ${alias}.grupo_id IN (SELECT grupo_id FROM matriculas WHERE estudiante_id = ?))`,
        params: [u.id],
    };
}

// ¿Puede el usuario publicar contenido para este grupo? (admin: todos; profesor: grupos donde enseña)
export async function puedeGestionarGrupo(u, grupoId) {
    if (esAdmin(u)) return true;
    if (!esProfesor(u)) return false;
    const [[fila]] = await connection.query(
        'SELECT 1 AS ok FROM asignaciones WHERE profesor_id = ? AND grupo_id = ? LIMIT 1', [u.id, grupoId]);
    return Boolean(fila);
}

// Recorta un texto largo para listas
export const acortar = (s, n = 160) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);
