// Notas personales: privadas, solo las ve y modifica su dueño.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { tareaAutorizada } from '../../servicios/permisos.js';
import { ErrorHttp, texto, entero, fecha, opcion, COLORES_NOTA } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

async function datos(u, b) {
    const tareaId = entero(b.tarea_id, 'La tarea', { requerido: false });
    if (tareaId) await tareaAutorizada(u, tareaId); // solo se puede relacionar con tareas que el usuario ve
    return [
        texto(b.titulo, 'El título', { max: 150 }), texto(b.contenido, 'El contenido', { max: 10000, requerido: false }),
        fecha(b.fecha, 'La fecha', { requerido: false }), opcion(b.color, 'El color', COLORES_NOTA, { requerido: false }), tareaId,
    ];
}

router.get('/', async (req, res) => {
    const params = [req.usuario.id];
    let extra = '';
    const desde = fecha(req.query.desde, 'La fecha inicial', { requerido: false });
    const hasta = fecha(req.query.hasta, 'La fecha final', { requerido: false });
    if (desde) { extra += ' AND n.fecha >= ?'; params.push(desde); }
    if (hasta) { extra += ' AND n.fecha <= ?'; params.push(hasta); }
    const q = texto(req.query.q, 'La búsqueda', { max: 100, requerido: false });
    if (q) { extra += ' AND (n.titulo LIKE ? OR n.contenido LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
    const limite = Math.min(200, entero(req.query.limite, 'El límite', { requerido: false }) ?? 100);
    const [filas] = await connection.query(
        `SELECT n.id, n.titulo, n.contenido, n.fecha, n.color, n.tarea_id, t.titulo AS tarea, n.creado_en, n.actualizado_en
         FROM notas_personales n LEFT JOIN tareas t ON t.id = n.tarea_id
         WHERE n.usuario_id = ?${extra} ORDER BY COALESCE(n.fecha, DATE(n.creado_en)) DESC, n.id DESC LIMIT ?`, [...params, limite]);
    res.json({ items: filas });
});

router.post('/', async (req, res) => {
    const d = await datos(req.usuario, req.body ?? {});
    const [r] = await connection.query(
        'INSERT INTO notas_personales (usuario_id, titulo, contenido, fecha, color, tarea_id) VALUES (?, ?, ?, ?, ?, ?)',
        [req.usuario.id, ...d]);
    res.status(201).json({ id: r.insertId });
});

router.put('/:id', async (req, res) => {
    const id = entero(req.params.id, 'La nota');
    const d = await datos(req.usuario, req.body ?? {});
    // El filtro por usuario_id impide tocar notas ajenas
    const [r] = await connection.query(
        'UPDATE notas_personales SET titulo = ?, contenido = ?, fecha = ?, color = ?, tarea_id = ? WHERE id = ? AND usuario_id = ?',
        [...d, id, req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'La nota no existe.');
    res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
    const [r] = await connection.query('DELETE FROM notas_personales WHERE id = ? AND usuario_id = ?',
        [entero(req.params.id, 'La nota'), req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'La nota no existe.');
    res.json({ ok: true });
});

export default router;
