// Calificaciones: el estudiante lleva su REGISTRO por materia (notas oficiales + las que él anota); el docente tiene el libro de
// calificaciones (con filtros por grado y materia) y la cola "Por calificar".
import { api } from '../api.js';
import { estado, esEstudiante } from '../estado.js';
import { h, icono, vaciar, cargarEn, vacio, insignia, opcionesDe, modal, formulario, aviso, confirmar } from '../ui.js';
import { encabezadoPagina, tarjetaEstadistica, barraProgreso, TIPOS, insigneAsignadaPor, insigniaPropia } from '../comp.js';
import { calificar } from './tareas.js';
import { editarPendiente } from '../formularios.js';
import { fechaCorta, fechaHora, relativa, hoy } from '../fechas.js';
import { ir } from '../ruta.js';

const MINIMA = 3;
const claseNota = (n) => (n == null ? '' : Number(n) >= MINIMA ? 'nota-ok' : 'nota-mal');
const fmt = (n) => (n == null ? '—' : Number(n).toFixed(1));
const promedioDe = (lista) => (lista.length ? lista.reduce((a, n) => a + Number(n), 0) / lista.length : null);

export function calificaciones(cont) {
    return esEstudiante() ? misCalificaciones(cont) : libro(cont);
}

// ---------- Estudiante: registro de calificaciones por materia ----------
function registrarNota(materiaId, alGuardar) {
    const m = modal({ titulo: 'Registrar una nota', ancho: 'chico', cuerpo: '' });
    const f = formulario({
        enviar: 'Guardar nota', alCancelar: m.cerrar,
        campos: [
            { nombre: 'materia_id', etiqueta: 'Materia', tipo: 'select', opciones: opcionesDe(estado.catalogo.materias, 'id', 'nombre', 'Elige la materia…'), valor: materiaId ?? '', requerido: true },
            { nombre: 'titulo', etiqueta: '¿De qué es la nota?', requerido: true, max: 150, placeholder: 'Ej.: Quiz de fracciones' },
            { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: [{ valor: 'examen', texto: 'Examen' }, { valor: 'tarea', texto: 'Tarea o trabajo' }], valor: 'examen', ancho: 'mitad' },
            { nombre: 'nota', etiqueta: 'Nota (0.0 a 5.0)', tipo: 'number', min: 0, maxValor: 5, paso: '0.1', requerido: true, ancho: 'mitad' },
            { nombre: 'fecha_limite', etiqueta: 'Fecha', tipo: 'date', valor: hoy(), requerido: true },
        ],
        extra: h('p', { class: 'ayuda' }, 'Esta nota es solo tuya: sirve para llevar tu registro y tu promedio. No cambia lo que ven tus docentes.'),
        alEnviar: async (v) => {
            await api.post('/pendientes', { titulo: v.titulo, tipo: v.tipo, fecha_limite: v.fecha_limite, materia_id: Number(v.materia_id), nota: v.nota });
            m.cerrar(); aviso('Nota registrada.'); alGuardar();
        },
    });
    m.el.querySelector('.modal-cuerpo').append(f.el);
}

async function misCalificaciones(cont) {
    await cargarEn(cont, 'Cargando tus calificaciones…', async () => {
        const [stats, oficiales, propias] = await Promise.all([
            api.get('/estadisticas'), api.get('/tareas', { estado: 'calificada', por_pagina: 100 }), api.get('/pendientes', { con_nota: 1, limite: 300 }),
        ]);
        const recargar = () => { vaciar(cont); misCalificaciones(cont); };
        // Todas las materias de su grado, aunque todavía no tengan notas
        const materias = new Map(stats.por_materia.map((m) => [m.materia_id, { ...m, filas: [] }]));
        const sinMateria = { materia_id: null, materia: 'Sin materia', color: '#64748B', docentes: null, filas: [], total: 0 };
        for (const t of oficiales.items) {
            (materias.get(t.materia_id) ?? materias.set(t.materia_id, { materia_id: t.materia_id, materia: t.materia, color: t.color, docentes: t.profesor, filas: [], total: 0 }).get(t.materia_id))
                .filas.push({ origen: 'oficial', id: t.id, titulo: t.titulo, tipo: t.tipo, fecha: t.fecha_limite, nota: Number(t.calificacion), docente: t.profesor, comentario: t.comentario_profesor });
        }
        for (const p of propias.items) {
            (p.materia_id ? (materias.get(p.materia_id) ?? materias.set(p.materia_id, { materia_id: p.materia_id, materia: p.materia, color: p.color ?? '#64748B', docentes: null, filas: [], total: 0 }).get(p.materia_id)) : sinMateria)
                .filas.push({ origen: 'propia', id: p.id, titulo: p.titulo, tipo: p.tipo === 'tarea' ? 'tarea' : p.tipo, fecha: p.fecha_limite, nota: Number(p.nota), raw: p });
        }
        const lista = [...materias.values()].sort((a, b) => a.materia.localeCompare(b.materia));
        if (sinMateria.filas.length) lista.push(sinMateria);
        const todas = lista.flatMap((m) => m.filas.map((f) => f.nota));
        const prom = promedioDe(todas);

        return h('div', null,
            encabezadoPagina('Mis calificaciones', 'Tu registro por materia (escala 0.0 a 5.0): las notas de tus docentes y las que tú anotas',
                h('button', { class: 'btn btn-primario', type: 'button', onclick: () => registrarNota(null, recargar) }, '+ Registrar nota')),
            h('div', { class: 'estadisticas' },
                tarjetaEstadistica(fmt(prom), 'Promedio general', { icon: 'estrella', detalle: 'oficial + personal' }),
                tarjetaEstadistica(todas.length, 'Notas registradas', { icon: 'check' }),
                tarjetaEstadistica(todas.filter((n) => n >= MINIMA).length, 'Aprobadas', { icon: 'examen', detalle: `desde ${MINIMA.toFixed(1)}` }),
                tarjetaEstadistica(stats.entregadas, 'Esperando nota', { icon: 'reloj' })),
            lista.length === 0 ? vacio('Aún no tienes materias', 'Elige tu grado en Configuración para ver las materias que cursas.') :
                h('div', { class: 'materias-notas' }, lista.map((m) => {
                    const mp = promedioDe(m.filas.map((x) => x.nota));
                    return h('section', { class: 'tarjeta materia-nota', style: { '--c': m.color } },
                        h('header', { class: 'tarjeta-cab' },
                            h('div', null, h('h3', null, h('i', { class: 'punto-color', style: { background: m.color } }), m.materia),
                                m.docentes ? h('small', { class: 'autor-guia' }, icono('usuario', 13), `Docente: ${m.docentes}`) : null),
                            h('span', { class: 'cab-nota' }, h('span', { class: `nota-grande ${claseNota(mp)}` }, mp == null ? 'Sin notas' : `Promedio ${fmt(mp)}`),
                                h('button', { class: 'btn btn-chico', type: 'button', onclick: () => registrarNota(m.materia_id, recargar) }, icono('mas', 14), 'Anotar nota'))),
                        m.total ? [barraProgreso(m.progreso ?? 0, { color: m.color, etiqueta: `Avance en ${m.materia}` }), h('small', null, `${m.hechas ?? 0} de ${m.total} actividades entregadas · ${m.pendientes ?? 0} pendientes`)] : null,
                        m.filas.length ? h('div', { class: 'notas-lista' }, m.filas.sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')).map((x) => h('div', { class: 'nota-fila' },
                            h('button', { type: 'button', class: 'nota-info enlace', onclick: () => (x.origen === 'oficial' ? ir(`/tarea/${x.id}`) : editarPendiente(x.raw, {}, recargar)) },
                                h('strong', null, x.titulo), h('small', null, `${TIPOS[x.tipo === 'tarea' && x.origen === 'propia' ? 'pendiente' : x.tipo]?.nombre ?? 'Tarea'} · ${x.fecha ? fechaCorta(x.fecha) : ''}`),
                                h('span', { class: 'nota-origen' }, x.origen === 'oficial' ? insigneAsignadaPor(x.docente) : insigniaPropia())),
                            x.comentario ? h('small', { class: 'comentario' }, `“${x.comentario}”`) : null,
                            h('span', { class: `nota-valor ${claseNota(x.nota)}` }, fmt(x.nota), h('small', null, x.nota >= MINIMA ? 'Aprobado' : 'No aprobado'))))) : h('p', { class: 'ayuda' }, 'Todavía no hay notas en esta materia. Cuando tu docente califique, aparecerán aquí; también puedes anotar las tuyas.'));
                })));
    });
}

// ---------- Docente: libro de calificaciones ----------
let asignacionElegida = '';
const filtroLibro = { grado_id: '', materia_id: '' };

async function libro(cont) {
    const asigs = estado.catalogo.asignaciones;
    if (!asigs.length) {
        cont.append(encabezadoPagina('Libro de calificaciones', 'Notas de tus estudiantes por materia'), vacio('Sin materias asignadas', 'El administrador debe asignarte grados y materias.'));
        return;
    }
    const tabla = h('div', { class: 'tabla-libro-caja' });
    const selAsignacion = h('select', { 'aria-label': 'Materia y grupo', onchange: () => { asignacionElegida = selAsignacion.value; recargar(); } });
    const llenarAsignaciones = () => {
        const visibles = asigs.filter((a) => (!filtroLibro.grado_id || String(a.grado_id) === String(filtroLibro.grado_id)) && (!filtroLibro.materia_id || String(a.materia_id) === String(filtroLibro.materia_id)));
        vaciar(selAsignacion).append(visibles.length ? visibles.map((a) => h('option', { value: a.id }, `${a.materia} · ${a.grupo}${a.grado ? ` (${a.grado})` : ''}`)) : h('option', { value: '' }, 'Sin resultados'));
        if (!visibles.some((a) => String(a.id) === String(asignacionElegida))) asignacionElegida = visibles[0]?.id ?? '';
        selAsignacion.value = asignacionElegida;
    };
    const filtro = (nombre, etiqueta, opciones) => {
        const s = h('select', { 'aria-label': etiqueta, onchange: () => { filtroLibro[nombre] = s.value; llenarAsignaciones(); recargar(); } }, opciones.map((o) => h('option', { value: o.valor }, o.texto)));
        s.value = filtroLibro[nombre];
        return s;
    };

    const recargar = () => cargarEn(tabla, 'Armando el libro…', async () => {
        if (!asignacionElegida) return vacio('Ninguna materia coincide con los filtros', 'Cambia el grado o la materia.');
        const d = await api.get('/entregas/libro', { asignacion_id: asignacionElegida });
        if (!d.tareas.length) return vacio('Aún no hay actividades publicadas', 'Publica una actividad para esta materia y grupo y aquí aparecerán las notas.');
        if (!d.estudiantes.length) return vacio('El grupo no tiene estudiantes matriculados');
        const abrir = async (est, tarea) => {
            try {
                const { entregas } = await api.get(`/entregas/tarea/${tarea.id}`);
                calificar(tarea.id, entregas.find((x) => x.estudiante_id === est.id), recargar);
            } catch (e) { aviso(e.message, 'error'); }
        };
        return h('div', { class: 'tabla-responsive libro' }, h('table', { class: 'tabla tabla-libro' },
            h('thead', null, h('tr', null, h('th', { scope: 'col', class: 'fija' }, 'Estudiante'),
                d.tareas.map((t) => h('th', { scope: 'col', title: t.titulo }, h('a', { href: `#/tarea/${t.id}/entregas` }, t.titulo), h('small', null, `${TIPOS[t.tipo].nombre} · ${fechaCorta(t.fecha_limite)}`))),
                h('th', { scope: 'col' }, 'Promedio'))),
            h('tbody', null, d.estudiantes.map((est) => h('tr', null, h('th', { scope: 'row', class: 'fija' }, h('a', { href: `#/estudiante/${est.id}` }, est.nombre)),
                est.celdas.map((c, i) => h('td', null, h('button', { type: 'button', class: `celda-nota ${c.estado}${c.calificacion != null ? ' ' + claseNota(c.calificacion) : ''}`, onclick: () => abrir(est, d.tareas[i]),
                    'aria-label': `${est.nombre}, ${d.tareas[i].titulo}: ${c.calificacion != null ? fmt(c.calificacion) : c.estado === 'entregada' ? 'por calificar' : 'sin entregar'}` },
                c.calificacion != null ? fmt(c.calificacion) : c.estado === 'entregada' ? 'Calificar' : '—'))),
                h('td', null, h('strong', { class: claseNota(est.promedio) }, fmt(est.promedio)))))),
            h('tfoot', null, h('tr', null, h('th', { scope: 'row', class: 'fija' }, 'Promedio de la actividad'), d.promedios_tarea.map((p) => h('td', null, fmt(p))), h('td')))));
    });

    cont.append(encabezadoPagina('Libro de calificaciones', 'Toca una nota para calificar o editarla'),
        h('div', { class: 'agenda-filtros' },
            filtro('grado_id', 'Grado', opcionesDe(estado.catalogo.grados, 'id', 'nombre', 'Todos los grados')),
            filtro('materia_id', 'Materia', opcionesDe(estado.catalogo.materias, 'id', 'nombre', 'Todas las materias')),
            selAsignacion, h('span', { class: 'ayuda' }, `Aprobado desde ${MINIMA.toFixed(1)} · “Calificar” = entrega esperando nota`)), tabla);
    llenarAsignaciones();
    await recargar();
}

// ---------- Docente: cola por calificar (con filtros por grado y materia) ----------
export async function porCalificar(cont) {
    const f = { grado_id: '', materia_id: '' };
    const lista = h('div', { class: 'cola cola-grande' });
    const recargar = () => cargarEn(lista, 'Buscando entregas…', async () => {
        const { items } = await api.get('/entregas/por-calificar', f);
        if (!items.length) return vacio('¡Todo calificado!', 'No hay entregas esperando tu revisión con estos filtros.');
        return items.map((e) => h('div', { class: 'cola-fila grande', style: { '--c': e.color } },
            h('i'), h('div', { class: 'cola-info' }, h('strong', null, e.estudiante), h('span', null, `${e.titulo} · ${e.materia} ${e.grupo}`),
                h('small', null, `Entregó ${fechaHora(e.fecha_entrega)} (${relativa(e.fecha_entrega.slice(0, 10)).toLowerCase()})`, e.comentario ? ` — “${e.comentario}”` : '')),
            e.tardia ? insignia('Fuera de plazo', 'aviso') : null, e.tiene_archivo ? h('a', { class: 'btn btn-chico', href: `/api/entregas/${e.entrega_id}/archivo`, download: '' }, icono('descargar', 14), 'Archivo') : null,
            h('button', { class: 'btn btn-primario btn-chico', type: 'button', onclick: () => calificar(e.tarea_id, {
                entrega_id: e.entrega_id, estudiante_id: e.estudiante_id, nombre: e.estudiante, comentario: e.comentario, tiene_archivo: e.tiene_archivo,
                archivo_nombre: e.archivo_nombre, calificacion: null, comentario_profesor: '',
            }, recargar) }, 'Calificar')));
    });
    const sel = (nombre, etiqueta, opciones) => {
        const s = h('select', { 'aria-label': etiqueta, onchange: () => { f[nombre] = s.value; recargar(); } }, opciones.map((o) => h('option', { value: o.valor }, o.texto)));
        return s;
    };
    cont.append(encabezadoPagina('Por calificar', 'Entregas de tus estudiantes esperando nota (las más antiguas primero)'),
        h('div', { class: 'agenda-filtros' }, sel('grado_id', 'Grado', opcionesDe(estado.catalogo.grados, 'id', 'nombre', 'Todos los grados')), sel('materia_id', 'Materia', opcionesDe(estado.catalogo.materias, 'id', 'nombre', 'Todas las materias'))), lista);
    await recargar();
}

export { confirmar };
