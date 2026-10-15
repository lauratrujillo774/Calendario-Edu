import { Router } from 'express';
import fileUpload from 'express-fileupload';
import fs from 'node:fs';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion, requiereRol } from '../../middleware/sesion.js';
import { tareaAutorizada, puedeGestionarGrupo, asignacionesDe, esAdmin, esProfesor, esEstudiante } from '../../servicios/permisos.js';
import { guardarArchivo, borrarArchivo, rutaAbsoluta, MAX_BYTES } from '../../utils/archivos.js';
import { ErrorHttp, texto, entero } from '../../utils/validar.js';
import { entregaRecibida, calificacionPublicada } from '../../servicios/notificaciones.js';

const router = Router();
router.use(requiereSesion);

const subida = fileUpload({ limits: { fileSize: MAX_BYTES }, abortOnLimit: false });

// Estudiante: entregar (o volver a entregar, mientras no esté calificada) una tarea
router.post('/tarea/:tareaId', requiereRol('estudiante'), subida, async (req, res) => {
    const tareaId = entero(req.params.tareaId, 'La tarea');
    await tareaAutorizada(req.usuario, tareaId); // 403 si no es de su grupo o no está publicada
    const comentario = texto(req.body?.comentario, 'El comentario', { max: 500, requerido: false });

    await connection.query('INSERT IGNORE INTO entregas (tarea_id, estudiante_id) VALUES (?, ?)', [tareaId, req.usuario.id]);
    const [[entrega]] = await connection.query(
        'SELECT id, estado, archivo_url FROM entregas WHERE tarea_id = ? AND estudiante_id = ?', [tareaId, req.usuario.id]);
    if (entrega.estado === 'calificada') throw new ErrorHttp(400, 'Esta entrega ya fue calificada y no se puede modificar.');

    let archivoUrl = entrega.archivo_url;
    let archivoNombre;
    if (req.files?.archivo) {
        const { ruta, nombre } = await guardarArchivo(req.files.archivo, 'entregas');
        await borrarArchivo(entrega.archivo_url);
        archivoUrl = ruta;
        archivoNombre = nombre;
    }
    if (!comentario && !archivoUrl) throw new ErrorHttp(400, 'Escribe un comentario o adjunta un archivo para entregar.');
    await connection.query(
        `UPDATE entregas SET estado = 'entregada', fecha_entrega = NOW(), comentario = ?, archivo_url = ?,
                archivo_nombre = COALESCE(?, archivo_nombre) WHERE id = ?`,
        [comentario, archivoUrl, archivoNombre ?? null, entrega.id]
    );
    await entregaRecibida(entrega.id); // avisa al docente en su campanita
    res.json({ ok: true });
});

// Profesor/admin: estado de entrega de TODOS los estudiantes del grupo para una tarea
router.get('/tarea/:tareaId', requiereRol('profesor', 'admin'), async (req, res) => {
    const tareaId = entero(req.params.tareaId, 'La tarea');
    const tarea = await tareaAutorizada(req.usuario, tareaId, { gestion: true });
    const [filas] = await connection.query(
        `SELECT u.id AS estudiante_id, u.nombre, u.correo, e.id AS entrega_id,
                COALESCE(e.estado, 'pendiente') AS estado, e.fecha_entrega, e.comentario,
                e.archivo_nombre, (e.archivo_url IS NOT NULL) AS tiene_archivo,
                e.calificacion, e.comentario_profesor, e.calificado_en
         FROM matriculas mt
         JOIN usuarios u ON u.id = mt.estudiante_id
         LEFT JOIN entregas e ON e.estudiante_id = u.id AND e.tarea_id = ?
         WHERE mt.grupo_id = ? ORDER BY u.nombre`,
        [tareaId, tarea.grupo_id]
    );
    res.json({ tarea: { id: tarea.id, titulo: tarea.titulo, materia: tarea.materia, grupo: tarea.grupo }, entregas: filas });
});

// Profesor/admin: cola de entregas esperando calificación (las más antiguas primero)
router.get('/por-calificar', requiereRol('profesor', 'admin'), async (req, res) => {
    let filtroProfe = esProfesor(req.usuario) ? 'AND a.profesor_id = ?' : '';
    const params = esProfesor(req.usuario) ? [req.usuario.id] : [];
    // Filtros por materia, grado y grupo
    for (const [campo, columna, nombre] of [['materia_id', 'a.materia_id', 'La materia'], ['grado_id', 'g.grado_id', 'El grado'], ['grupo_id', 'a.grupo_id', 'El grupo']]) {
        const v = entero(req.query[campo], nombre, { requerido: false });
        if (v) { filtroProfe += ` AND ${columna} = ?`; params.push(v); }
    }
    const [filas] = await connection.query(
        `SELECT e.id AS entrega_id, e.fecha_entrega, e.comentario, e.archivo_nombre, (e.archivo_url IS NOT NULL) AS tiene_archivo,
                u.id AS estudiante_id, u.nombre AS estudiante, t.id AS tarea_id, t.titulo, t.tipo, t.fecha_limite, t.hora_limite,
                m.nombre AS materia, m.color, g.nombre AS grupo, g.grado_id,
                (e.fecha_entrega > TIMESTAMP(t.fecha_limite, t.hora_limite)) AS tardia
         FROM entregas e
         JOIN tareas t ON t.id = e.tarea_id AND t.publicada = 1
         JOIN asignaciones a ON a.id = t.asignacion_id
         JOIN matriculas mt ON mt.estudiante_id = e.estudiante_id AND mt.grupo_id = a.grupo_id
         JOIN usuarios u ON u.id = e.estudiante_id
         JOIN materias m ON m.id = a.materia_id
         JOIN grupos g ON g.id = a.grupo_id
         WHERE e.estado = 'entregada' ${filtroProfe}
         ORDER BY e.fecha_entrega ASC LIMIT 300`, params);
    res.json({ items: filas.map((f) => ({ ...f, tardia: Boolean(f.tardia), tiene_archivo: Boolean(f.tiene_archivo) })) });
});

// Profesor/admin: libro de calificaciones de una materia+grupo (estudiantes × actividades publicadas)
router.get('/libro', requiereRol('profesor', 'admin'), async (req, res) => {
    const asignacionId = entero(req.query.asignacion_id, 'La materia y grupo');
    const asignacion = (await asignacionesDe(req.usuario)).find((a) => a.id === asignacionId);
    if (!asignacion) throw new ErrorHttp(403, 'No tienes acceso a esa materia y grupo.');
    const [tareas] = await connection.query(
        'SELECT id, titulo, tipo, fecha_limite FROM tareas WHERE asignacion_id = ? AND publicada = 1 ORDER BY fecha_limite, id', [asignacionId]);
    const [estudiantes] = await connection.query(
        `SELECT u.id, u.nombre FROM matriculas mt JOIN usuarios u ON u.id = mt.estudiante_id WHERE mt.grupo_id = ? ORDER BY u.nombre`, [asignacion.grupo_id]);
    const [entregas] = await connection.query(
        `SELECT e.id, e.tarea_id, e.estudiante_id, e.estado, e.calificacion FROM entregas e
         JOIN tareas t ON t.id = e.tarea_id WHERE t.asignacion_id = ? AND t.publicada = 1`, [asignacionId]);
    const celdas = new Map(entregas.map((e) => [`${e.estudiante_id}-${e.tarea_id}`, e]));
    const promedio = (notas) => (notas.length ? Math.round((notas.reduce((a, n) => a + n, 0) / notas.length) * 10) / 10 : null);
    res.json({
        asignacion, tareas,
        estudiantes: estudiantes.map((est) => {
            const fila = tareas.map((t) => {
                const e = celdas.get(`${est.id}-${t.id}`);
                return { tarea_id: t.id, entrega_id: e?.id ?? null, estado: e?.estado ?? 'pendiente', calificacion: e?.calificacion ?? null };
            });
            return { ...est, celdas: fila, promedio: promedio(fila.filter((c) => c.calificacion != null).map((c) => c.calificacion)) };
        }),
        promedios_tarea: tareas.map((t) => promedio(entregas.filter((e) => e.tarea_id === t.id && e.calificacion != null).map((e) => e.calificacion))),
    });
});

// Profesor/admin: estudiantes de un grupo con su avance en las tareas publicadas (de este profesor, o todas si es admin)
router.get('/grupo/:id', requiereRol('profesor', 'admin'), async (req, res) => {
    const grupoId = entero(req.params.id, 'El grupo');
    if (!(await puedeGestionarGrupo(req.usuario, grupoId))) throw new ErrorHttp(403, 'No tienes acceso a ese grupo.');
    const filtroProfe = esProfesor(req.usuario) ? 'AND a.profesor_id = ?' : '';
    const params = esProfesor(req.usuario) ? [grupoId, req.usuario.id, grupoId] : [grupoId, grupoId];
    const [filas] = await connection.query(
        `SELECT u.id, u.nombre, u.correo, COUNT(x.tarea_id) AS total,
                COALESCE(SUM(x.estado = 'pendiente'), 0) AS pendientes,
                COALESCE(SUM(x.estado = 'entregada'), 0) AS entregadas,
                COALESCE(SUM(x.estado = 'calificada'), 0) AS calificadas, AVG(x.calificacion) AS promedio
         FROM matriculas mt
         JOIN usuarios u ON u.id = mt.estudiante_id
         LEFT JOIN (
             SELECT e.estudiante_id, e.tarea_id, e.estado, e.calificacion
             FROM entregas e JOIN tareas t ON t.id = e.tarea_id AND t.publicada = 1
             JOIN asignaciones a ON a.id = t.asignacion_id AND a.grupo_id = ? ${filtroProfe}
         ) x ON x.estudiante_id = u.id
         WHERE mt.grupo_id = ? GROUP BY u.id, u.nombre, u.correo ORDER BY u.nombre`,
        params
    );
    const [[grupo]] = await connection.query('SELECT id, nombre, anio FROM grupos WHERE id = ?', [grupoId]);
    res.json({ grupo, estudiantes: filas.map((f) => ({ ...f, promedio: f.promedio == null ? null : Math.round(f.promedio * 10) / 10 })) });
});

// Profesor/admin: seguimiento de un estudiante (solo sus tareas, o todas si es admin)
router.get('/estudiante/:id', requiereRol('profesor', 'admin'), async (req, res) => {
    const estudianteId = entero(req.params.id, 'El estudiante');
    const [[estudiante]] = await connection.query(
        `SELECT u.id, u.nombre, u.correo FROM usuarios u JOIN roles r ON r.id = u.rol_id
         WHERE u.id = ? AND r.nombre = 'estudiante'`, [estudianteId]);
    if (!estudiante) throw new ErrorHttp(404, 'El estudiante no existe.');

    const filtroProfe = esProfesor(req.usuario) ? 'AND a.profesor_id = ?' : '';
    const params = esProfesor(req.usuario) ? [estudianteId, req.usuario.id] : [estudianteId];
    const [filas] = await connection.query(
        `SELECT t.id AS tarea_id, t.titulo, t.tipo, t.fecha_limite, t.hora_limite, t.publicada,
                m.nombre AS materia, m.color, g.nombre AS grupo,
                e.id AS entrega_id, e.estado, e.fecha_entrega, e.calificacion, e.comentario_profesor
         FROM entregas e
         JOIN tareas t ON t.id = e.tarea_id
         JOIN asignaciones a ON a.id = t.asignacion_id
         JOIN matriculas mt ON mt.estudiante_id = e.estudiante_id AND mt.grupo_id = a.grupo_id
         JOIN materias m ON m.id = a.materia_id
         JOIN grupos g ON g.id = a.grupo_id
         WHERE e.estudiante_id = ? ${filtroProfe}
         ORDER BY t.fecha_limite DESC, t.id DESC`,
        params
    );
    if (esProfesor(req.usuario) && !filas.length) {
        const [[ok]] = await connection.query(
            `SELECT 1 AS ok FROM matriculas mt JOIN asignaciones a ON a.grupo_id = mt.grupo_id
             WHERE mt.estudiante_id = ? AND a.profesor_id = ? LIMIT 1`, [estudianteId, req.usuario.id]);
        if (!ok) throw new ErrorHttp(403, 'Ese estudiante no pertenece a tus grupos.');
    }
    res.json({ estudiante, entregas: filas });
});

// Profesor/admin: calificar y dejar retroalimentación
router.put('/:id/calificar', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'La entrega');
    const [[entrega]] = await connection.query('SELECT id, tarea_id FROM entregas WHERE id = ?', [id]);
    if (!entrega) throw new ErrorHttp(404, 'La entrega no existe.');
    await tareaAutorizada(req.usuario, entrega.tarea_id, { gestion: true });

    const nota = Number(String(req.body?.calificacion ?? '').replace(',', '.'));
    if (req.body?.calificacion === '' || req.body?.calificacion == null || Number.isNaN(nota) || nota < 0 || nota > 5) {
        throw new ErrorHttp(400, 'La calificación debe ser un número entre 0 y 5.');
    }
    const comentario = texto(req.body?.comentario_profesor, 'El comentario', { max: 1000, requerido: false });
    await connection.query(
        `UPDATE entregas SET estado = 'calificada', calificacion = ?, comentario_profesor = ?, calificado_en = NOW() WHERE id = ?`,
        [Math.round(nota * 10) / 10, comentario, id]
    );
    await calificacionPublicada(id); // campanita + correo al estudiante
    res.json({ ok: true });
});

// Profesor/admin: crear la entrega de un estudiante que aún no la tiene (p. ej. se matriculó tarde) y calificarla
router.post('/tarea/:tareaId/estudiante/:estudianteId', requiereRol('profesor', 'admin'), async (req, res) => {
    const tareaId = entero(req.params.tareaId, 'La tarea');
    const estudianteId = entero(req.params.estudianteId, 'El estudiante');
    const tarea = await tareaAutorizada(req.usuario, tareaId, { gestion: true });
    const [[mat]] = await connection.query(
        'SELECT 1 AS ok FROM matriculas WHERE estudiante_id = ? AND grupo_id = ?', [estudianteId, tarea.grupo_id]);
    if (!mat) throw new ErrorHttp(400, 'Ese estudiante no está en el grupo de la tarea.');
    await connection.query('INSERT IGNORE INTO entregas (tarea_id, estudiante_id) VALUES (?, ?)', [tareaId, estudianteId]);
    const [[e]] = await connection.query('SELECT id FROM entregas WHERE tarea_id = ? AND estudiante_id = ?', [tareaId, estudianteId]);
    res.status(201).json({ id: e.id });
});

// Descarga del archivo de una entrega: solo su dueño, el profesor de la tarea o un administrador
router.get('/:id/archivo', async (req, res) => {
    const id = entero(req.params.id, 'La entrega');
    const [[entrega]] = await connection.query(
        'SELECT id, tarea_id, estudiante_id, archivo_url, archivo_nombre FROM entregas WHERE id = ?', [id]);
    if (!entrega) throw new ErrorHttp(404, 'La entrega no existe.');
    if (esEstudiante(req.usuario)) {
        if (entrega.estudiante_id !== req.usuario.id) throw new ErrorHttp(403, 'No tienes acceso a esta entrega.');
    } else if (!esAdmin(req.usuario)) {
        await tareaAutorizada(req.usuario, entrega.tarea_id, { gestion: true });
    }
    if (!entrega.archivo_url) throw new ErrorHttp(404, 'Esta entrega no tiene archivo.');
    const abs = rutaAbsoluta(entrega.archivo_url);
    if (!fs.existsSync(abs)) throw new ErrorHttp(404, 'El archivo ya no está disponible.');
    res.download(abs, entrega.archivo_nombre ?? 'entrega');
});

export default router;
