// Tareas, exámenes y eventos PERSONALES (privados). Completarlos o ponerles nota NO modifica ninguna actividad oficial.
// Un examen propio marcado como "presentado" puede llevar su nota (0.0 a 5.0) y la materia: así el estudiante lleva su registro.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { tareaAutorizada } from '../../servicios/permisos.js';
import { ErrorHttp, texto, entero, fecha, hora, opcion, booleano, PRIORIDADES } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

const TIPOS_PENDIENTE = ['tarea', 'examen', 'evento'];

function notaValida(valor) {
    if (valor === undefined || valor === null || valor === '') return null;
    const n = Number(String(valor).replace(',', '.'));
    if (Number.isNaN(n) || n < 0 || n > 5) throw new ErrorHttp(400, 'La nota debe ser un número entre 0.0 y 5.0.');
    return Math.round(n * 10) / 10;
}

async function materiaValida(valor) {
    const id = entero(valor, 'La materia', { requerido: false });
    if (!id) return null;
    const [[m]] = await connection.query('SELECT id FROM materias WHERE id = ?', [id]);
    if (!m) throw new ErrorHttp(400, 'La materia no existe.');
    return id;
}

async function datos(u, b) {
    const tareaId = entero(b.tarea_id, 'La tarea', { requerido: false });
    if (tareaId) await tareaAutorizada(u, tareaId);
    return [
        texto(b.titulo, 'El título', { max: 150 }), texto(b.descripcion, 'La descripción', { max: 3000, requerido: false }),
        opcion(b.tipo, 'El tipo', TIPOS_PENDIENTE, { porDefecto: 'tarea' }),
        fecha(b.fecha_limite, 'La fecha', { requerido: false }), hora(b.hora, 'La hora', { requerido: false }),
        opcion(b.prioridad, 'La prioridad', PRIORIDADES, { porDefecto: 'media' }), tareaId,
        await materiaValida(b.materia_id), notaValida(b.nota),
    ];
}

router.get('/', async (req, res) => {
    const params = [req.usuario.id];
    let extra = '';
    const estado = opcion(req.query.estado, 'El estado', ['pendiente', 'completada'], { requerido: false });
    if (estado === 'pendiente') extra += ' AND p.completado = 0';
    if (estado === 'completada') extra += ' AND p.completado = 1';
    const prioridad = opcion(req.query.prioridad, 'La prioridad', PRIORIDADES, { requerido: false });
    if (prioridad) { extra += ' AND p.prioridad = ?'; params.push(prioridad); }
    const tipo = opcion(req.query.tipo, 'El tipo', TIPOS_PENDIENTE, { requerido: false });
    if (tipo) { extra += ' AND p.tipo = ?'; params.push(tipo); }
    const materiaId = entero(req.query.materia_id, 'La materia', { requerido: false });
    if (materiaId) { extra += ' AND p.materia_id = ?'; params.push(materiaId); }
    if (booleano(req.query.con_nota)) extra += ' AND p.nota IS NOT NULL';
    const q = texto(req.query.q, 'La búsqueda', { max: 100, requerido: false });
    if (q) { extra += ' AND p.titulo LIKE ?'; params.push(`%${q}%`); }
    const limite = Math.min(300, entero(req.query.limite, 'El límite', { requerido: false }) ?? 200);
    const [filas] = await connection.query(
        `SELECT p.id, p.titulo, p.descripcion, p.tipo, p.fecha_limite, p.hora, p.prioridad, p.completado, p.completado_en, p.tarea_id,
                p.materia_id, p.nota, mat.nombre AS materia, mat.color, t.titulo AS tarea, p.creado_en,
                (p.completado = 0 AND p.fecha_limite < CURDATE()) AS vencido
         FROM pendientes_personales p LEFT JOIN tareas t ON t.id = p.tarea_id LEFT JOIN materias mat ON mat.id = p.materia_id
         WHERE p.usuario_id = ?${extra}
         ORDER BY p.completado ASC, p.fecha_limite IS NULL, p.fecha_limite ASC, p.hora ASC, p.id DESC LIMIT ?`, [...params, limite]);
    res.json({ items: filas.map((p) => ({ ...p, completado: Boolean(p.completado), vencido: Boolean(p.vencido) })) });
});

router.post('/', async (req, res) => {
    const d = await datos(req.usuario, req.body ?? {});
    const presentado = d[8] !== null; // con nota ya se considera presentado
    const [r] = await connection.query(
        `INSERT INTO pendientes_personales (usuario_id, titulo, descripcion, tipo, fecha_limite, hora, prioridad, tarea_id, materia_id, nota, completado, completado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${presentado ? 'NOW()' : 'NULL'})`,
        [req.usuario.id, ...d, presentado ? 1 : 0]);
    res.status(201).json({ id: r.insertId });
});

router.put('/:id', async (req, res) => {
    const id = entero(req.params.id, 'El pendiente');
    const d = await datos(req.usuario, req.body ?? {});
    const [r] = await connection.query(
        `UPDATE pendientes_personales SET titulo = ?, descripcion = ?, tipo = ?, fecha_limite = ?, hora = ?, prioridad = ?, tarea_id = ?, materia_id = ?, nota = ?,
                completado = IF(? IS NOT NULL, 1, completado), completado_en = IF(? IS NOT NULL AND completado_en IS NULL, NOW(), completado_en)
         WHERE id = ? AND usuario_id = ?`, [...d, d[8], d[8], id, req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'El pendiente no existe.');
    res.json({ ok: true });
});

router.patch('/:id/completar', async (req, res) => {
    const id = entero(req.params.id, 'El pendiente');
    const completado = booleano(req.body?.completado) ? 1 : 0;
    const [r] = await connection.query(
        `UPDATE pendientes_personales SET completado = ?, completado_en = ${completado ? 'NOW()' : 'NULL'}
         WHERE id = ? AND usuario_id = ?`, [completado, id, req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'El pendiente no existe.');
    res.json({ completado: Boolean(completado) });
});

// "Presentado": marca el examen/tarea propio como hecho y, opcionalmente, registra o corrige su nota (y la materia)
router.patch('/:id/presentado', async (req, res) => {
    const id = entero(req.params.id, 'El pendiente');
    const presentado = booleano(req.body?.presentado);
    const nota = presentado ? notaValida(req.body?.nota) : null;
    const materiaId = req.body?.materia_id !== undefined ? await materiaValida(req.body.materia_id) : undefined;
    const [r] = await connection.query(
        `UPDATE pendientes_personales SET completado = ?, completado_en = ${presentado ? 'COALESCE(completado_en, NOW())' : 'NULL'}, nota = ?
         ${materiaId !== undefined ? ', materia_id = ?' : ''} WHERE id = ? AND usuario_id = ?`,
        [presentado ? 1 : 0, nota, ...(materiaId !== undefined ? [materiaId] : []), id, req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'El pendiente no existe.');
    res.json({ presentado, nota });
});

// Quita todos los pendientes ya completados del usuario (conserva los que tienen nota: son su registro de calificaciones)
router.delete('/completados', async (req, res) => {
    const [r] = await connection.query('DELETE FROM pendientes_personales WHERE usuario_id = ? AND completado = 1 AND nota IS NULL', [req.usuario.id]);
    res.json({ eliminados: r.affectedRows });
});

router.delete('/:id', async (req, res) => {
    const [r] = await connection.query('DELETE FROM pendientes_personales WHERE id = ? AND usuario_id = ?',
        [entero(req.params.id, 'El pendiente'), req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'El pendiente no existe.');
    res.json({ ok: true });
});

export default router;
