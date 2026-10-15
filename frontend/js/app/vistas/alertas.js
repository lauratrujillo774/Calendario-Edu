// Alertas: todas las notificaciones de la campanita en una pantalla (el correo se activa en Configuración).
import { api } from '../api.js';
import { h, icono, vaciar, cargarEn, vacio, aviso } from '../ui.js';
import { encabezadoPagina } from '../comp.js';
import { fechaHora } from '../fechas.js';
import { ir } from '../ruta.js';

const ICONOS = {
    nueva_tarea: 'archivo', cambio_fecha: 'reloj', proxima: 'alerta', vencida: 'alerta', calificacion: 'estrella', entrega: 'check',
    guia: 'libro', pendiente: 'objetivo', recordatorio: 'campana', por_calificar: 'check', prueba: 'campana',
};
// Avisa al marco (menú y campanita) que cambió algo
const avisarMarco = () => window.dispatchEvent(new Event('educal:alertas'));

export async function alertas(cont) {
    await cargarEn(cont, 'Cargando tus alertas…', async () => {
        const datos = await api.get('/notificaciones', { limite: 100 });
        const recargar = () => { vaciar(cont); alertas(cont); avisarMarco(); };

        // ----- Lista de alertas -----
        const lista = datos.items.length
            ? h('div', { class: 'lista-alertas' }, datos.items.map((n) => h('button', { type: 'button', class: `alerta-fila${n.leida ? '' : ' nueva'}`, onclick: async () => {
                if (!n.leida) { try { await api.post(`/notificaciones/${n.id}/leer`); avisarMarco(); } catch { /* sigue */ } }
                ir(n.ruta ?? '/inicio');
            } },
            h('span', { class: 'alerta-icono' }, icono(ICONOS[n.tipo] ?? 'campana', 20)),
            h('span', { class: 'alerta-texto' }, h('strong', null, n.titulo), n.mensaje ? h('small', null, n.mensaje) : null, h('small', { class: 'cuando' }, fechaHora(n.creada_en))),
            n.leida ? null : h('span', { class: 'insignia aviso' }, 'Nueva'))))
            : vacio('Sin alertas por ahora', 'Cuando haya algo nuevo (una tarea, un examen, una calificación o un recordatorio) aparecerá aquí.');

        const acciones = [
            datos.no_leidas ? h('button', { class: 'btn', type: 'button', onclick: async () => { await api.post('/notificaciones/leer-todas'); recargar(); } }, icono('check', 16), `Marcar las ${datos.no_leidas} como leídas`) : null,
            datos.items.some((n) => n.leida) ? h('button', { class: 'btn btn-texto-peligro', type: 'button', onclick: async () => { await api.del('/notificaciones'); aviso('Se borraron las alertas leídas.'); recargar(); } }, icono('papelera', 16), 'Borrar las leídas') : null,
        ].filter(Boolean);

        return h('div', { class: 'alertas-pagina' },
            encabezadoPagina('Alertas', datos.no_leidas ? `Tienes ${datos.no_leidas} alerta${datos.no_leidas === 1 ? '' : 's'} sin leer` : 'Estás al día', ...acciones),
            lista);
    });
}
