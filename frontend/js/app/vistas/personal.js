// Pantallas personales: notas, pendientes y recordatorios
import { api } from '../api.js';
import { h, icono, vaciar, cargarEn, vacio, aviso, confirmar, retardo } from '../ui.js';
import { encabezadoPagina, PRIORIDADES, opcionesPrioridades, TIPOS } from '../comp.js';
import { editarRecordatorio, formularioPendienteRapido } from '../formularios.js';
import { campoAutoguardado, cuerpoPendiente, partirNota, textoDeNota } from '../autoguardado.js';
import { fechaCorta, fechaHora, relativa, horaCorta } from '../fechas.js';
import { ir } from '../ruta.js';

// ================= Notas =================
export async function notas(cont, _p, _q, extra = {}) {
    const rejilla = h('div', { class: 'notas-rejilla' });
    let q = '';
    const recargar = () => cargarEn(rejilla, 'Abriendo tus notas…', async () => {
        const { items } = await api.get('/notas', { q });
        if (!items.length) return vacio(q ? 'Sin resultados' : 'Aún no tienes notas', q ? 'Prueba con otra palabra.' : 'Escribe una arriba: se guarda sola. Solo tú puedes verlas.');
        return items.map((n) => {
            const au = campoAutoguardado({
                id: n.id, valor: textoDeNota(n), multilinea: true, filas: 5, max: 3000, etiqueta: `Nota: ${n.titulo}`, clase: `nota-auto nota-${n.color ?? 'crema'}`,
                crear: async () => n.id,
                actualizar: (id, t) => api.put(`/notas/${id}`, { ...partirNota(t), fecha: n.fecha ?? null, color: n.color ?? 'crema', tarea_id: n.tarea_id ?? null }),
                eliminar: (id) => api.del(`/notas/${id}`),
                alEliminar: () => recargar(),
            });
            return h('div', { class: 'nota-bloque nota-tarjeta' }, au.campo,
                h('div', { class: 'nota-pie' }, h('small', null, [n.fecha ? fechaCorta(n.fecha) : null, n.tarea ? `Sobre: ${n.tarea}` : null].filter(Boolean).join(' · ')), au.estado, au.borrar));
        });
    });
    const buscador = h('input', { type: 'search', placeholder: 'Buscar en mis notas…', 'aria-label': 'Buscar en mis notas', oninput: retardo(() => { q = buscador.value.trim(); recargar(); }, 350) });
    // Nota nueva: se escribe aquí y se guarda sola (la primera línea es el título); al guardarse aparece en la lista y la caja queda vacía
    const espacioNueva = h('div', { class: 'nota-nueva' });
    const nuevaCaja = () => {
        const au = campoAutoguardado({
            multilinea: true, filas: 3, max: 3000, placeholder: 'Escribe una nota nueva… (la primera línea es el título; se guarda sola)', etiqueta: 'Nota nueva', clase: 'nota-auto nota-crema',
            crear: async (t) => (await api.post('/notas', { ...partirNota(t), color: 'crema' })).id,
            actualizar: () => Promise.resolve(),
            eliminar: () => Promise.resolve(),
            alCrear: () => { recargar(); setTimeout(() => vaciar(espacioNueva).append(nuevaCaja()), 900); },
        });
        return h('div', { class: 'nota-bloque' }, au.campo, h('div', { class: 'nota-pie' }, au.estado));
    };
    espacioNueva.append(nuevaCaja());
    cont.append(
        extra.dentro ? null : encabezadoPagina('Notas', 'Tu espacio privado'), espacioNueva,
        h('div', { class: 'agenda-filtros' }, h('div', { class: 'buscador' }, icono('buscar', 16), buscador)), rejilla);
    await recargar();
}

// ================= Pendientes =================
export async function pendientes(cont, _p, _q, extra = {}) {
    const f = { estado: 'pendiente', prioridad: '', tipo: '', q: '' };
    const lista = h('div', { class: 'pendientes-lista' });
    const recargar = () => cargarEn(lista, 'Cargando pendientes…', async () => {
        const { items } = await api.get('/pendientes', f);
        if (!items.length) return vacio(f.estado === 'completada' ? 'Nada completado todavía' : 'Todo al día', 'Los pendientes son tuyos: completarlos no cambia las tareas de tus profesores.');
        return items.map((p) => {
            const au = campoAutoguardado({
                id: p.id, valor: p.titulo, max: 150, etiqueta: `Pendiente: ${p.titulo}`, clase: 'pend-texto pend-titulo',
                crear: async () => p.id,
                actualizar: (id, t) => api.put(`/pendientes/${id}`, cuerpoPendiente(p, t)),
                eliminar: (id) => api.del(`/pendientes/${id}`),
                alEliminar: () => recargar(),
            });
            return h('div', { class: `pend-tarjeta prio-${p.prioridad}${p.completado ? ' hecho' : ''}` },
            h('input', { type: 'checkbox', checked: p.completado, 'aria-label': `Marcar “${p.titulo}” como ${p.completado ? 'pendiente' : 'completado'}`, onchange: async (e) => {
                try { await api.patch(`/pendientes/${p.id}/completar`, { completado: e.target.checked }); recargar(); } catch (er) { aviso(er.message, 'error'); e.target.checked = !e.target.checked; }
            } }),
            h('div', { class: 'pend-cuerpo' },
                h('div', { class: 'linea-horario' }, au.campo, au.estado, au.borrar),
                p.descripcion ? h('span', { class: 'ayuda' }, p.descripcion) : null,
                h('span', { class: 'pend-meta' },
                    p.fecha_limite ? h('span', { class: p.vencido ? 'texto-mal' : '' }, icono(p.vencido ? 'alerta' : 'reloj', 13), p.vencido ? `Vencido (${fechaCorta(p.fecha_limite)})` : `${fechaCorta(p.fecha_limite)}${p.hora ? ` · ${horaCorta(p.hora)}` : ''} · ${relativa(p.fecha_limite).toLowerCase()}`) : null,
                    h('span', { class: `insignia tipo t-${p.tipo === 'tarea' ? 'pendiente' : p.tipo}` }, icono(TIPOS[p.tipo === 'tarea' ? 'pendiente' : p.tipo].icono, 13), p.tipo === 'tarea' ? 'Tarea' : TIPOS[p.tipo].nombre),
                    h('span', { class: `insignia prio-${p.prioridad}` }, `Prioridad ${PRIORIDADES[p.prioridad].toLowerCase()}`),
                    p.tarea ? h('span', null, icono('archivo', 13), p.tarea) : null)));
        });
    });
    const sel = (nombre, etiqueta, opciones) => {
        const s = h('select', { 'aria-label': etiqueta, onchange: () => { f[nombre] = s.value; recargar(); } }, opciones.map((o) => h('option', { value: o.valor }, o.texto)));
        s.value = f[nombre];
        return s;
    };
    const buscador = h('input', { type: 'search', placeholder: 'Buscar…', 'aria-label': 'Buscar pendientes', oninput: retardo(() => { f.q = buscador.value.trim(); recargar(); }, 350) });
    // Pendiente nuevo: se le pone nombre y se agrega (o se abre el formulario completo con «Detalles»)
    const formNuevo = formularioPendienteRapido({ alCambiar: recargar });
    cont.append(
        extra.dentro ? null : encabezadoPagina('Pendientes', 'Tus tareas, exámenes y eventos personales'), formNuevo,
        h('div', { class: 'agenda-filtros' }, h('div', { class: 'buscador' }, icono('buscar', 16), buscador),
            sel('estado', 'Estado', [{ valor: 'pendiente', texto: 'Por hacer' }, { valor: 'completada', texto: 'Completados' }, { valor: '', texto: 'Todos' }]),
            sel('tipo', 'Tipo', [{ valor: '', texto: 'Todos los tipos' }, { valor: 'tarea', texto: 'Tareas' }, { valor: 'examen', texto: 'Exámenes' }, { valor: 'evento', texto: 'Eventos' }]),
            sel('prioridad', 'Prioridad', [{ valor: '', texto: 'Cualquier prioridad' }, ...opcionesPrioridades])),
        lista);
    await recargar();
}

// ================= Recordatorios =================
export async function recordatorios(cont) {
    let pestana = 'activos';
    const lista = h('div', { class: 'recordatorios-lista' });
    const pestanas = h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Recordatorios' });
    const TAB = [['activos', 'Para ahora'], ['proximos', 'Próximos'], ['descartados', 'Descartados']];
    const recargar = () => {
        vaciar(pestanas).append(TAB.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(pestana === v), class: pestana === v ? 'activo' : '', onclick: () => { pestana = v; recargar(); } }, t)));
        return cargarEn(lista, 'Cargando recordatorios…', async () => {
            const { items } = await api.get('/recordatorios', { estado: pestana });
            if (!items.length) {
                return vacio(pestana === 'activos' ? 'Nada que recordar por ahora' : pestana === 'proximos' ? 'Sin recordatorios programados' : 'Nada descartado',
                    'Los recordatorios aparecen aquí cuando llega su hora. Te avisan dentro de la aplicación, no por correo.');
            }
            return items.map((r) => h('div', { class: `recordatorio${r.activo ? ' activo' : ''}` },
                icono('campana', 20),
                h('div', { class: 'recordatorio-cuerpo' },
                    r.tarea_id ? h('a', { href: `#/tarea/${r.tarea_id}` }, r.titulo) : h('strong', null, r.titulo),
                    h('span', { class: 'ayuda' }, `${r.activo ? 'Desde' : 'Para'} ${fechaHora(r.avisar_en)}`, r.fecha_limite ? ` · Entrega ${fechaCorta(r.fecha_limite)}` : '')),
                h('div', { class: 'recordatorio-acciones' },
                    !r.enviado ? h('button', { class: 'btn btn-chico', type: 'button', onclick: async () => { try { await api.patch(`/recordatorios/${r.id}/descartar`); aviso('Recordatorio descartado.'); recargar(); } catch (e) { aviso(e.message, 'error'); } } }, 'Descartar') : null,
                    h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Eliminar recordatorio', onclick: async () => {
                        if (!(await confirmar({ mensaje: '¿Eliminar este recordatorio?', textoOk: 'Eliminar', peligro: true }))) return;
                        try { await api.del(`/recordatorios/${r.id}`); recargar(); } catch (e) { aviso(e.message, 'error'); }
                    } }, icono('borrar', 18)))));
        });
    };
    cont.append(encabezadoPagina('Recordatorios', 'Avisos dentro de la aplicación', h('button', { class: 'btn btn-primario', type: 'button', onclick: () => editarRecordatorio(null, recargar) }, '+ Nuevo recordatorio')), pestanas, lista);
    await recargar();
}

export { ir };
