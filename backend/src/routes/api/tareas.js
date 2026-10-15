import { Router } from 'express';
import fileUpload from 'express-fileupload';
import fs from 'node:fs';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion, requiereRol } from '../../middleware/sesion.js';
import { listarTareas, tareaAutorizada, asignacionesDe } from '../../servicios/permisos.js';
import { tareaPublicada } from '../../servicios/notificaciones.js';
import { guardarArchivo, borrarArchivo, rutaAbsoluta, MAX_BYTES } from '../../utils/archivos.js';
import {
    ErrorHttp, texto, entero, fecha, hora, opcion, booleano, TIPOS_TAREA, PRIORIDADES,
} from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

const subida = fileUpload({ limits: { fileSize: MAX_BYTES }, abortOnLimit: false, createParentPath: false });
const ESTADOS = ['pendiente', 'entregada', 'calificada', 'vencida', 'borrador', 'publicada'];

export function filtrosDeQuery(q) {
    return {
        desde: fecha(q.desde, 'La fecha inicial', { requerido: false }),
        hasta: fecha(q.hasta, 'La fecha final', { requerido: false }),
        materia_id: entero(q.materia_id, 'La materia', { requerido: false }),
        grupo_id: entero(q.grupo_id, 'El grupo', { requerido: false }),
        grado_id: entero(q.grado_id, 'El grado', { requerido: false }),
        tipo: opcion(q.tipo, 'El tipo', TIPOS_TAREA, { requerido: false }),
        prioridad: opcion(q.prioridad, 'La prioridad', PRIORIDADES, { requerido: false }),
        estado: opcion(q.estado, 'El estado', ESTADOS, { requerido: false }),
        q: texto(q.q, 'La búsqueda', { max: 100, requerido: false }),
    };
}

function datosTarea(b) {
    return {
        titulo: texto(b.titulo, 'El título', { max: 150 }),
        descripcion: texto(b.descripcion, 'La descripción', { max: 5000, requerido: false }),
        tipo: opcion(b.tipo, 'El tipo', TIPOS_TAREA, { porDefecto: 'tarea' }),
        prioridad: opcion(b.prioridad, 'La prioridad', PRIORIDADES, { porDefecto: 'media' }),
        fecha_limite: fecha(b.fecha_limite, 'La fecha límite'),
        hora_limite: hora(b.hora_limite, 'La hora límite', { porDefecto: '23:59:00' }),
        publicada: booleano(b.publicada) ? 1 : 0,
    };
}

// Listado paginado según el rol (estudiante: sus tareas publicadas; profesor: las suyas; admin: todas)
router.get('/', async (req, res) => {
    const pagina = Math.max(1, entero(req.query.pagina, 'La página', { requerido: false }) ?? 1);
    const porPagina = Math.min(100, entero(req.query.por_pagina, 'El tamaño de página', { requerido: false }) ?? 30);
    const { filas, total } = await listarTareas(req.usuario, filtrosDeQuery(req.query),
        { limite: porPagina, desplazamiento: (pagina - 1) * porPagina });
    res.json({ items: filas, total, pagina, por_pagina: porPagina });
});

router.get('/:id', async (req, res) => {
    const id = entero(req.params.id, 'La tarea');
    const tarea = await tareaAutorizada(req.usuario, id);
    // Con estadísticas de entregas (profesor) o con el estado de la entrega propia (estudiante)
    const { filas } = await listarTareas(req.usuario, { tarea_id: id }, { limite: 1 });
    res.json({ tarea: filas[0] ?? tarea });
});

router.post('/', requiereRol('profesor', 'admin'), async (req, res) => {
    const b = req.body ?? {};
    const asignacionId = entero(b.asignacion_id, 'La materia y grupo');
    // Un profesor solo puede elegir sus propias asignaciones
    const permitidas = await asignacionesDe(req.usuario);
    if (!permitidas.some((a) => a.id === asignacionId)) {
        throw new ErrorHttp(403, 'No puedes crear tareas para esa materia y grupo.');
    }
    const d = datosTarea(b);
    const [r] = await connection.query(
        `INSERT INTO tareas (asignacion_id, titulo, descripcion, tipo, prioridad, fecha_limite, hora_limite, publicada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [asignacionId, d.titulo, d.descripcion, d.tipo, d.prioridad, d.fecha_limite, d.hora_limite, d.publicada]
    );
    // El trigger trg_tarea_crea_entregas crea una entrega pendiente por cada estudiante matriculado
    if (d.publicada) await tareaPublicada(r.insertId); // campanita + correo a los estudiantes del grupo
    res.status(201).json({ id: r.insertId });
});

router.put('/:id', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'La tarea');
    const antes = await tareaAutorizada(req.usuario, id, { gestion: true });
    const d = datosTarea(req.body ?? {});
    await connection.query(
        `UPDATE tareas SET titulo = ?, descripcion = ?, tipo = ?, prioridad = ?, fecha_limite = ?, hora_limite = ?, publicada = ?
         WHERE id = ?`,
        [d.titulo, d.descripcion, d.tipo, d.prioridad, d.fecha_limite, d.hora_limite, d.publicada, id]
    );
    if (d.publicada && !antes.publicada) await tareaPublicada(id);
    else if (d.publicada && (antes.fecha_limite !== d.fecha_limite || String(antes.hora_limite).slice(0, 5) !== String(d.hora_limite).slice(0, 5))) await tareaPublicada(id, { cambioFecha: true });
    res.json({ ok: true });
});

router.post('/:id/publicar', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'La tarea');
    const antes = await tareaAutorizada(req.usuario, id, { gestion: true });
    const publicada = booleano(req.body?.publicada) ? 1 : 0;
    await connection.query('UPDATE tareas SET publicada = ? WHERE id = ?', [publicada, id]);
    if (publicada && !antes.publicada) await tareaPublicada(id);
    res.json({ publicada });
});

router.delete('/:id', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'La tarea');
    await tareaAutorizada(req.usuario, id, { gestion: true });
    const [archivos] = await connection.query(
        `SELECT t.archivo_url AS tarea, e.archivo_url AS entrega FROM tareas t
         LEFT JOIN entregas e ON e.tarea_id = t.id WHERE t.id = ?`, [id]);
    await connection.query('DELETE FROM tareas WHERE id = ?', [id]);
    for (const f of archivos) { await borrarArchivo(f.tarea); await borrarArchivo(f.entrega); }
    res.json({ ok: true });
});

// Material adjunto de la tarea (profesor)
router.post('/:id/archivo', requiereRol('profesor', 'admin'), subida, async (req, res) => {
    const id = entero(req.params.id, 'La tarea');
    const tarea = await tareaAutorizada(req.usuario, id, { gestion: true });
    const { ruta, nombre } = await guardarArchivo(req.files?.archivo, 'tareas');
    await borrarArchivo(tarea.archivo_url);
    // archivo_url guarda "ruta|nombre original" para poder mostrar el nombre real al descargar
    await connection.query('UPDATE tareas SET archivo_url = ? WHERE id = ?', [`${ruta}|${nombre}`, id]);
    res.json({ ok: true, nombre });
});

router.delete('/:id/archivo', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'La tarea');
    const tarea = await tareaAutorizada(req.usuario, id, { gestion: true });
    await borrarArchivo(tarea.archivo_url?.split('|')[0]);
    await connection.query('UPDATE tareas SET archivo_url = NULL WHERE id = ?', [id]);
    res.json({ ok: true });
});

router.get('/:id/archivo', async (req, res) => {
    const tarea = await tareaAutorizada(req.usuario, entero(req.params.id, 'La tarea'));
    if (!tarea.archivo_url) throw new ErrorHttp(404, 'La tarea no tiene archivo adjunto.');
    const [ruta, nombre] = tarea.archivo_url.split('|');
    const abs = rutaAbsoluta(ruta);
    if (!fs.existsSync(abs)) throw new ErrorHttp(404, 'El archivo ya no está disponible.');
    res.download(abs, nombre ?? 'archivo');
});

export default router;
