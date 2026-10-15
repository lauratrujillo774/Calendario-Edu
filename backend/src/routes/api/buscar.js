// Búsqueda global (barra superior): actividades, eventos, notas y pendientes por título, solo lo que el usuario puede ver.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { listarTareas, filtroVisibilidadGrupo } from '../../servicios/permisos.js';
import { texto } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

router.get('/', async (req, res) => {
    const q = texto(req.query.q, 'La búsqueda', { min: 2, max: 100 });
    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
    const u = req.usuario;
    const vis = filtroVisibilidadGrupo(u, 'e', 'creado_por');
    const [{ filas: tareas }, [eventos], [notas], [pendientes]] = await Promise.all([
        listarTareas(u, { q }, { limite: 6 }),
        connection.query(
            `SELECT e.id, e.titulo, e.fecha, e.hora, g.nombre AS grupo FROM eventos e LEFT JOIN grupos g ON g.id = e.grupo_id
             WHERE ${vis.sql} AND e.titulo LIKE ? ORDER BY e.fecha DESC LIMIT 5`, [...vis.params, like]),
        connection.query('SELECT id, titulo, fecha FROM notas_personales WHERE usuario_id = ? AND (titulo LIKE ? OR contenido LIKE ?) ORDER BY id DESC LIMIT 5', [u.id, like, like]),
        connection.query('SELECT id, titulo, tipo, fecha_limite FROM pendientes_personales WHERE usuario_id = ? AND titulo LIKE ? ORDER BY id DESC LIMIT 5', [u.id, like]),
    ]);
    res.json({
        tareas: tareas.map((t) => ({ id: t.id, titulo: t.titulo, tipo: t.tipo, fecha: t.fecha_limite, materia: t.materia, color: t.color })),
        eventos, notas, pendientes,
    });
});

export default router;
