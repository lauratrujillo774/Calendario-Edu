// Días de estudio: el usuario marca los días que estudió (con minutos opcionales). Alimenta "Días de estudio esta semana".
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { ErrorHttp, fecha } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

const hoyEnColombia = async () => (await connection.query('SELECT CURDATE() AS hoy'))[0][0].hoy;

router.get('/', async (req, res) => {
    const desde = fecha(req.query.desde, 'La fecha inicial');
    const hasta = fecha(req.query.hasta, 'La fecha final');
    if ((new Date(hasta) - new Date(desde)) / 86400000 > 100) throw new ErrorHttp(400, 'El rango máximo es de 100 días.');
    const [filas] = await connection.query(
        'SELECT fecha, minutos FROM dias_estudio WHERE usuario_id = ? AND fecha BETWEEN ? AND ? ORDER BY fecha', [req.usuario.id, desde, hasta]);
    res.json({ items: filas });
});

// Marca (o actualiza los minutos de) un día de estudio. No se permiten días futuros.
router.put('/:fecha', async (req, res) => {
    const f = fecha(req.params.fecha, 'La fecha');
    if (f > (await hoyEnColombia())) throw new ErrorHttp(400, 'No puedes registrar estudio en días futuros.');
    let minutos = null;
    if (req.body?.minutos !== undefined && req.body?.minutos !== null && req.body?.minutos !== '') {
        minutos = Number(req.body.minutos);
        if (!Number.isInteger(minutos) || minutos < 1 || minutos > 1440) throw new ErrorHttp(400, 'Los minutos deben estar entre 1 y 1440.');
    }
    await connection.query(
        'INSERT INTO dias_estudio (usuario_id, fecha, minutos) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE minutos = VALUES(minutos)',
        [req.usuario.id, f, minutos]);
    res.json({ ok: true });
});

// Suma minutos de estudio a un día (lo usa el temporizador "Modo enfoque"); crea el día si no estaba marcado
router.post('/:fecha/sumar', async (req, res) => {
    const f = fecha(req.params.fecha, 'La fecha');
    if (f > (await hoyEnColombia())) throw new ErrorHttp(400, 'No puedes registrar estudio en días futuros.');
    const minutos = Number(req.body?.minutos);
    if (!Number.isInteger(minutos) || minutos < 1 || minutos > 240) throw new ErrorHttp(400, 'Los minutos a sumar deben estar entre 1 y 240.');
    await connection.query(
        `INSERT INTO dias_estudio (usuario_id, fecha, minutos) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE minutos = LEAST(1440, COALESCE(minutos, 0) + VALUES(minutos))`, [req.usuario.id, f, minutos]);
    const [[fila]] = await connection.query('SELECT minutos FROM dias_estudio WHERE usuario_id = ? AND fecha = ?', [req.usuario.id, f]);
    res.json({ minutos: fila.minutos });
});

router.delete('/:fecha', async (req, res) => {
    await connection.query('DELETE FROM dias_estudio WHERE usuario_id = ? AND fecha = ?', [req.usuario.id, fecha(req.params.fecha, 'La fecha')]);
    res.json({ ok: true });
});

export default router;
