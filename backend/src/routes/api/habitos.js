// Seguimiento de hábitos (habit tracker del Bullet Journal)
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { ErrorHttp, texto, entero, fecha } from '../../utils/validar.js';
import { hoyEnColombia, sumarDiasISO } from '../../utils/hoy.js';

const router = Router();
router.use(requiereSesion);

const MAX_HABITOS = 15;
const SUGERIDOS = {
    estudiante: [
        { nombre: 'Estudiar', emoji: '📖', color: '#2563EB', meta_semanal: 5 },
        { nombre: 'Repasar los apuntes', emoji: '📝', color: '#6366F1', meta_semanal: 4 },
        { nombre: 'Leer 20 minutos', emoji: '📚', color: '#0EA5E9', meta_semanal: 5 },
        { nombre: 'Dormir 8 horas', emoji: '😴', color: '#8B5CF6', meta_semanal: 7 },
        { nombre: 'Tomar agua', emoji: '💧', color: '#06B6D4', meta_semanal: 7 },
    ],
    profesor: [
        { nombre: 'Planear la clase', emoji: '🗓️', color: '#2563EB', meta_semanal: 5 },
        { nombre: 'Calificar y retroalimentar', emoji: '✅', color: '#10B981', meta_semanal: 4 },
        { nombre: 'Lectura profesional', emoji: '📚', color: '#6366F1', meta_semanal: 3 },
        { nombre: 'Pausa activa', emoji: '🧘', color: '#0EA5E9', meta_semanal: 5 },
        { nombre: 'Tomar agua', emoji: '💧', color: '#06B6D4', meta_semanal: 7 },
    ],
};
SUGERIDOS.admin = SUGERIDOS.profesor;

const colorHex = (v) => {
    if (v === undefined || v === null || v === '') return '#2563EB';
    if (!/^#[0-9a-fA-F]{6}$/.test(String(v))) throw new ErrorHttp(400, 'El color debe tener formato #RRGGBB.');
    return String(v).toUpperCase();
};

function datos(b) {
    const meta = b.meta_semanal === undefined || b.meta_semanal === '' ? 7 : Number(b.meta_semanal);
    if (!Number.isInteger(meta) || meta < 1 || meta > 7) throw new ErrorHttp(400, 'La meta semanal debe estar entre 1 y 7 días.');
    return [texto(b.nombre, 'El nombre', { max: 80 }), texto(b.emoji, 'El emoji', { max: 16, requerido: false }), colorHex(b.color), meta];
}

async function propio(u, id) {
    const [[h]] = await connection.query('SELECT id FROM habitos WHERE id = ? AND usuario_id = ?', [id, u.id]);
    if (!h) throw new ErrorHttp(404, 'El hábito no existe.');
}

// Hábitos del usuario con los días cumplidos del mes pedido (?mes=AAAA-MM) y la racha actual
router.get('/', async (req, res) => {
    const hoy = await hoyEnColombia();
    const mes = /^\d{4}-\d{2}$/.test(req.query.mes ?? '') ? req.query.mes : hoy.slice(0, 7);
    const desdeMes = `${mes}-01`;
    const [habitos] = await connection.query(
        'SELECT id, nombre, emoji, color, meta_semanal FROM habitos WHERE usuario_id = ? AND activo = 1 ORDER BY id', [req.usuario.id]);
    const ids = habitos.map((h) => h.id);
    let registros = [];
    if (ids.length) {
        [registros] = await connection.query(
            'SELECT habito_id, fecha FROM habitos_registros WHERE habito_id IN (?) AND (fecha BETWEEN ? AND LAST_DAY(?) OR fecha >= ?)',
            [ids, desdeMes, desdeMes, sumarDiasISO(hoy, -90)]);
    }
    const porHabito = new Map(ids.map((id) => [id, new Set()]));
    for (const r of registros) porHabito.get(r.habito_id).add(r.fecha);
    const racha = (set) => {
        let dia = set.has(hoy) ? hoy : sumarDiasISO(hoy, -1);
        let n = 0;
        while (set.has(dia)) { n++; dia = sumarDiasISO(dia, -1); }
        return n;
    };
    res.json({
        mes, hoy,
        habitos: habitos.map((h) => ({
            ...h,
            dias: [...porHabito.get(h.id)].filter((d) => d.startsWith(mes)).sort(),
            racha: racha(porHabito.get(h.id)),
        })),
    });
});

router.post('/', async (req, res) => {
    const [[{ n }]] = await connection.query('SELECT COUNT(*) AS n FROM habitos WHERE usuario_id = ? AND activo = 1', [req.usuario.id]);
    if (n >= MAX_HABITOS) throw new ErrorHttp(400, `Puedes tener hasta ${MAX_HABITOS} hábitos.`);
    const [r] = await connection.query('INSERT INTO habitos (usuario_id, nombre, emoji, color, meta_semanal) VALUES (?, ?, ?, ?, ?)', [req.usuario.id, ...datos(req.body ?? {})]);
    res.status(201).json({ id: r.insertId });
});

// Crea los hábitos recomendados para el rol que aún no tenga el usuario
router.post('/sugeridos', async (req, res) => {
    const [existentes] = await connection.query('SELECT nombre FROM habitos WHERE usuario_id = ? AND activo = 1', [req.usuario.id]);
    const tiene = new Set(existentes.map((e) => e.nombre.toLowerCase()));
    const nuevos = SUGERIDOS[req.usuario.rol].filter((s) => !tiene.has(s.nombre.toLowerCase())).slice(0, MAX_HABITOS - existentes.length);
    for (const s of nuevos) {
        await connection.query('INSERT INTO habitos (usuario_id, nombre, emoji, color, meta_semanal) VALUES (?, ?, ?, ?, ?)', [req.usuario.id, s.nombre, s.emoji, s.color, s.meta_semanal]);
    }
    res.status(201).json({ creados: nuevos.length });
});

router.put('/:id', async (req, res) => {
    const id = entero(req.params.id, 'El hábito');
    await propio(req.usuario, id);
    await connection.query('UPDATE habitos SET nombre = ?, emoji = ?, color = ?, meta_semanal = ? WHERE id = ?', [...datos(req.body ?? {}), id]);
    res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
    const id = entero(req.params.id, 'El hábito');
    await propio(req.usuario, id);
    await connection.query('DELETE FROM habitos WHERE id = ?', [id]);
    res.json({ ok: true });
});

router.put('/:id/dias/:fecha', async (req, res) => {
    const id = entero(req.params.id, 'El hábito');
    await propio(req.usuario, id);
    const f = fecha(req.params.fecha, 'La fecha');
    if (f > (await hoyEnColombia())) throw new ErrorHttp(400, 'No puedes marcar días futuros.');
    await connection.query('INSERT IGNORE INTO habitos_registros (habito_id, fecha) VALUES (?, ?)', [id, f]);
    res.json({ ok: true });
});

router.delete('/:id/dias/:fecha', async (req, res) => {
    const id = entero(req.params.id, 'El hábito');
    await propio(req.usuario, id);
    await connection.query('DELETE FROM habitos_registros WHERE habito_id = ? AND fecha = ?', [id, fecha(req.params.fecha, 'La fecha')]);
    res.json({ ok: true });
});

export default router;
