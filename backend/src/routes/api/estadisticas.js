// Estadísticas reales calculadas desde la base de datos, según el rol.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { esAdmin, esProfesor } from '../../servicios/permisos.js';
import { NOTA_APROBATORIA } from '../../config/academico.js';

const router = Router();
router.use(requiereSesion);

const num = (v) => Number(v ?? 0);
const un = (n) => (n == null ? null : Math.round(num(n) * 10) / 10);

// Seguimiento por materia del estudiante: TODAS las materias de su grado (aunque no tengan actividades), con su docente,
// avance, promedio (oficial + el que él mismo registra), próxima entrega y alertas
async function seguimientoPorMateria(u) {
    const [materias] = await connection.query(
        `SELECT DISTINCT m.id, m.nombre, m.color FROM materias m
         WHERE m.id IN (SELECT materia_id FROM grado_materias WHERE grado_id = ?)
            OR m.id IN (SELECT a.materia_id FROM asignaciones a JOIN matriculas mt ON mt.grupo_id = a.grupo_id WHERE mt.estudiante_id = ?)
            OR m.id IN (SELECT materia_id FROM estudiante_materias WHERE usuario_id = ?)
         ORDER BY m.nombre`, [u.grado_id ?? 0, u.id, u.id]);
    const [agregados] = await connection.query(
        `SELECT materia_id, COUNT(*) AS total, SUM(estado = 'pendiente') AS pendientes, SUM(estado = 'entregada') AS entregadas, SUM(estado = 'calificada') AS calificadas,
                SUM(estado = 'pendiente' AND TIMESTAMP(fecha_limite, hora_limite) < NOW()) AS vencidas, AVG(calificacion) AS promedio, COUNT(calificacion) AS n_notas
         FROM v_tareas_estudiante WHERE estudiante_id = ? GROUP BY materia_id`, [u.id]);
    const [docentes] = await connection.query(
        `SELECT a.materia_id, GROUP_CONCAT(DISTINCT p.nombre ORDER BY p.nombre SEPARATOR ', ') AS docentes
         FROM asignaciones a JOIN usuarios p ON p.id = a.profesor_id JOIN matriculas mt ON mt.grupo_id = a.grupo_id
         WHERE mt.estudiante_id = ? GROUP BY a.materia_id`, [u.id]);
    const [personales] = await connection.query(
        `SELECT materia_id, AVG(nota) AS promedio, COUNT(*) AS n FROM pendientes_personales
         WHERE usuario_id = ? AND nota IS NOT NULL AND materia_id IS NOT NULL GROUP BY materia_id`, [u.id]);
    const [proximas] = await connection.query(
        `SELECT materia_id, titulo, tipo, fecha_limite, hora_limite FROM v_tareas_estudiante
         WHERE estudiante_id = ? AND estado = 'pendiente' AND TIMESTAMP(fecha_limite, hora_limite) >= NOW()
         ORDER BY fecha_limite, hora_limite LIMIT 200`, [u.id]);
    const por = (lista) => new Map(lista.map((x) => [x.materia_id, x]));
    const ag = por(agregados); const dc = por(docentes); const pe = por(personales);
    const prox = new Map();
    for (const x of proximas) if (!prox.has(x.materia_id)) prox.set(x.materia_id, x);
    return materias.map((m) => {
        const a = ag.get(m.id); const p = pe.get(m.id);
        const total = num(a?.total); const hechas = num(a?.entregadas) + num(a?.calificadas);
        const nO = num(a?.n_notas); const nP = num(p?.n);
        const combinado = nO + nP ? (num(a?.promedio) * nO + num(p?.promedio) * nP) / (nO + nP) : null;
        const x = prox.get(m.id);
        return {
            materia_id: m.id, materia: m.nombre, color: m.color, docentes: dc.get(m.id)?.docentes ?? null,
            total, hechas, pendientes: num(a?.pendientes), entregadas: num(a?.entregadas), calificadas: num(a?.calificadas), vencidas: num(a?.vencidas),
            progreso: total ? Math.round((hechas * 100) / total) : 0,
            promedio: un(combinado), promedio_oficial: un(a?.promedio), promedio_personal: un(p?.promedio), notas_personales: nP,
            proxima: x ? { titulo: x.titulo, tipo: x.tipo, fecha: x.fecha_limite, hora: String(x.hora_limite).slice(0, 5) } : null,
        };
    });
}

router.get('/', async (req, res) => {
    const u = req.usuario;

    if (u.rol === 'estudiante') {
        const [[tot]] = await connection.query(
            `SELECT COUNT(*) AS total,
                    COALESCE(SUM(estado = 'pendiente'), 0) AS pendientes,
                    COALESCE(SUM(estado = 'entregada'), 0) AS entregadas,
                    COALESCE(SUM(estado = 'calificada'), 0) AS calificadas,
                    COALESCE(SUM(estado = 'pendiente' AND TIMESTAMP(fecha_limite, hora_limite) < NOW()), 0) AS vencidas,
                    AVG(calificacion) AS promedio
             FROM v_tareas_estudiante WHERE estudiante_id = ?`, [u.id]);
        const porMateria = await seguimientoPorMateria(u);
        const [[ex]] = await connection.query(
            `SELECT COUNT(*) AS total, COALESCE(SUM(estado = 'calificada'), 0) AS calificados,
                    COALESCE(SUM(estado = 'calificada' AND calificacion >= ?), 0) AS aprobados
             FROM v_tareas_estudiante WHERE estudiante_id = ? AND tipo = 'examen'`, [NOTA_APROBATORIA, u.id]);
        const [[est]] = await connection.query(
            `SELECT COUNT(*) AS dias, COALESCE(SUM(minutos), 0) AS minutos FROM dias_estudio
             WHERE usuario_id = ? AND fecha BETWEEN DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                   AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)`, [u.id]);
        const [[pers]] = await connection.query(
            'SELECT COUNT(*) AS total, COALESCE(SUM(completado = 1), 0) AS hechos FROM pendientes_personales WHERE usuario_id = ?', [u.id]);
        const total = num(tot.total);
        const hechas = num(tot.entregadas) + num(tot.calificadas);
        return res.json({
            rol: u.rol, total, pendientes: num(tot.pendientes), entregadas: num(tot.entregadas),
            calificadas: num(tot.calificadas), vencidas: num(tot.vencidas),
            progreso: total ? Math.round((hechas * 100) / total) : 0,
            examenes: { total: num(ex.total), calificados: num(ex.calificados), aprobados: num(ex.aprobados) },
            estudio_semana: { dias: num(est.dias), minutos: num(est.minutos), meta: 7 },
            personales: { total: num(pers.total), hechos: num(pers.hechos) },
            nota_aprobatoria: NOTA_APROBATORIA,
            promedio: tot.promedio == null ? null : Math.round(num(tot.promedio) * 10) / 10,
            por_materia: porMateria,
        });
    }

    res.json({ rol: u.rol });
});

export default router;
