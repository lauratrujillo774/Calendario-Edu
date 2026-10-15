// Abre el detalle/edición de cualquier elemento de la agenda según su origen
import { api } from '../api.js';
import { h, modal, aviso, icono, confirmar } from '../ui.js';
import { editarNota, editarPendiente, editarEvento } from '../formularios.js';
import { fechaLarga, fechaHora } from '../fechas.js';
import { ir } from '../ruta.js';

export async function abrirItem(item, recargar) {
    try {
        if (item.origen === 'tarea') return ir(`/tarea/${item.id}`);
        if (item.origen === 'evento') return verEvento(item, recargar);
        if (item.origen === 'recordatorio') return verRecordatorio(item, recargar);
        // Notas y pendientes se escriben y corrigen directamente en el día del calendario (se guardan solos)
        if (['nota', 'pendiente', 'horario'].includes(item.origen)) {
            const destino = `/agenda?seccion=calendario&vista=dia&fecha=${item.fecha ?? ''}`;
            if (location.hash === `#${destino}`) return recargar?.();
            return ir(destino);
        }
    } catch (e) {
        aviso(e.message, 'error');
    }
}

export function verEvento(ev, recargar) {
    const ambito = ev.grupo_id ? `Grupo ${ev.grupo}` : 'Institucional (todo el colegio)';
    const cuerpo = [
        h('p', { class: 'detalle-linea' }, icono('agenda', 16), `${fechaLarga(ev.fecha)}${ev.hora ? ` · ${String(ev.hora).slice(0, 5)}` : ''}`),
        h('p', { class: 'detalle-linea' }, icono('usuarios', 16), ambito),
        ev.descripcion ? h('p', { class: 'texto-largo' }, ev.descripcion) : h('p', { class: 'ayuda' }, 'Sin descripción.'),
    ];
    const m = modal({ titulo: ev.titulo, cuerpo: '' });
    const acciones = h('div', { class: 'acciones' },
        h('button', { class: 'btn', type: 'button', onclick: m.cerrar }, 'Cerrar'),
        ev.puede_editar ? h('button', { class: 'btn btn-primario', type: 'button', onclick: () => { m.cerrar(); editarEvento(ev, {}, recargar); } }, 'Editar') : null);
    m.el.querySelector('.modal-cuerpo').append(...cuerpo, acciones);
}

export function verRecordatorio(r, recargar) {
    const m = modal({ titulo: 'Recordatorio', ancho: 'chico', cuerpo: '' });
    const accion = (fn, msg) => async () => {
        try { await fn(); aviso(msg); m.cerrar(); await recargar?.(); } catch (e) { aviso(e.message, 'error'); }
    };
    m.el.querySelector('.modal-cuerpo').append(
        h('p', { class: 'detalle-linea' }, icono('campana', 16), r.titulo),
        h('p', { class: 'detalle-linea' }, icono('reloj', 16), `${fechaLarga(r.fecha)} · ${r.hora}`),
        h('div', { class: 'acciones' },
            h('button', { class: 'btn btn-texto-peligro', type: 'button', onclick: async () => {
                if (await confirmar({ mensaje: '¿Eliminar este recordatorio?', textoOk: 'Eliminar', peligro: true })) {
                    await accion(() => api.del(`/recordatorios/${r.id}`), 'Recordatorio eliminado.')();
                }
            } }, 'Eliminar'),
            !r.descartado ? h('button', { class: 'btn btn-primario', type: 'button', onclick: accion(() => api.patch(`/recordatorios/${r.id}/descartar`), 'Recordatorio descartado.') }, 'Descartar') : null));
}

export { fechaHora };
