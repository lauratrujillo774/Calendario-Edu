// Lista de tareas, detalle de tarea, seguimiento de entregas, estudiantes y grupos.
import { api } from '../api.js';
import { estado, esEstudiante, esAdmin, puedeGestionar } from '../estado.js';
import { h, icono, vaciar, cargarEn, vacio, aviso, confirmar, modal, formulario, opcionesDe, insignia, retardo } from '../ui.js';
import {
    tarjetaTarea, encabezadoPagina, insigniaEstado, insigniaPrioridad, insigniaTipo, enlaceVolver, tarjetaEstadistica, barraProgreso,
    opcionesTipos, opcionesPrioridades, ESTADOS_ENTREGA, insigneAsignadaPor, insigniaPropia,
} from '../comp.js';
import { editarTarea, editarRecordatorio, editarPendiente, editarNota } from '../formularios.js';
import { fechaLarga, fechaHora, horaCorta, relativa, hoy, fechaCorta } from '../fechas.js';
import { ir } from '../ruta.js';

const filtrosLista = { tab: '', materia_id: '', grado_id: '', tipo: '', prioridad: '', desde: '', hasta: '', q: '', pagina: 1 };

// ================= Lista =================
export async function tareas(cont) {
    const f = filtrosLista;
    const tabs = esEstudiante()
        ? [['', 'Todas'], ['pendiente', 'Por hacer'], ['entregada', 'Entregadas'], ['calificada', 'Calificadas'], ['vencida', 'Vencidas']]
        : [['', 'Todas'], ['publicada', 'Publicadas'], ['borrador', 'Borradores']];
    const lista = h('div', { class: 'lista-tareas' });
    const pie = h('div', { class: 'paginacion' });
    const contadorTotal = h('p', { class: 'ayuda', role: 'status' });

    const recargar = () => {
        pintarTabs();
        return cargarEn(lista, 'Cargando actividades…', async () => {
            const r = await api.get('/tareas', { estado: f.tab, materia_id: f.materia_id, grado_id: f.grado_id, tipo: f.tipo, prioridad: f.prioridad, desde: f.desde, hasta: f.hasta, q: f.q, pagina: f.pagina, por_pagina: 20 });
            const paginas = Math.max(1, Math.ceil(r.total / r.por_pagina));
            contadorTotal.textContent = `${r.total} actividad${r.total === 1 ? '' : 'es'}`;
            vaciar(pie).append(paginas > 1 ? [
                h('button', { class: 'btn', type: 'button', disabled: f.pagina <= 1, onclick: () => { f.pagina--; recargar(); } }, '← Anterior'),
                h('span', null, `Página ${f.pagina} de ${paginas}`),
                h('button', { class: 'btn', type: 'button', disabled: f.pagina >= paginas, onclick: () => { f.pagina++; recargar(); } }, 'Siguiente →'),
            ] : []);
            if (!r.items.length) {
                return vacio('Sin actividades', esEstudiante() ? 'No encontramos actividades con estos filtros. Si acabas de registrarte, pídele al administrador que te asigne a un grupo.' : 'Aún no hay actividades con estos filtros.',
                    !esEstudiante() ? h('button', { class: 'btn btn-primario', type: 'button', onclick: () => editarTarea(null, recargar) }, 'Crear actividad') : null);
            }
            return r.items.map((t) => tarjetaTarea(t, () => ir(`/tarea/${t.id}`)));
        });
    };

    const barraTabs = h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Estado' });
    function pintarTabs() {
        vaciar(barraTabs).append(tabs.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(f.tab === v), class: f.tab === v ? 'activo' : '',
            onclick: () => { f.tab = v; f.pagina = 1; recargar(); } }, t)));
    }
    const sel = (nombre, etiqueta, opciones) => {
        const s = h('select', { 'aria-label': etiqueta, onchange: () => { f[nombre] = s.value; f.pagina = 1; recargar(); } }, opciones.map((o) => h('option', { value: o.valor }, o.texto)));
        s.value = f[nombre];
        return s;
    };
    const fecha = (nombre, etiqueta) => {
        const i = h('input', { type: 'date', 'aria-label': etiqueta, value: f[nombre], onchange: () => { f[nombre] = i.value; f.pagina = 1; recargar(); } });
        return h('label', { class: 'filtro-fecha' }, h('span', null, etiqueta), i);
    };
    const buscador = h('input', { type: 'search', placeholder: 'Buscar por título…', 'aria-label': 'Buscar', value: f.q,
        oninput: retardo(() => { f.q = buscador.value.trim(); f.pagina = 1; recargar(); }, 350) });

    // ----- Mis tareas personales (solo estudiantes): las que yo mismo agrego -----
    const personales = h('div', { class: 'pendientes-lista' });
    const recargarPersonales = () => cargarEn(personales, 'Cargando tus tareas…', async () => {
        const { items } = await api.get('/pendientes', { tipo: 'tarea', limite: 100 });
        if (!items.length) return h('p', { class: 'ayuda' }, 'Aún no has agregado tareas propias. Usa “+ Agregar tarea” para anotar lo que tú quieras hacer.');
        return items.map((p) => h('div', { class: `pend-tarjeta prio-${p.prioridad}${p.completado ? ' hecho' : ''}` },
            h('input', { type: 'checkbox', checked: p.completado, 'aria-label': `Marcar “${p.titulo}” como ${p.completado ? 'pendiente' : 'hecha'}`, onchange: async (e) => {
                try { await api.patch(`/pendientes/${p.id}/completar`, { completado: e.target.checked }); recargarPersonales(); } catch (er) { aviso(er.message, 'error'); e.target.checked = !e.target.checked; }
            } }),
            h('button', { type: 'button', class: 'pend-cuerpo', onclick: () => editarPendiente(p, {}, recargarPersonales) },
                h('strong', null, p.titulo), p.descripcion ? h('span', { class: 'ayuda' }, p.descripcion) : null,
                h('span', { class: 'pend-meta' }, insigniaPropia(), p.materia ? h('span', null, icono('libro', 13), p.materia) : null,
                    p.fecha_limite ? h('span', { class: p.vencido ? 'texto-mal' : '' }, icono(p.vencido ? 'alerta' : 'reloj', 13), `${fechaCorta(p.fecha_limite)}${p.hora ? ` · ${horaCorta(p.hora)}` : ''}${p.vencido ? ' (vencida)' : ''}`) : null)),
            h('button', { class: 'btn-icono chico', type: 'button', 'aria-label': `Eliminar ${p.titulo}`, onclick: async () => {
                if (!(await confirmar({ mensaje: '¿Eliminar esta tarea?', textoOk: 'Eliminar', peligro: true }))) return;
                try { await api.del(`/pendientes/${p.id}`); recargarPersonales(); } catch (er) { aviso(er.message, 'error'); }
            } }, icono('papelera', 16))));
    });

    cont.append(
        encabezadoPagina(esEstudiante() ? 'Mis tareas' : 'Actividades', esEstudiante() ? 'Las que te asignan tus docentes y las que tú mismo agregas' : 'Tareas, trabajos, exámenes y proyectos de tus grupos',
            puedeGestionar() ? h('button', { class: 'btn btn-primario', type: 'button', onclick: () => editarTarea(null, recargar) }, '+ Nueva actividad')
                : h('button', { class: 'btn btn-primario', type: 'button', onclick: () => editarPendiente(null, { tipo: 'tarea', fecha: hoy() }, recargarPersonales) }, '+ Agregar tarea')),
        barraTabs,
        h('div', { class: 'agenda-filtros' },
            h('div', { class: 'buscador' }, icono('buscar', 16), buscador),
            sel('materia_id', 'Materia', opcionesDe(estado.catalogo.materias, 'id', 'nombre', 'Todas las materias')),
            !esEstudiante() ? sel('grado_id', 'Grado', opcionesDe(estado.catalogo.grados, 'id', 'nombre', 'Todos los grados')) : null,
            sel('tipo', 'Tipo', [{ valor: '', texto: 'Todos los tipos' }, ...opcionesTipos]),
            sel('prioridad', 'Prioridad', [{ valor: '', texto: 'Cualquier prioridad' }, ...opcionesPrioridades]),
            fecha('desde', 'Desde'), fecha('hasta', 'Hasta'),
            h('button', { class: 'btn btn-texto', type: 'button', onclick: () => { Object.assign(f, { tab: '', materia_id: '', grado_id: '', tipo: '', prioridad: '', desde: '', hasta: '', q: '', pagina: 1 }); cont.replaceChildren(); tareas(cont); } }, 'Quitar filtros')),
        contadorTotal, lista, pie,
        esEstudiante() ? [h('h2', { class: 'subtitulo-seccion' }, icono('editar', 18), 'Mis tareas personales'), personales] : null);
    if (esEstudiante()) recargarPersonales();
    await recargar();
}

// ================= Detalle =================
export async function detalleTarea(cont, [id]) {
    await cargarEn(cont, 'Abriendo la actividad…', async () => {
        const { tarea: t } = await api.get(`/tareas/${id}`);
        const recargar = () => { vaciar(cont); detalleTarea(cont, [id]); };
        const nombreAdjunto = t.archivo_url?.split('|')[1];
        const est = esEstudiante();

        const meta = h('div', { class: 'detalle-meta' },
            h('p', { class: 'detalle-linea' }, h('span', { class: 'punto-color', style: { background: t.color } }), `${t.materia} · Grupo ${t.grupo}`),
            h('p', { class: 'detalle-linea' }, icono('usuario', 16), est ? `Asignada por tu docente: ${t.profesor}` : `Docente: ${t.profesor}`),
            h('p', { class: 'detalle-linea' }, icono('reloj', 16), `Entrega: ${fechaLarga(t.fecha_limite)}, ${horaCorta(t.hora_limite)} (${relativa(t.fecha_limite).toLowerCase()})`));

        const bloques = [
            enlaceVolver('Volver'),
            h('article', { class: 'papel detalle-tarea', style: { '--c': t.color } },
                h('header', null,
                    h('div', { class: 'insignias' }, insigniaTipo(t.tipo), insigniaPrioridad(t.prioridad), insigniaEstado(t), est ? insigneAsignadaPor(t.profesor) : null),
                    h('h1', null, t.titulo)),
                meta,
                t.descripcion ? h('div', { class: 'texto-largo' }, t.descripcion) : h('p', { class: 'ayuda' }, 'Sin descripción.'),
                t.archivo_url ? h('a', { class: 'btn', href: `/api/tareas/${t.id}/archivo`, download: '' }, icono('descargar', 16), `Material: ${nombreAdjunto ?? 'descargar'}`) : null),
        ];

        if (est) bloques.push(seccionEntregaEstudiante(t, recargar));
        else bloques.push(seccionGestion(t, recargar, cont));

        // Herramientas personales (nunca modifican la tarea oficial)
        bloques.push(h('section', { class: 'tarjeta herramientas' },
            h('h3', null, 'Mi agenda personal'),
            h('p', { class: 'ayuda' }, 'Crea recordatorios, pendientes o notas privadas sobre esta actividad. La actividad original no cambia.'),
            h('div', { class: 'acciones inicio' },
                h('button', { class: 'btn', type: 'button', onclick: () => editarRecordatorio({ tarea_id: t.id, titulo: t.titulo }) }, icono('campana', 16), 'Crear recordatorio'),
                h('button', { class: 'btn', type: 'button', onclick: () => editarPendiente(null, { tarea: t, fecha: t.fecha_limite }) }, icono('check', 16), 'Añadir pendiente'),
                h('button', { class: 'btn', type: 'button', onclick: () => editarNota(null, { tarea: t, fecha: t.fecha_limite }) }, icono('nota', 16), 'Escribir nota'))));
        return h('div', { class: 'detalle-pagina' }, bloques);
    });
}

function seccionEntregaEstudiante(t, recargar) {
    const calificada = t.estado === 'calificada';
    const resumen = h('div', { class: 'tarjeta' }, h('h3', null, 'Mi entrega'));
    if (calificada) {
        resumen.append(h('div', { class: 'nota-final' }, h('strong', null, Number(t.calificacion).toFixed(1)), h('span', null, 'de 5.0')),
            t.comentario_profesor ? h('blockquote', null, t.comentario_profesor, h('cite', null, `— ${t.profesor}`)) : h('p', { class: 'ayuda' }, 'Sin comentarios del profesor.'));
    }
    if (t.estado === 'entregada' || calificada) {
        resumen.append(h('p', { class: 'detalle-linea' }, icono('check', 16), `Entregada el ${fechaHora(t.fecha_entrega)}`),
            t.comentario_estudiante ? h('p', { class: 'texto-largo' }, `Tu comentario: ${t.comentario_estudiante}`) : null,
            t.entrega_archivo ? h('a', { class: 'btn btn-chico', href: `/api/entregas/${t.entrega_id}/archivo`, download: '' }, icono('descargar', 14), `Tu archivo: ${t.entrega_archivo}`) : null);
    } else if (t.vencida) {
        resumen.append(h('p', { class: 'aviso-inline mal' }, icono('alerta', 16), 'La fecha límite ya pasó. Aún puedes entregar, pero quedará fuera de plazo.'));
    }
    if (!calificada) {
        const f = formulario({
            enviar: t.estado === 'entregada' ? 'Actualizar entrega' : 'Entregar actividad', cancelar: false,
            campos: [
                { nombre: 'comentario', etiqueta: 'Comentario para el profesor (opcional)', tipo: 'textarea', filas: 3, max: 500 },
                { nombre: 'archivo', etiqueta: 'Archivo (opcional, máx. 5 MB)', tipo: 'file', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip' },
            ],
            alEnviar: async (v) => {
                if (!v.comentario.trim() && !v.archivo && !t.entrega_archivo) throw new Error('Escribe un comentario o adjunta un archivo para entregar.');
                const form = new FormData();
                form.append('comentario', v.comentario);
                if (v.archivo) form.append('archivo', v.archivo);
                await api.subir(`/entregas/tarea/${t.id}`, form);
                aviso('¡Entrega enviada!');
                recargar();
            },
        });
        resumen.append(f.el);
    }
    return resumen;
}

function seccionGestion(t, recargar, cont) {
    const total = t.total_estudiantes;
    const hechas = t.entregadas + t.calificadas;
    return h('section', { class: 'tarjeta' },
        h('h3', null, 'Seguimiento'),
        h('div', { class: 'estadisticas' },
            tarjetaEstadistica(total, 'Estudiantes'), tarjetaEstadistica(t.pendientes, 'Pendientes'),
            tarjetaEstadistica(t.entregadas, 'Por revisar', { clase: t.entregadas ? 'resalta' : '' }), tarjetaEstadistica(t.calificadas, 'Calificadas')),
        barraProgreso(total ? Math.round((hechas * 100) / total) : 0, { color: t.color, etiqueta: 'Entregas recibidas' }),
        !t.publicada ? h('p', { class: 'aviso-inline' }, icono('editar', 16), 'Es un borrador: los estudiantes todavía no la ven.') : null,
        h('div', { class: 'acciones inicio' },
            h('button', { class: 'btn btn-primario', type: 'button', onclick: () => ir(`/tarea/${t.id}/entregas`) }, icono('usuarios', 16), 'Ver entregas'),
            h('button', { class: 'btn', type: 'button', onclick: () => editarTarea(t, recargar) }, icono('editar', 16), 'Editar'),
            h('button', { class: 'btn', type: 'button', onclick: async () => {
                try {
                    await api.post(`/tareas/${t.id}/publicar`, { publicada: !t.publicada });
                    aviso(t.publicada ? 'Ahora es un borrador.' : 'Actividad publicada.');
                    recargar();
                } catch (e) { aviso(e.message, 'error'); }
            } }, t.publicada ? 'Pasar a borrador' : 'Publicar'),
            t.archivo_url ? h('button', { class: 'btn', type: 'button', onclick: async () => {
                if (!(await confirmar({ mensaje: '¿Quitar el material adjunto?', textoOk: 'Quitar', peligro: true }))) return;
                try { await api.del(`/tareas/${t.id}/archivo`); recargar(); } catch (e) { aviso(e.message, 'error'); }
            } }, 'Quitar adjunto') : null,
            h('button', { class: 'btn btn-texto-peligro', type: 'button', onclick: async () => {
                if (!(await confirmar({ titulo: 'Eliminar actividad', mensaje: 'Se borrarán también las entregas y calificaciones de los estudiantes. Esta acción no se puede deshacer.', textoOk: 'Eliminar', peligro: true }))) return;
                try { await api.del(`/tareas/${t.id}`); aviso('Actividad eliminada.'); ir('/tareas'); } catch (e) { aviso(e.message, 'error'); }
            } }, icono('borrar', 16), 'Eliminar')));
}

// ================= Entregas de una tarea (profesor) =================
export async function entregasTarea(cont, [id]) {
    await cargarEn(cont, 'Cargando entregas…', async () => {
        const { tarea, entregas } = await api.get(`/entregas/tarea/${id}`);
        const recargar = () => { vaciar(cont); entregasTarea(cont, [id]); };
        const porRevisar = entregas.filter((e) => e.estado === 'entregada').length;
        return h('div', { class: 'detalle-pagina' },
            enlaceVolver('Volver a la actividad', `#/tarea/${id}`),
            encabezadoPagina(tarea.titulo, `${tarea.materia} · Grupo ${tarea.grupo} · ${porRevisar} por revisar`),
            entregas.length === 0 ? vacio('Sin estudiantes', 'Este grupo todavía no tiene estudiantes matriculados.') :
                h('div', { class: 'tabla-responsive' }, h('table', { class: 'tabla' },
                    h('thead', null, h('tr', null, ['Estudiante', 'Estado', 'Entrega', 'Archivo / comentario', 'Nota', ''].map((x) => h('th', { scope: 'col' }, x)))),
                    h('tbody', null, entregas.map((e) => h('tr', null,
                        h('td', { 'data-etiqueta': 'Estudiante' }, h('a', { href: `#/estudiante/${e.estudiante_id}` }, e.nombre), h('small', null, e.correo)),
                        h('td', { 'data-etiqueta': 'Estado' }, h('span', { class: `insignia ${e.estado === 'pendiente' ? 'neutro' : 'ok'}` }, ESTADOS_ENTREGA[e.estado])),
                        h('td', { 'data-etiqueta': 'Entrega' }, e.fecha_entrega ? fechaHora(e.fecha_entrega) : '—'),
                        h('td', { 'data-etiqueta': 'Detalle' },
                            e.tiene_archivo ? h('a', { href: `/api/entregas/${e.entrega_id}/archivo`, download: '' }, icono('descargar', 14), ` ${e.archivo_nombre ?? 'archivo'}`) : null,
                            e.comentario ? h('p', { class: 'ayuda' }, `“${e.comentario}”`) : (!e.tiene_archivo ? '—' : null)),
                        h('td', { 'data-etiqueta': 'Nota' }, e.calificacion != null ? h('strong', null, Number(e.calificacion).toFixed(1)) : '—'),
                        h('td', null, h('button', { class: `btn btn-chico${e.estado === 'entregada' ? ' btn-primario' : ''}`, type: 'button', onclick: () => calificar(tarea.id, e, recargar) },
                            e.estado === 'calificada' ? 'Editar nota' : 'Calificar'))))))));
    });
}

export async function calificar(tareaId, e, recargar) {
    const m = modal({ titulo: `Calificar a ${e.nombre}`, cuerpo: '' });
    // Borrador de retroalimentación con IA: solo rellena el cuadro de texto; el docente lo revisa y decide si lo guarda
    const botonIA = e.entrega_id ? h('button', { class: 'btn btn-chico btn-ia', type: 'button', onclick: async (ev) => {
        const boton = ev.currentTarget;
        boton.disabled = true;
        boton.classList.add('cargando');
        try {
            const r = await api.post('/ia/retroalimentacion', { entrega_id: e.entrega_id, calificacion: f.campo('calificacion').value || undefined });
            f.campo('comentario_profesor').value = r.texto;
            aviso('Borrador de IA listo: revísalo y edítalo antes de guardar.');
        } catch (err) { aviso(err.message, 'error'); }
        boton.disabled = false;
        boton.classList.remove('cargando');
    } }, icono('estrella', 15), 'Sugerir retroalimentación con IA') : null;
    const f = formulario({
        enviar: 'Guardar calificación', alCancelar: m.cerrar,
        campos: [
            { nombre: 'calificacion', etiqueta: 'Calificación (0.0 a 5.0)', tipo: 'number', min: 0, maxValor: 5, paso: '0.1', requerido: true, valor: e.calificacion ?? '' },
            { nombre: 'comentario_profesor', etiqueta: 'Retroalimentación para el estudiante', tipo: 'textarea', filas: 4, max: 1000, valor: e.comentario_profesor ?? '' },
        ],
        extra: [e.comentario ? h('p', { class: 'ayuda' }, `Comentario del estudiante: “${e.comentario}”`) : null,
            e.tiene_archivo ? h('a', { href: `/api/entregas/${e.entrega_id}/archivo`, download: '' }, `Descargar ${e.archivo_nombre ?? 'archivo'}`) : null,
            h('div', { class: 'fila-ia' }, botonIA)],
        alEnviar: async (v) => {
            let entregaId = e.entrega_id;
            if (!entregaId) entregaId = (await api.post(`/entregas/tarea/${tareaId}/estudiante/${e.estudiante_id}`)).id;
            await api.put(`/entregas/${entregaId}/calificar`, v);
            m.cerrar();
            aviso('Calificación guardada.');
            recargar();
        },
    });
    m.el.querySelector('.modal-cuerpo').append(f.el);
}

// ================= Estudiante (profesor) =================
export async function detalleEstudiante(cont, [id]) {
    await cargarEn(cont, 'Cargando estudiante…', async () => {
        const { estudiante, entregas } = await api.get(`/entregas/estudiante/${id}`);
        const c = (e) => entregas.filter((x) => x.estado === e).length;
        return h('div', { class: 'detalle-pagina' },
            enlaceVolver('Volver'),
            encabezadoPagina(estudiante.nombre, estudiante.correo),
            h('div', { class: 'estadisticas' }, tarjetaEstadistica(entregas.length, 'Actividades'), tarjetaEstadistica(c('pendiente'), 'Pendientes'),
                tarjetaEstadistica(c('entregada'), 'Por revisar'), tarjetaEstadistica(c('calificada'), 'Calificadas')),
            entregas.length === 0 ? vacio('Sin actividades', 'Este estudiante no tiene actividades tuyas.') :
                h('div', { class: 'lista-tareas' }, entregas.map((e) => h('button', { type: 'button', class: 'tarjeta-tarea', style: { '--c': e.color }, onclick: () => ir(`/tarea/${e.tarea_id}`) },
                    h('div', { class: 'tt-fecha' }, h('strong', null, fechaCorta(e.fecha_limite)), h('span', null, horaCorta(e.hora_limite))),
                    h('div', { class: 'tt-cuerpo' }, h('div', { class: 'tt-titulo' }, e.titulo), h('div', { class: 'tt-meta' }, `${e.materia} · ${e.grupo}`),
                        h('div', { class: 'tt-insignias' }, insigniaTipo(e.tipo), h('span', { class: `insignia ${e.estado === 'pendiente' ? 'neutro' : 'ok'}` }, ESTADOS_ENTREGA[e.estado]),
                            e.calificacion != null ? insignia(`Nota ${Number(e.calificacion).toFixed(1)}`, 'ok') : null,
                            !e.publicada ? insignia('Borrador', 'aviso') : null))))));
    });
}

// ================= Grupo (profesor) =================
export async function detalleGrupo(cont, [id]) {
    await cargarEn(cont, 'Cargando grupo…', async () => {
        const { grupo, estudiantes } = await api.get(`/entregas/grupo/${id}`);
        return h('div', { class: 'detalle-pagina' },
            enlaceVolver('Volver al seguimiento', '#/seguimiento'),
            encabezadoPagina(`Grupo ${grupo.nombre}`, `${estudiantes.length} estudiantes · ${grupo.anio}`),
            estudiantes.length === 0 ? vacio('Grupo sin estudiantes', 'El administrador puede matricular estudiantes en este grupo.') :
                h('div', { class: 'tabla-responsive' }, h('table', { class: 'tabla' },
                    h('thead', null, h('tr', null, ['Estudiante', 'Avance', 'Pendientes', 'Por revisar', 'Promedio'].map((x) => h('th', { scope: 'col' }, x)))),
                    h('tbody', null, estudiantes.map((e) => {
                        const hechas = e.entregadas + e.calificadas;
                        const pct = e.total ? Math.round((hechas * 100) / e.total) : 0;
                        return h('tr', null,
                            h('td', { 'data-etiqueta': 'Estudiante' }, h('a', { href: `#/estudiante/${e.id}` }, e.nombre), h('small', null, e.correo)),
                            h('td', { 'data-etiqueta': 'Avance' }, h('div', { class: 'avance-celda' }, barraProgreso(pct, { etiqueta: `Avance de ${e.nombre}` }), h('span', null, `${pct}% (${hechas}/${e.total})`))),
                            h('td', { 'data-etiqueta': 'Pendientes' }, e.pendientes), h('td', { 'data-etiqueta': 'Por revisar' }, e.entregadas),
                            h('td', { 'data-etiqueta': 'Promedio' }, e.promedio ?? '—'));
                    })))));
    });
}

// ================= Seguimiento (profesor / admin) =================
export async function seguimiento(cont) {
    await cargarEn(cont, 'Cargando seguimiento…', async () => {
        const [stats, pendientes] = await Promise.all([api.get('/estadisticas'), api.get('/tareas', { por_pagina: 100, estado: 'publicada' })]);
        const porRevisar = pendientes.items.filter((t) => t.entregadas > 0);
        return h('div', null,
            encabezadoPagina('Seguimiento', 'Cumplimiento de tus grupos y entregas por revisar'),
            h('div', { class: 'estadisticas' },
                tarjetaEstadistica(stats.por_revisar, 'Entregas por revisar', { icon: 'check', clase: stats.por_revisar ? 'resalta' : '' }),
                tarjetaEstadistica(stats.pendientes, 'Entregas pendientes', { icon: 'reloj' }),
                tarjetaEstadistica(stats.calificadas, 'Calificadas', { icon: 'estrella' }),
                tarjetaEstadistica(stats.borradores, 'Borradores', { icon: 'editar' })),
            h('h2', { class: 'subtitulo-seccion' }, 'Por revisar'),
            porRevisar.length ? h('div', { class: 'lista-tareas' }, porRevisar.map((t) => tarjetaTarea(t, () => ir(`/tarea/${t.id}/entregas`)))) : h('p', { class: 'ayuda' }, 'No tienes entregas esperando revisión. 🎉'),
            h('h2', { class: 'subtitulo-seccion' }, 'Grupos'),
            h('div', { class: 'rejilla' }, estado.catalogo.grupos.map((g) => {
                const filas = stats.por_grupo.filter((x) => x.grupo === g.nombre);
                const prom = filas.length ? Math.round(filas.reduce((a, x) => a + x.progreso, 0) / filas.length) : 0;
                return h('a', { class: 'tarjeta tarjeta-grupo', href: `#/grupo/${g.id}` },
                    h('h3', null, `Grupo ${g.nombre}`), h('p', { class: 'ayuda' }, filas.map((x) => x.materia).join(' · ') || 'Sin actividades publicadas'),
                    barraProgreso(prom, { etiqueta: `Avance del grupo ${g.nombre}` }), h('small', null, `${prom}% de entregas recibidas`));
            })));
    });
}
