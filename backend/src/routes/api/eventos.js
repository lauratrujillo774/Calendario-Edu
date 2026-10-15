import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion, requiereRol } from '../../middleware/sesion.js';
import { filtroVisibilidadGrupo, puedeGestionarGrupo, esAdmin } from '../../servicios/permisos.js';
import { ErrorHttp, texto, entero, fecha, hora } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

// Eventos visibles para el usuario: institucionales + los de sus grupos
router.get('/', async (req, res) => {
    const vis = filtroVisibilidadGrupo(req.usuario, 'e', 'creado_por');
    const params = [...vis.params];
    let extra = '';
    const desde = fecha(req.query.desde, 'La fecha inicial', { requerido: false });
    if (desde) { extra += ' AND e.fecha >= ?'; params.push(desde); }
    const hasta = fecha(req.query.hasta, 'La fecha final', { requerido: false });
    if (hasta) { extra += ' AND e.fecha <= ?'; params.push(hasta); }
    const [filas] = await connection.query(
        `SELECT e.id, e.titulo, e.descripcion, e.fecha, e.hora, e.grupo_id, g.nombre AS grupo,
                e.creado_por, u.nombre AS creador
         FROM eventos e LEFT JOIN grupos g ON g.id = e.grupo_id JOIN usuarios u ON u.id = e.creado_por
         WHERE ${vis.sql}${extra} ORDER BY e.fecha, e.hora LIMIT 500`, params);
    res.json({
        items: filas.map((e) => ({
            ...e, ambito: e.grupo_id ? 'grupo' : 'institucional',
            puede_editar: esAdmin(req.usuario) || e.creado_por === req.usuario.id,
        })),
    });
});

async function datosEvento(u, b) {
    const grupoId = entero(b.grupo_id, 'El grupo', { requerido: false });
    // Solo el administrador crea eventos institucionales; el profesor solo para sus grupos
    if (!grupoId && !esAdmin(u)) throw new ErrorHttp(403, 'Solo el administrador crea eventos institucionales. Elige un grupo.');
    if (grupoId && !(await puedeGestionarGrupo(u, grupoId))) throw new ErrorHttp(403, 'No puedes crear eventos para ese grupo.');
    return [
        grupoId, texto(b.titulo, 'El título', { max: 150 }), texto(b.descripcion, 'La descripción', { max: 2000, requerido: false }),
        fecha(b.fecha, 'La fecha'), hora(b.hora, 'La hora', { requerido: false }),
    ];
}

router.post('/', requiereRol('profesor', 'admin'), async (req, res) => {
    const d = await datosEvento(req.usuario, req.body ?? {});
    const [r] = await connection.query(
        'INSERT INTO eventos (creado_por, grupo_id, titulo, descripcion, fecha, hora) VALUES (?, ?, ?, ?, ?, ?)',
        [req.usuario.id, ...d]);
    res.status(201).json({ id: r.insertId });
});

async function eventoPropio(u, id) {
    const [[e]] = await connection.query('SELECT id, creado_por FROM eventos WHERE id = ?', [id]);
    if (!e) throw new ErrorHttp(404, 'El evento no existe.');
    if (!esAdmin(u) && e.creado_por !== u.id) throw new ErrorHttp(403, 'Solo puedes modificar los eventos que creaste.');
}

router.put('/:id', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'El evento');
    await eventoPropio(req.usuario, id);
    const d = await datosEvento(req.usuario, req.body ?? {});
    await connection.query(
        'UPDATE eventos SET grupo_id = ?, titulo = ?, descripcion = ?, fecha = ?, hora = ? WHERE id = ?', [...d, id]);
    res.json({ ok: true });
});

router.delete('/:id', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'El evento');
    await eventoPropio(req.usuario, id);
    await connection.query('DELETE FROM eventos WHERE id = ?', [id]);
    res.json({ ok: true });
});

export default router;
