// Tarjeta «Mis materias» (columna derecha del Calendario): las del plan de estudios del grado y las que el estudiante agrega.
import { api } from '../api.js';
import { h, icono, vaciar, aviso, confirmar } from '../ui.js';

export function tarjetaMaterias() {
    const caja = h('section', { class: 'tarjeta lateral materias-panel' }, h('header', null, h('h3', null, icono('libro', 16), 'Mis materias')),
        h('p', { class: 'ayuda' }, 'Cargando…'));

    async function pintar() {
        let datos;
        try { datos = await api.get('/mis-materias'); } catch { vaciar(caja).append(h('header', null, h('h3', null, icono('libro', 16), 'Mis materias')), h('p', { class: 'ayuda' }, 'No se pudieron cargar tus materias.')); return; }
        const cambio = async () => { window.dispatchEvent(new Event('educal:materias')); await pintar(); };
        const nombre = h('input', { type: 'text', list: 'lista-materias-existentes', maxlength: 80, placeholder: 'Ej.: Matemáticas, Inglés…', 'aria-label': 'Nombre de la materia que ves' });
        const sugeridas = h('datalist', { id: 'lista-materias-existentes' }, datos.disponibles.map((m) => h('option', { value: m.nombre })));
        const form = h('form', { class: 'agregar-rapido', onsubmit: async (e) => {
            e.preventDefault();
            const texto = nombre.value.trim();
            if (!texto) { aviso('Escribe el nombre de la materia.', 'error'); nombre.focus(); return; }
            try { await api.post('/mis-materias', { nombre: texto }); aviso(`“${texto}” quedó en tus materias.`); await cambio(); } catch (er) { aviso(er.message, 'error'); }
        } }, nombre, sugeridas, h('button', { class: 'btn btn-primario btn-chico', type: 'submit' }, icono('mas', 14), 'Agregar'));
        vaciar(caja).append(
            h('header', null, h('h3', null, icono('libro', 16), 'Mis materias')),
            datos.items.length ? h('ul', { class: 'lista-materias' }, datos.items.map((m) => h('li', null,
                h('i', { class: 'punto-color', style: { background: m.color } }), h('strong', null, m.nombre),
                m.propia && !m.del_grado ? h('button', { class: 'btn-icono chico', type: 'button', title: `Quitar ${m.nombre}`, 'aria-label': `Quitar la materia ${m.nombre}`, onclick: async () => {
                    if (!(await confirmar({ mensaje: `¿Quitar “${m.nombre}” de tus materias?`, textoOk: 'Quitar', peligro: true }))) return;
                    try { await api.del(`/mis-materias/${m.id}`); await cambio(); } catch (er) { aviso(er.message, 'error'); }
                } }, icono('papelera', 15)) : null)))
                : h('p', { class: 'ayuda' }, 'Aún no tienes materias. Agrega las que ves.'),
            form);
    }
    pintar();
    return caja;
}
