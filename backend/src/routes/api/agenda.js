// Agenda unificada: tareas, eventos, notas, pendientes y recordatorios en un rango de fechas,
// con los filtros combinables que usa el calendario (día / semana / mes / lista).
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { listarTareas, filtroVisibilidadGrupo } from '../../servicios/permisos.js';
import { ErrorHttp, fecha, entero, texto, opcion, TIPOS_TAREA, PRIORIDADES } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

const TIPOS = [...TIPOS_TAREA, 'evento', 'nota', 'pendiente', 'recordatorio'];
const ESTADOS = ['pendiente', 'entregada', 'calificada', 'vencida', 'completada', 'borrador', 'publicada'];
const hhmm = (h) => (h ? String(h).slice(0, 5) : null);
const MAX_DIAS = 100;

router.get('/', async (req, res) => {
    const u = req.usuario;
    const q = req.query;
    const desde = fecha(q.desde, 'La fecha inicial');
    const hasta = fecha(q.hasta, 'La fecha final');
    if (hasta < desde) throw new ErrorHttp(400, 'La fecha final es anterior a la inicial.');
    if ((new Date(hasta) - new Date(desde)) / 86400000 > MAX_DIAS) throw new ErrorHttp(400, `El rango máximo es de ${MAX_DIAS} días.`);

    const f = {
        materia_id: entero(q.materia_id, 'La materia', { requerido: false }),
        grupo_id: entero(q.grupo_id, 'El grupo', { requerido: false }),
        grado_id: entero(q.grado_id, 'El grado', { requerido: false }),
        tipo: opcion(q.tipo, 'El tipo', TIPOS, { requerido: false }),
        estado: opcion(q.estado, 'El estado', ESTADOS, { requerido: false }),
        prioridad: opcion(q.prioridad, 'La prioridad', PRIORIDADES, { requerido: false }),
        q: texto(q.q, 'La búsqueda', { max: 100, requerido: false }),
    };
    const buscar = f.q ? `%${f.q}%` : null;
    const items = [];

    // --- Tareas académicas (el servidor decide cuáles puede ver este usuario) ---
    if (!f.tipo || TIPOS_TAREA.includes(f.tipo)) {
        const estadoTarea = ['completada'].includes(f.estado) ? undefined : f.estado;
        if (f.estado !== 'completada') {
            const { filas } = await listarTareas(u, {
                desde, hasta, materia_id: f.materia_id, grupo_id: f.grupo_id, grado_id: f.grado_id, tipo: f.tipo,
                prioridad: f.prioridad, estado: estadoTarea, q: f.q,
            }, { limite: 1000 });
            for (const t of filas) {
                items.push({
                    clave: `tarea-${t.id}`, origen: 'tarea', id: t.id, titulo: t.titulo, tipo: t.tipo,
                    fecha: t.fecha_limite, hora: hhmm(t.hora_limite), color: t.color, materia: t.materia,
                    grupo: t.grupo, profesor: t.profesor, prioridad: t.prioridad,
                    estado: t.estado ?? (t.publicada ? 'publicada' : 'borrador'),
                    vencida: Boolean(t.vencida), calificacion: t.calificacion ?? null,
                    publicada: Boolean(t.publicada),
                    pendientes: t.pendientes, entregadas: t.entregadas, total_estudiantes: t.total_estudiantes,
                });
            }
        }
    }

    // --- Eventos institucionales y de grupo ---
    if ((!f.tipo || f.tipo === 'evento') && !f.materia_id && !f.estado && !f.prioridad) {
        const vis = filtroVisibilidadGrupo(u, 'e', 'creado_por');
        const params = [desde, hasta, ...vis.params];
        let extra = '';
        if (f.grupo_id) { extra += ' AND e.grupo_id = ?'; params.push(f.grupo_id); }
        if (buscar) { extra += ' AND e.titulo LIKE ?'; params.push(buscar); }
        const [filas] = await connection.query(
            `SELECT e.id, e.titulo, e.descripcion, e.fecha, e.hora, e.grupo_id, g.nombre AS grupo, e.creado_por
             FROM eventos e LEFT JOIN grupos g ON g.id = e.grupo_id
             WHERE e.fecha BETWEEN ? AND ? AND ${vis.sql}${extra} ORDER BY e.fecha, e.hora LIMIT 500`, params);
        for (const e of filas) {
            items.push({
                clave: `evento-${e.id}`, origen: 'evento', id: e.id, titulo: e.titulo, descripcion: e.descripcion,
                tipo: 'evento', ambito: e.grupo_id ? 'grupo' : 'institucional', fecha: e.fecha, hora: hhmm(e.hora),
                grupo: e.grupo, grupo_id: e.grupo_id, puede_editar: u.rol === 'admin' || e.creado_por === u.id,
            });
        }
    }

    // --- Notas personales (privadas) ---
    if ((!f.tipo || f.tipo === 'nota') && !f.materia_id && !f.estado && !f.prioridad && !f.grupo_id) {
        const params = [u.id, desde, hasta];
        let extra = '';
        if (buscar) { extra = ' AND (titulo LIKE ? OR contenido LIKE ?)'; params.push(buscar, buscar); }
        const [filas] = await connection.query(
            `SELECT id, titulo, fecha, color FROM notas_personales
             WHERE usuario_id = ? AND fecha BETWEEN ? AND ?${extra} ORDER BY fecha, id LIMIT 500`, params);
        for (const n of filas) {
            items.push({ clave: `nota-${n.id}`, origen: 'nota', id: n.id, titulo: n.titulo, tipo: 'nota', fecha: n.fecha, hora: null, nota_color: n.color });
        }
    }

    // --- Pendientes personales con fecha (tareas, exámenes y eventos propios del usuario) ---
    const estadosPend = [undefined, null, 'pendiente', 'completada', 'vencida'];
    if ((!f.tipo || ['pendiente', 'examen', 'evento'].includes(f.tipo)) && !f.materia_id && !f.grupo_id && estadosPend.includes(f.estado)) {
        const params = [u.id, desde, hasta];
        let extra = '';
        if (f.tipo === 'pendiente') extra += " AND tipo = 'tarea'";
        if (f.tipo === 'examen' || f.tipo === 'evento') { extra += ' AND tipo = ?'; params.push(f.tipo); }
        if (f.prioridad) { extra += ' AND prioridad = ?'; params.push(f.prioridad); }
        if (f.estado === 'pendiente') extra += ' AND completado = 0';
        if (f.estado === 'completada') extra += ' AND completado = 1';
        if (f.estado === 'vencida') extra += ' AND completado = 0 AND fecha_limite < CURDATE()';
        if (buscar) { extra += ' AND titulo LIKE ?'; params.push(buscar); }
        const [filas] = await connection.query(
            `SELECT id, titulo, tipo, fecha_limite, hora, prioridad, completado, (completado = 0 AND fecha_limite < CURDATE()) AS vencida
             FROM pendientes_personales WHERE usuario_id = ? AND fecha_limite BETWEEN ? AND ?${extra}
             ORDER BY fecha_limite, hora, id LIMIT 500`, params);
        for (const p of filas) {
            items.push({
                clave: `pendiente-${p.id}`, origen: 'pendiente', id: p.id, titulo: p.titulo, personal: true,
                tipo: p.tipo === 'tarea' ? 'pendiente' : p.tipo,
                fecha: p.fecha_limite, hora: hhmm(p.hora), prioridad: p.prioridad, completado: Boolean(p.completado),
                estado: p.completado ? 'completada' : 'pendiente', vencida: Boolean(p.vencida),
            });
        }
    }

    // --- Horario del día (lo que la persona escribe en cada hora; no es un pendiente) ---
    if ((!f.tipo || f.tipo === 'evento') && !f.materia_id && !f.grupo_id && !f.prioridad && [undefined, null, 'pendiente', 'completada'].includes(f.estado)) {
        const params = [u.id, desde, hasta];
        let extra = '';
        if (f.estado === 'pendiente') extra += ' AND cumplido = 0';
        if (f.estado === 'completada') extra += ' AND cumplido = 1';
        if (buscar) { extra += ' AND texto LIKE ?'; params.push(buscar); }
        const [filas] = await connection.query(
            `SELECT id, texto, fecha, hora, cumplido FROM horario_entradas WHERE usuario_id = ? AND fecha BETWEEN ? AND ?${extra} ORDER BY fecha, hora, id LIMIT 500`, params);
        for (const e of filas) {
            items.push({
                clave: `horario-${e.id}`, origen: 'horario', id: e.id, titulo: e.texto, personal: true, tipo: 'evento',
                fecha: e.fecha, hora: hhmm(e.hora), completado: Boolean(e.cumplido), estado: e.cumplido ? 'completada' : 'pendiente',
            });
        }
    }

    // --- Recordatorios ---
    if ((!f.tipo || f.tipo === 'recordatorio') && !f.materia_id && !f.grupo_id && !f.estado && !f.prioridad) {
        const params = [u.id, desde, hasta];
        let extra = '';
        if (buscar) { extra = ' AND COALESCE(t.titulo, p.titulo, r.texto) LIKE ?'; params.push(buscar); }
        const [filas] = await connection.query(
            `SELECT r.id, r.avisar_en, r.enviado, COALESCE(t.titulo, p.titulo, r.texto) AS titulo
             FROM recordatorios r
             LEFT JOIN tareas t ON t.id = r.tarea_id
             LEFT JOIN pendientes_personales p ON p.id = r.pendiente_id
             WHERE r.usuario_id = ? AND DATE(r.avisar_en) BETWEEN ? AND ?${extra} ORDER BY r.avisar_en LIMIT 500`, params);
        for (const r of filas) {
            items.push({
                clave: `recordatorio-${r.id}`, origen: 'recordatorio', id: r.id, titulo: r.titulo, tipo: 'recordatorio',
                fecha: r.avisar_en.slice(0, 10), hora: r.avisar_en.slice(11, 16), descartado: Boolean(r.enviado),
            });
        }
    }

    items.sort((a, b) => (a.fecha + (a.hora ?? '24:00')).localeCompare(b.fecha + (b.hora ?? '24:00')) || a.titulo.localeCompare(b.titulo));
    res.json({ desde, hasta, items });
});

export default router;
