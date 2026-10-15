// Horario del día: lo que cada persona escribe en una hora del calendario, con una casilla de "cumplido".
// Es privado y NO forma parte de los pendientes.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { ErrorHttp, texto, entero, fecha, hora, booleano } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

const hhmm = (h) => String(h).slice(0, 5);
const COLUMNAS = 'id, fecha, hora, texto, cumplido';
const publico = (e) => ({ id: e.id, fecha: e.fecha, hora: hhmm(e.hora), texto: e.texto, cumplido: Boolean(e.cumplido) });

router.get('/', async (req, res) => {
    const desde = fecha(req.query.desde ?? req.query.fecha, 'La fecha inicial');
    const hasta = fecha(req.query.hasta ?? req.query.fecha, 'La fecha final');
    const [filas] = await connection.query(
        `SELECT ${COLUMNAS} FROM horario_entradas WHERE usuario_id = ? AND fecha BETWEEN ? AND ? ORDER BY fecha, hora, id LIMIT 1000`, [req.usuario.id, desde, hasta]);
    res.json({ items: filas.map(publico) });
});

function datos(b) {
    return [texto(b.texto, 'El texto', { max: 150 }), fecha(b.fecha, 'La fecha'), hora(b.hora, 'La hora')];
}

router.post('/', async (req, res) => {
    const [t, f, h] = datos(req.body ?? {});
    const [r] = await connection.query('INSERT INTO horario_entradas (usuario_id, texto, fecha, hora) VALUES (?, ?, ?, ?)', [req.usuario.id, t, f, h]);
    res.status(201).json({ id: r.insertId });
});

router.put('/:id', async (req, res) => {
    const id = entero(req.params.id, 'La entrada');
    const [t, f, h] = datos(req.body ?? {});
    const [r] = await connection.query('UPDATE horario_entradas SET texto = ?, fecha = ?, hora = ? WHERE id = ? AND usuario_id = ?', [t, f, h, id, req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'La entrada no existe.');
    res.json({ ok: true });
});

router.patch('/:id/cumplido', async (req, res) => {
    const id = entero(req.params.id, 'La entrada');
    const [r] = await connection.query('UPDATE horario_entradas SET cumplido = ? WHERE id = ? AND usuario_id = ?', [booleano(req.body?.cumplido) ? 1 : 0, id, req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'La entrada no existe.');
    res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
    const [r] = await connection.query('DELETE FROM horario_entradas WHERE id = ? AND usuario_id = ?', [entero(req.params.id, 'La entrada'), req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'La entrada no existe.');
    res.json({ ok: true });
});

export default router;
