// Diario personal: cómo me siento (emociones y texto), gratitud, qué salió bien, qué mejoro mañana, reflexión y memo libre.
// Es privado: solo lo ve y lo modifica su dueño.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { ErrorHttp, texto, fecha } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

export const EMOCIONES = ['feliz', 'tranquilo', 'motivado', 'agradecido', 'orgulloso', 'cansado', 'estresado', 'ansioso', 'triste', 'enojado', 'aburrido', 'confundido'];
const CAMPOS = 'fecha, animo, emociones, sentir, gratitud, bien, mejorar, energia, reflexion, memo';
const vacia = (f) => ({ fecha: f, animo: null, emociones: [], sentir: null, gratitud: null, bien: null, mejorar: null, energia: null, reflexion: null, memo: null });
const salida = (d) => ({ ...d, emociones: d.emociones ? d.emociones.split(',').filter(Boolean) : [] });

function nivel(valor, nombre) {
    if (valor === undefined || valor === null || valor === '') return null;
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new ErrorHttp(400, `${nombre} debe ser un valor de 1 a 5.`);
    return n;
}

// Estado de ánimo de cada día en un rango (tira del mes) y resumen de emociones
router.get('/', async (req, res) => {
    const desde = fecha(req.query.desde, 'La fecha inicial');
    const hasta = fecha(req.query.hasta, 'La fecha final');
    if ((new Date(hasta) - new Date(desde)) / 86400000 > 400) throw new ErrorHttp(400, 'El rango máximo es de 400 días.');
    const [filas] = await connection.query(
        `SELECT fecha, animo, emociones, energia FROM diario_dias WHERE usuario_id = ? AND fecha BETWEEN ? AND ?
         AND (animo IS NOT NULL OR emociones IS NOT NULL OR energia IS NOT NULL) ORDER BY fecha`, [req.usuario.id, desde, hasta]);
    res.json({ items: filas.map(salida) });
});

// Entradas recientes del diario (las que tienen algo escrito), para releerlas
router.get('/entradas', async (req, res) => {
    const limite = Math.min(60, Number(req.query.limite) || 20);
    const [filas] = await connection.query(
        `SELECT ${CAMPOS} FROM diario_dias WHERE usuario_id = ?
         AND (sentir IS NOT NULL OR gratitud IS NOT NULL OR bien IS NOT NULL OR mejorar IS NOT NULL OR reflexion IS NOT NULL OR memo IS NOT NULL)
         ORDER BY fecha DESC LIMIT ?`, [req.usuario.id, limite]);
    res.json({ items: filas.map(salida) });
});

router.get('/:fecha', async (req, res) => {
    const f = fecha(req.params.fecha, 'La fecha');
    const [[dia]] = await connection.query(`SELECT ${CAMPOS} FROM diario_dias WHERE usuario_id = ? AND fecha = ?`, [req.usuario.id, f]);
    res.json({ dia: dia ? salida(dia) : vacia(f) });
});

router.put('/:fecha', async (req, res) => {
    const f = fecha(req.params.fecha, 'La fecha');
    const b = req.body ?? {};
    const emociones = Array.isArray(b.emociones) ? [...new Set(b.emociones)] : [];
    if (emociones.some((e) => !EMOCIONES.includes(e))) throw new ErrorHttp(400, 'Alguna de las emociones no es válida.');
    await connection.query(
        `INSERT INTO diario_dias (usuario_id, fecha, animo, emociones, sentir, gratitud, bien, mejorar, energia, reflexion, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE animo = VALUES(animo), emociones = VALUES(emociones), sentir = VALUES(sentir), gratitud = VALUES(gratitud),
                bien = VALUES(bien), mejorar = VALUES(mejorar), energia = VALUES(energia), reflexion = VALUES(reflexion), memo = VALUES(memo)`,
        [req.usuario.id, f, nivel(b.animo, 'El estado de ánimo'), emociones.length ? emociones.join(',') : null,
            texto(b.sentir, 'Cómo me siento', { max: 5000, requerido: false }), texto(b.gratitud, 'La gratitud', { max: 1000, requerido: false }),
            texto(b.bien, 'Lo que salió bien', { max: 3000, requerido: false }), texto(b.mejorar, 'Lo que quiero mejorar', { max: 3000, requerido: false }),
            nivel(b.energia, 'La energía'), texto(b.reflexion, 'La reflexión', { max: 5000, requerido: false }), texto(b.memo, 'El memo', { max: 10000, requerido: false })]);
    res.json({ ok: true });
});

export default router;
