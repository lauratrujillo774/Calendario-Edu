// Materias que ve el estudiante. Salen del plan de estudios de su grado y, además, cada estudiante registra las suyas:
// elige una que ya existe o escribe el nombre de una nueva (si ya existía con ese nombre, se reutiliza).
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { ErrorHttp, texto, entero } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

const MAX_PROPIAS = 30;
const COLORES = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#EC4899', '#0EA5E9', '#84CC16', '#F97316'];

export async function materiasDelEstudiante(usuarioId, gradoId) {
    const [filas] = await connection.query(
        `SELECT m.id, m.nombre, m.color, (gm.materia_id IS NOT NULL) AS del_grado, (em.materia_id IS NOT NULL) AS propia
         FROM materias m
         LEFT JOIN grado_materias gm ON gm.materia_id = m.id AND gm.grado_id = ?
         LEFT JOIN estudiante_materias em ON em.materia_id = m.id AND em.usuario_id = ?
         WHERE gm.materia_id IS NOT NULL OR em.materia_id IS NOT NULL
         ORDER BY m.nombre`, [gradoId ?? 0, usuarioId]);
    return filas.map((f) => ({ ...f, del_grado: Boolean(f.del_grado), propia: Boolean(f.propia) }));
}

router.get('/', async (req, res) => {
    const [todas] = await connection.query('SELECT id, nombre, color FROM materias ORDER BY nombre');
    res.json({ items: await materiasDelEstudiante(req.usuario.id, req.usuario.grado_id), disponibles: todas });
});

// Registrar una materia: por id (de la lista) o por nombre (crea la materia si no existe)
router.post('/', async (req, res) => {
    const u = req.usuario;
    const [[{ n }]] = await connection.query('SELECT COUNT(*) AS n FROM estudiante_materias WHERE usuario_id = ?', [u.id]);
    if (n >= MAX_PROPIAS) throw new ErrorHttp(400, `Puedes registrar hasta ${MAX_PROPIAS} materias propias.`);
    let materiaId = entero(req.body?.materia_id, 'La materia', { requerido: false });
    if (materiaId) {
        const [[m]] = await connection.query('SELECT id FROM materias WHERE id = ?', [materiaId]);
        if (!m) throw new ErrorHttp(400, 'La materia no existe.');
    } else {
        const nombre = texto(req.body?.nombre, 'El nombre de la materia', { min: 2, max: 80 }).replace(/\s+/g, ' ').replace(/[<>]/g, '');
        const [[ya]] = await connection.query('SELECT id FROM materias WHERE nombre = ?', [nombre]); // la comparación ignora mayúsculas y tildes
        if (ya) materiaId = ya.id;
        else {
            const [[{ total }]] = await connection.query('SELECT COUNT(*) AS total FROM materias');
            const [r] = await connection.query('INSERT INTO materias (nombre, color) VALUES (?, ?)', [nombre, COLORES[total % COLORES.length]]);
            materiaId = r.insertId;
        }
    }
    await connection.query('INSERT IGNORE INTO estudiante_materias (usuario_id, materia_id) VALUES (?, ?)', [u.id, materiaId]);
    res.status(201).json({ items: await materiasDelEstudiante(u.id, u.grado_id), materia_id: materiaId });
});

// Quitar una materia que el estudiante registró (las del plan de su grado no se pueden quitar)
router.delete('/:id', async (req, res) => {
    const id = entero(req.params.id, 'La materia');
    const [r] = await connection.query('DELETE FROM estudiante_materias WHERE usuario_id = ? AND materia_id = ?', [req.usuario.id, id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'Esa materia no está entre las que registraste.');
    res.json({ items: await materiasDelEstudiante(req.usuario.id, req.usuario.grado_id) });
});

export default router;
