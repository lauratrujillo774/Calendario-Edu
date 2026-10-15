// Recordatorios: el usuario ESCRIBE qué quiere recordar (o los liga a una tarea/pendiente) y cuándo.
// Cuando llega la hora aparecen en el inicio y en la campanita (y llegan al correo si está configurado).
// "enviado" = 1 significa que el usuario ya lo vio/descartó.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { tareaAutorizada } from '../../servicios/permisos.js';
import { ErrorHttp, entero, fechaHora, opcion, texto } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

router.get('/', async (req, res) => {
    const estado = opcion(req.query.estado, 'El estado', ['activos', 'proximos', 'descartados'], { requerido: false });
    let extra = '';
    // activos = ya llegó la hora y no se ha descartado; proximos = todavía no llega la hora
    if (estado === 'activos') extra = ' AND r.enviado = 0 AND r.avisar_en <= NOW()';
    if (estado === 'proximos') extra = ' AND r.enviado = 0 AND r.avisar_en > NOW()';
    if (estado === 'descartados') extra = ' AND r.enviado = 1';
    const [filas] = await connection.query(
        `SELECT r.id, r.avisar_en, r.enviado, r.tarea_id, r.pendiente_id,
                COALESCE(t.titulo, p.titulo, r.texto) AS titulo, r.texto, t.fecha_limite, t.hora_limite,
                (r.enviado = 0 AND r.avisar_en <= NOW()) AS activo
         FROM recordatorios r
         LEFT JOIN tareas t ON t.id = r.tarea_id
         LEFT JOIN pendientes_personales p ON p.id = r.pendiente_id
         WHERE r.usuario_id = ?${extra} ORDER BY r.avisar_en ASC LIMIT 200`, [req.usuario.id]);
    res.json({ items: filas.map((r) => ({ ...r, enviado: Boolean(r.enviado), activo: Boolean(r.activo) })) });
});

router.post('/', async (req, res) => {
    const b = req.body ?? {};
    const avisarEn = fechaHora(b.avisar_en, 'La fecha y hora del recordatorio');
    const tareaId = entero(b.tarea_id, 'La tarea', { requerido: false });
    const pendienteId = entero(b.pendiente_id, 'El pendiente', { requerido: false });
    if (tareaId && pendienteId) throw new ErrorHttp(400, 'Un recordatorio es de una tarea o de un pendiente, no de ambos.');
    // Sin tarea ni pendiente, el recordatorio es de texto libre
    const textoLibre = !tareaId && !pendienteId ? texto(b.texto, 'Lo que quieres recordar', { max: 200 }) : null;
    if (textoLibre) {
        const [[igual]] = await connection.query('SELECT 1 AS ok FROM recordatorios WHERE usuario_id = ? AND texto = ? AND avisar_en = ?', [req.usuario.id, textoLibre, avisarEn]);
        if (igual) throw new ErrorHttp(409, 'Ya tienes un recordatorio igual para ese momento.');
    }
    if (tareaId) await tareaAutorizada(req.usuario, tareaId);
    if (pendienteId) {
        const [[p]] = await connection.query('SELECT 1 AS ok FROM pendientes_personales WHERE id = ? AND usuario_id = ?', [pendienteId, req.usuario.id]);
        if (!p) throw new ErrorHttp(404, 'El pendiente no existe.');
    }
    try {
        const [r] = await connection.query(
            'INSERT INTO recordatorios (usuario_id, tarea_id, pendiente_id, texto, avisar_en) VALUES (?, ?, ?, ?, ?)',
            [req.usuario.id, tareaId, pendienteId, textoLibre, avisarEn]);
        res.status(201).json({ id: r.insertId });
    } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') throw new ErrorHttp(409, 'Ya tienes un recordatorio para ese momento.');
        throw e;
    }
});

router.patch('/:id/descartar', async (req, res) => {
    const [r] = await connection.query('UPDATE recordatorios SET enviado = 1 WHERE id = ? AND usuario_id = ?',
        [entero(req.params.id, 'El recordatorio'), req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'El recordatorio no existe.');
    res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
    const [r] = await connection.query('DELETE FROM recordatorios WHERE id = ? AND usuario_id = ?',
        [entero(req.params.id, 'El recordatorio'), req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'El recordatorio no existe.');
    res.json({ ok: true });
});

export default router;
