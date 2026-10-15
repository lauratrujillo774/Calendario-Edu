// Pantalla de inicio (cambia según el rol). Todos los números salen de la base de datos.
// Orden pensado para leerse de un vistazo: saludo y resumen → lo que viene → acciones rápidas → detalle; a la derecha, lo que hay que atender hoy.
import { api } from '../api.js';
import { estado, esEstudiante, esAdmin } from '../estado.js';
import { h, icono, vaciar, vacio, cargarEn, aviso, confirmar, insignia } from '../ui.js';
import {
    chip, tarjetaEstadistica, fraseDelDia, COLOR_TIPO, PRIORIDADES, TIPOS, avatar, insigneAsignadaPor, insigniaPropia,
} from '../comp.js';
import { editarTarea, editarAviso, editarEvento, editarPendiente } from '../formularios.js';
import { abrirItem } from './items.js';
import { calendarioMes } from '../calendario-mes.js';
import { ir } from '../ruta.js';
import { hoy, sumarDias, fechaCorta, fechaHora, relativa, horaCorta, saludo, diferenciaDias, ahoraParaInput, nombreDiaCorto, diaDelMes } from '../fechas.js';

const seguro = (p) => p.catch(() => null);
const colorDe = (x) => x.color ?? COLOR_TIPO[x.tipo] ?? 'var(--tarea)';

const FRASES_BANNER = {
    estudiante: 'Organiza tus tareas, cumple tus metas y haz que cada día cuente.',
    profesor: 'Revisa entregas, califica y acompaña el avance de tus grupos.',
    admin: 'Gestiona estudiantes, docentes y la estructura académica de la institución.',
};

const pastilla = (texto, ico, clase = '') => h('span', { class: `resumen-chip ${clase}` }, icono(ico, 15), texto);

const banner = (nombre, chips) => h('section', { class: 'banner' },
    h('div', { class: 'banner-texto' }, h('h1', null, `¡${saludo()}, ${nombre}!`), h('p', null, FRASES_BANNER[estado.usuario.rol]),
        h('small', { class: 'frase-banner' }, `“${fraseDelDia()}”`),
        chips.length ? h('div', { class: 'resumen-chips' }, chips) : null),
    h('div', { class: 'banner-foto' }, avatar(estado.usuario, 84)));

const tarjeta = (titulo, ico, contenido, enlace, clase = '') => h('section', { class: `tarjeta ${clase}` },
    h('header', { class: 'tarjeta-cab' }, h('h3', null, icono(ico, 18), titulo), enlace ? h('a', { href: enlace[1] }, enlace[0]) : null), contenido);

// Tarjetas de acceso rápido de colores
const accion = (clase, ico, titulo, detalle, fn) => h('button', { type: 'button', class: `accion ${clase}`, onclick: fn },
    h('span', { class: 'accion-icono' }, icono(ico, 26)), h('span', { class: 'accion-texto' }, h('strong', null, titulo), h('small', null, detalle)));

function eventosImportantes(items) {
    const util = items.filter((x) => ['tarea', 'evento', 'pendiente'].includes(x.origen) && !x.completado && !['entregada', 'calificada'].includes(x.estado));
    const fuertes = util.filter((x) => ['examen', 'proyecto', 'evento'].includes(x.tipo) || x.prioridad === 'alta');
    const lista = (fuertes.length >= 3 ? fuertes : util).slice(0, 5);
    return tarjeta('Eventos importantes', 'estrella', lista.length
        ? h('div', { class: 'eventos-imp' }, lista.map((x) => h('button', { type: 'button', class: 'evento-imp', style: { '--c': colorDe(x) }, onclick: () => abrirItem(x) },
            h('i', { 'aria-hidden': 'true' }), h('span', null, h('strong', null, x.titulo), h('small', null, `${fechaCorta(x.fecha)}${x.hora ? ` · ${x.hora}` : ''} — ${TIPOS[x.tipo]?.nombre ?? ''}`)))))
        : h('p', { class: 'ayuda' }, 'No tienes eventos importantes en los próximos 30 días.'), ['Ver calendario', '#/agenda']);
}

// ---------- "Tu siguiente paso": lo único que importa ahora, grande y con un botón ----------
function siguientePaso(items, cola, recargar) {
    const ahora = ahoraParaInput(0);
    const siguiente = items.find((x) => ['tarea', 'evento', 'pendiente'].includes(x.origen) && !x.completado && !['entregada', 'calificada'].includes(x.estado)
        && `${x.fecha}T${x.hora ?? '23:59'}` >= ahora);
    if (!esEstudiante() && cola.length) {
        return h('section', { class: 'siguiente urgente' },
            h('span', { class: 'siguiente-icono' }, icono('check', 30)),
            h('div', { class: 'siguiente-texto' }, h('small', null, 'Tu siguiente paso'), h('h2', null, `${cola.length} entrega${cola.length === 1 ? '' : 's'} por calificar`),
                h('p', null, `La más antigua: ${cola[0].estudiante} · ${cola[0].titulo}`)),
            h('a', { class: 'btn btn-primario', href: '#/por-calificar' }, 'Calificar ahora'));
    }
    if (!siguiente) {
        return h('section', { class: 'siguiente libre' },
            h('span', { class: 'siguiente-icono' }, icono('estrella', 30)),
            h('div', { class: 'siguiente-texto' }, h('small', null, 'Tu siguiente paso'), h('h2', null, 'Nada urgente por ahora'),
                h('p', null, esEstudiante() ? 'Buen momento para adelantar algo, repasar o escribir en tu diario.' : 'Aprovecha para planear tu próxima clase.')),
            h('a', { class: 'btn btn-primario', href: '#/diario' }, esEstudiante() ? 'Abrir mi diario' : 'Planear una clase'));
    }
    const dias = diasPara(siguiente.fecha);
    const cuando = dias === 0 ? `Hoy${siguiente.hora ? ` a las ${horaCorta(siguiente.hora)}` : ''}` : dias === 1 ? 'Mañana' : `En ${dias} días · ${fechaCorta(siguiente.fecha)}`;
    return h('section', { class: `siguiente${dias <= 1 ? ' urgente' : ''}`, style: { '--c': colorDe(siguiente) } },
        h('span', { class: 'siguiente-icono' }, icono(siguiente.tipo === 'examen' ? 'examen' : 'reloj', 30)),
        h('div', { class: 'siguiente-texto' }, h('small', null, `Tu siguiente paso · ${TIPOS[siguiente.tipo]?.nombre ?? 'Actividad'}`), h('h2', null, siguiente.titulo), h('p', null, `${cuando}${siguiente.materia ? ` · ${siguiente.materia}` : ''}`)),
        h('button', { class: 'btn btn-primario', type: 'button', onclick: () => abrirItem(siguiente, recargar) }, 'Abrir'));
}

// ---------- Tira de la semana: 7 días, con puntos según lo que hay cada día ----------
function tiraSemana(items) {
    const h0 = hoy();
    const dias = Array.from({ length: 7 }, (_, i) => sumarDias(h0, i));
    return h('section', { class: 'tarjeta tira-semana', 'aria-label': 'Próximos 7 días' },
        h('header', { class: 'tarjeta-cab' }, h('h3', null, icono('agenda', 18), 'Esta semana'), h('a', { href: '#/agenda' }, 'Calendario')),
        h('div', { class: 'tira-dias' }, dias.map((d) => {
            const delDia = items.filter((x) => x.fecha === d && !x.completado && !['entregada', 'calificada'].includes(x.estado));
            const hayExamen = delDia.some((x) => x.tipo === 'examen');
            return h('a', { class: `tira-dia${d === h0 ? ' es-hoy' : ''}${delDia.length ? ' con-cosas' : ''}`, href: `#/agenda?fecha=${d}`,
                'aria-label': `${fechaCorta(d)}: ${delDia.length ? `${delDia.length} cosa${delDia.length === 1 ? '' : 's'}${hayExamen ? ', incluye examen' : ''}` : 'libre'}` },
            h('small', null, nombreDiaCorto(d)), h('strong', null, diaDelMes(d)),
            h('span', { class: `tira-marca${hayExamen ? ' examen' : ''}` }, delDia.length ? String(delDia.length) : ''));
        })));
}

// ---------- Primeros pasos: guía corta mientras la persona estrena la app (se puede ocultar) ----------
function primerosPasos(pasos) {
    const clave = `educal_pasos_${estado.usuario.id}`;
    let oculto = false;
    try { oculto = localStorage.getItem(clave) === '1'; } catch { /* sin almacenamiento */ }
    const hechos = pasos.filter((p) => p.hecho).length;
    if (oculto || hechos === pasos.length) return null;
    const caja = h('section', { class: 'tarjeta primeros-pasos' },
        h('header', { class: 'tarjeta-cab' }, h('h3', null, icono('objetivo', 18), `Primeros pasos · ${hechos} de ${pasos.length}`),
            h('button', { class: 'btn btn-texto btn-chico', type: 'button', onclick: () => { try { localStorage.setItem(clave, '1'); } catch { /* ignorar */ } caja.remove(); } }, 'Ocultar')),
        h('div', { class: 'progreso' }, h('div', { class: 'progreso-relleno', style: { width: `${(hechos * 100) / pasos.length}%` } })),
        h('ul', { class: 'pasos' }, pasos.map((p) => h('li', { class: p.hecho ? 'hecho' : '' }, p.hecho ? icono('check', 16) : h('i', { 'aria-hidden': 'true' }),
            p.hecho ? h('span', null, p.texto) : h('a', { href: p.href }, p.texto)))));
    return caja;
}

// Accesos secundarios: una sola fila de enlaces pequeños al final de la página
const masHerramientas = (enlaces) => h('nav', { class: 'mas-herramientas', 'aria-label': 'Más herramientas' },
    h('span', { class: 'etiqueta-mini' }, 'Más herramientas'),
    h('div', null, enlaces.map(([href, ico, texto]) => h('a', { href }, icono(ico, 16), texto))));

const avisosCaja = (avs) => tarjeta('Avisos', 'aviso', avs?.items?.length
    ? h('div', { class: 'lateral-items' }, avs.items.slice(0, 2).map((a) => h('div', { class: 'aviso-mini' }, h('strong', null, a.titulo),
        h('span', null, a.contenido.length > 120 ? a.contenido.slice(0, 119) + '…' : a.contenido), h('small', null, `${a.autor} · ${a.grupo ? `Grupo ${a.grupo}` : 'Institucional'} · ${fechaCorta(a.creado_en.slice(0, 10))}`))))
    : h('p', { class: 'ayuda' }, 'No hay avisos recientes.'),
estado.usuario.rol !== 'estudiante' ? ['Publicar', '#/inicio'] : null);

// ---------- Recordatorios: se escribe qué recordar y cuándo; los de ahora aparecen resaltados ----------
function tarjetaRecordatorios(activos, proximos, recargar) {
    const texto = h('input', { type: 'text', maxlength: 200, placeholder: 'Escribe qué quieres recordar…', 'aria-label': 'Qué quieres recordar', required: true });
    const cuando = h('input', { type: 'datetime-local', 'aria-label': 'Cuándo avisarte', value: ahoraParaInput(60), required: true });
    const formulario = h('form', { class: 'recordar-form', onsubmit: async (e) => {
        e.preventDefault();
        if (!texto.value.trim()) return;
        try { await api.post('/recordatorios', { texto: texto.value, avisar_en: cuando.value }); aviso('Recordatorio creado.'); recargar(); } catch (er) { aviso(er.message, 'error'); }
    } }, texto, h('div', { class: 'recordar-fila' }, cuando, h('button', { class: 'btn btn-primario btn-chico', type: 'submit' }, icono('mas', 15), 'Recordar')));
    const fila = (r, ahora) => h('div', { class: `recordatorio-fila${ahora ? ' ahora' : ''}` }, icono('campana', 17),
        h('span', null, h('strong', null, r.titulo), h('small', null, `${ahora ? 'Desde' : 'Para'} ${fechaHora(r.avisar_en)}`)),
        ahora ? h('button', { class: 'btn btn-chico', type: 'button', title: 'Listo, ya lo hice', onclick: async () => { try { await api.patch(`/recordatorios/${r.id}/descartar`); recargar(); } catch (er) { aviso(er.message, 'error'); } } }, icono('check', 14), 'Listo') : null,
        h('button', { class: 'btn-icono chico', type: 'button', 'aria-label': `Eliminar el recordatorio ${r.titulo}`, onclick: async () => {
            if (!(await confirmar({ mensaje: '¿Eliminar este recordatorio?', textoOk: 'Eliminar', peligro: true }))) return;
            try { await api.del(`/recordatorios/${r.id}`); recargar(); } catch (er) { aviso(er.message, 'error'); }
        } }, icono('papelera', 15)));
    const total = activos.length;
    return h('section', { class: `tarjeta recordatorios${total ? ' con-activos' : ''}` },
        h('header', { class: 'tarjeta-cab' }, h('h3', null, icono('campana', 18), 'Recordatorios', total ? h('span', { class: 'contador-menu' }, total) : null)),
        formulario,
        activos.length || proximos.length ? h('div', { class: 'recordatorios-lista-inicio' }, activos.map((r) => fila(r, true)), proximos.slice(0, 4).map((r) => fila(r, false)))
            : h('p', { class: 'ayuda' }, 'No tienes recordatorios. Escribe uno arriba y te avisaremos en la campanita y por correo.'));
}

function miDia(items, recargar) {
    return tarjeta('Mi día', 'agenda', items.length ? h('div', { class: 'lista-chips' }, items.map((i) => chip(i, (x) => abrirItem(x, recargar))))
        : vacio('Hoy no tienes nada programado', esEstudiante() ? 'Aprovecha para adelantar una tarea o escribir en tu diario.' : 'Un buen momento para planear tus próximas actividades.'),
    ['Abrir calendario', '#/agenda']);
}

function tarjetaPendiente(t, recargar) {
    const personal = t.personal;
    const color = personal ? COLOR_TIPO[t.tipo === 'tarea' ? 'pendiente' : t.tipo] : t.color;
    return h('div', { class: 'pend-card', style: { '--c': color } },
        h('button', { type: 'button', class: 'pend-card-cuerpo', onclick: () => (personal ? abrirItem({ origen: 'pendiente', id: t.id, fecha: t.fecha_limite }, recargar) : ir(`/tarea/${t.id}`)) },
            h('strong', null, t.titulo),
            h('span', { class: 'pend-card-materia' }, h('i'), personal ? (t.materia ?? `${TIPOS[t.tipo]?.nombre ?? 'Tarea'} personal`) : t.materia),
            h('span', { class: 'pend-card-fecha' }, icono('reloj', 13), `${fechaCorta(t.fecha_limite)}${t.hora_limite || t.hora ? ` - ${horaCorta(t.hora_limite ?? t.hora)}` : ''}`),
            h('span', { class: 'pend-card-etiquetas' }, h('span', { class: `insignia prio-${t.prioridad}` }, PRIORIDADES[t.prioridad]), personal ? insigniaPropia() : insigneAsignadaPor(t.profesor))),
        personal ? h('button', { class: 'btn-icono chico', type: 'button', 'aria-label': `Eliminar ${t.titulo}`, onclick: async () => {
            if (!(await confirmar({ mensaje: '¿Eliminar este pendiente?', textoOk: 'Eliminar', peligro: true }))) return;
            try { await api.del(`/pendientes/${t.id}`); aviso('Pendiente eliminado.'); recargar(); } catch (e) { aviso(e.message, 'error'); }
        } }, icono('papelera', 17)) : null);
}

const diasPara = (fecha) => diferenciaDias(fecha, hoy());

// El Inicio se divide en secciones (pestañas) para no mostrar todo a la vez: Hoy · Pendientes/Por calificar · Recordatorios.
const seccionesDe = (cuenta) => {
    if (esEstudiante()) return [['hoy', 'Hoy', 'inicio'], ['pendientes', 'Mis pendientes', 'check', cuenta.pendientes], ['recordatorios', 'Recordatorios', 'campana', cuenta.recordatorios]];
    if (esAdmin()) return [['hoy', 'Resumen', 'inicio'], ['recordatorios', 'Recordatorios', 'campana', cuenta.recordatorios]];
    return [['hoy', 'Hoy', 'inicio'], ['calificar', 'Por calificar', 'check', cuenta.calificar], ['recordatorios', 'Recordatorios', 'campana', cuenta.recordatorios]];
};

export async function inicio(cont, _p, consulta) {
    const u = estado.usuario;
    await cargarEn(cont, 'Preparando tu día…', async () => {
        const h0 = hoy();
        const peticiones = [
            api.get('/estadisticas'),
            api.get('/agenda', { desde: h0, hasta: sumarDias(h0, 30) }),
            seguro(api.get('/avisos', { limite: 4 })),
            seguro(api.get('/recordatorios', { estado: 'activos' })), seguro(api.get('/recordatorios', { estado: 'proximos' })),
        ];
        if (esEstudiante()) peticiones.push(api.get('/tareas', { estado: 'pendiente', por_pagina: 6 }), seguro(api.get('/pendientes', { estado: 'pendiente', limite: 6 })), seguro(api.get('/pendientes', { estado: 'completada', limite: 1 })));
        else peticiones.push(seguro(api.get('/entregas/por-calificar')));
        const [stats, proximos, avs, activos, futuros, extra1, extra2, extra3] = await Promise.all(peticiones);
        const recargar = () => { vaciar(cont); inicio(cont, _p, consulta); };
        const hoyItems = proximos.items.filter((i) => i.fecha === h0);
        const nombre = u.nombre.split(' ')[0];
        const recordatorios = tarjetaRecordatorios(activos?.items ?? [], futuros?.items ?? [], recargar);
        const nActivos = activos?.items.length ?? 0;
        const cola = esEstudiante() ? [] : (extra1?.items ?? []);

        const dosColumnas = (izq, der) => h('div', { class: 'inicio-grid' }, h('div', { class: 'col' }, ...izq.filter(Boolean)), h('div', { class: 'col lateral-col' }, ...der.filter(Boolean)));
        const kpis = (...t) => h('div', { class: 'estadisticas kpis' }, ...t);
        const hoyTarjeta = hoyItems.length ? miDia(hoyItems, recargar) : null;
        const pendientesEst = esEstudiante()
            ? [...extra1.items.map((t) => ({ ...t })), ...(extra2?.items ?? []).map((p) => ({ ...p, personal: true }))].sort((a, b) => (a.fecha_limite ?? '9999').localeCompare(b.fecha_limite ?? '9999')).slice(0, 6)
            : [];

        // ----- navegación por secciones -----
        const secciones = seccionesDe({ pendientes: stats.pendientes, recordatorios: nActivos, calificar: cola.length });
        const claves = secciones.map(([k]) => k);
        const seccion = claves.includes(consulta?.get('seccion')) ? consulta.get('seccion') : 'hoy';
        const tabs = h('nav', { class: 'subcategorias', 'aria-label': 'Secciones del inicio' }, secciones.map(([k, texto, ico, n]) => h('a', {
            href: k === 'hoy' ? '#/inicio' : `#/inicio?seccion=${k}`, class: k === seccion ? 'activo' : '', 'aria-current': k === seccion ? 'page' : null,
        }, icono(ico, 16), texto, n ? h('span', { class: 'contador-menu' }, n) : null)));

        // ----- pastillas del saludo -----
        let chips = [];
        let avisoTop = null;
        if (esEstudiante()) {
            const proximoExamen = proximos.items.find((x) => x.tipo === 'examen' && !['entregada', 'calificada'].includes(x.estado));
            chips = [
                stats.vencidas ? pastilla(`${stats.vencidas} vencida${stats.vencidas === 1 ? '' : 's'}`, 'alerta', 'mal') : null,
                proximoExamen ? pastilla(`Examen ${relativa(proximoExamen.fecha).toLowerCase()}`, 'examen', 'aviso') : null,
            ].filter(Boolean);
            avisoTop = !u.grado_id ? h('div', { class: 'tarjeta aviso-grupo' }, icono('usuarios', 20),
                h('p', null, 'Completa tu perfil para ver tus materias: elige tu grado en ', h('a', { href: '#/perfil' }, 'Configuración'), '.')) : null;
        } else if (!esAdmin()) {
            chips = [cola.length ? pastilla(`${cola.length} por calificar`, 'check', 'aviso') : pastilla('Todo calificado', 'check', 'ok')];
            avisoTop = !estado.catalogo.asignaciones.length ? h('div', { class: 'tarjeta aviso-grupo' }, icono('alerta', 20),
                h('p', null, 'Aún no tienes materias asignadas. El administrador debe asignarte grados y materias para que puedas publicar actividades.')) : null;
        }

        // ----- contenido de cada sección -----
        const panel = h('div', { class: 'inicio-panel' });
        if (seccion === 'hoy') {
            if (esEstudiante()) {
                panel.append(
                    h('div', { class: 'foco' }, siguientePaso(proximos.items, [], recargar), tiraSemana(proximos.items)),
                    primerosPasos([
                        { texto: 'Elige tu grado en Configuración', href: '#/perfil', hecho: Boolean(u.grado_id) },
                        { texto: 'Agrega tu primera tarea o examen (botón + abajo a la derecha)', href: '#/inicio?seccion=pendientes', hecho: stats.personales.total > 0 },
                        { texto: 'Crea un recordatorio escribiéndolo', href: '#/inicio?seccion=recordatorios', hecho: nActivos + (futuros?.items.length ?? 0) > 0 },
                        { texto: 'Marca tu primer día de estudio en Estadísticas', href: '#/estadisticas', hecho: stats.estudio_semana.dias > 0 },
                    ]),
                    kpis(tarjetaEstadistica(stats.pendientes, 'Pendientes', { icon: 'reloj' }),
                        tarjetaEstadistica(stats.vencidas, 'Vencidas', { icon: 'alerta', clase: stats.vencidas ? 'mal' : '' }),
                        tarjetaEstadistica(stats.promedio ?? '—', 'Promedio', { icon: 'estrella', detalle: 'sobre 5.0' }),
                        tarjetaEstadistica(`${stats.estudio_semana.dias}/7`, 'Días de estudio', { icon: 'libro', detalle: 'esta semana' })),
                    hoyTarjeta);
            } else if (esAdmin()) {
                const total = stats.usuarios.reduce((a, x) => a + x.total, 0);
                panel.append(
                    kpis(tarjetaEstadistica(total, 'Personas', { icon: 'usuarios' }), tarjetaEstadistica(stats.grupos, 'Grupos', { icon: 'edificio' }),
                        tarjetaEstadistica(stats.materias, 'Materias', { icon: 'libro' }), tarjetaEstadistica(stats.tareas, 'Actividades', { icon: 'archivo' })),
                    h('div', { class: 'acciones-rapidas' },
                        accion('azul', 'usuarios', 'Estudiantes y docentes', 'Crear y administrar personas', () => ir('/usuarios')),
                        accion('verde', 'edificio', 'Grados y materias', 'Pensum, grupos y asignaciones', () => ir('/estructura')),
                        accion('naranja', 'aviso', 'Publicar un aviso', 'Para toda la institución', () => editarAviso(recargar))),
                    hoyTarjeta ?? tarjeta('Mi día', 'agenda', vacio('Hoy no tienes nada programado'), ['Abrir calendario', '#/agenda']));
            } else {
                panel.append(
                    h('div', { class: 'foco' }, siguientePaso(proximos.items, cola, recargar), tiraSemana(proximos.items)),
                    primerosPasos([
                        { texto: 'Recibir tus grados y materias (los asigna el administrador)', href: '#/perfil', hecho: estado.catalogo.asignaciones.length > 0 },
                        { texto: 'Publica tu primera actividad (botón + abajo a la derecha)', href: '#/tareas', hecho: stats.tareas > 0 },
                    ]),
                    kpis(tarjetaEstadistica(stats.tareas - stats.borradores, 'Publicadas', { icon: 'archivo' }),
                        tarjetaEstadistica(stats.por_revisar, 'Por calificar', { icon: 'check', clase: stats.por_revisar ? 'resalta' : '' }),
                        tarjetaEstadistica(stats.pendientes, 'Sin entregar', { icon: 'reloj' }),
                        tarjetaEstadistica(stats.promedio ?? '—', 'Promedio general', { icon: 'estrella', detalle: 'sobre 5.0' })),
                    hoyTarjeta);
            }
        } else if (seccion === 'pendientes') {
            panel.append(dosColumnas([
                tarjeta('Tareas pendientes', 'check', pendientesEst.length ? h('div', { class: 'pend-grid' }, pendientesEst.map((t) => tarjetaPendiente(t, recargar))) : h('p', { class: 'ayuda' }, 'No tienes tareas pendientes. ¡Buen trabajo!'),
                    ['Ver todas', '#/tareas'], 'tarjeta-pendientes'),
                extra3?.items?.length ? h('div', { class: 'acciones inicio' }, h('button', { class: 'btn btn-texto-peligro btn-chico', type: 'button', onclick: async () => {
                    if (!(await confirmar({ mensaje: '¿Quitar tus pendientes personales ya completados (los que tienen nota se conservan en tus calificaciones)?', textoOk: 'Quitar', peligro: true }))) return;
                    try { const r = await api.del('/pendientes/completados'); aviso(`${r.eliminados} eliminados.`); recargar(); } catch (e) { aviso(e.message, 'error'); }
                } }, icono('papelera', 16), 'Eliminar completadas')) : null,
            ], [eventosImportantes(proximos.items)]));
        } else if (seccion === 'calificar') {
            panel.append(dosColumnas([
                tarjeta(`Por calificar (${cola.length})`, 'check', cola.length ? h('div', { class: 'cola' }, cola.slice(0, 8).map((e) => h('button', { type: 'button', class: 'cola-fila', style: { '--c': e.color }, onclick: () => ir(`/tarea/${e.tarea_id}/entregas`) },
                    h('i'), h('span', null, h('strong', null, e.estudiante), h('small', null, `${e.titulo} · ${e.materia} ${e.grupo}`)),
                    e.tardia ? insignia('Tarde', 'aviso') : null, h('small', null, relativa(e.fecha_entrega.slice(0, 10)))))) : h('p', { class: 'ayuda' }, 'No tienes entregas esperando calificación. 🎉'),
                ['Ver todas', '#/por-calificar'], 'tarjeta-pendientes'),
            ], [eventosImportantes(proximos.items)]));
        } else if (seccion === 'recordatorios') {
            panel.append(recordatorios);
        }

        return h('div', { class: 'inicio' }, banner(nombre, chips), avisoTop, calendarioMes(), tabs, panel);
    });
}
