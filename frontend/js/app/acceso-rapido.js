// Botón flotante "+": crear lo más usual desde cualquier pantalla (según el rol) sin tener que ir a buscarlo.
import { esEstudiante, esAdmin } from './estado.js';
import { h, icono } from './ui.js';
import { editarTarea, editarNota, editarPendiente, editarEvento, editarAviso } from './formularios.js';
import { hoy } from './fechas.js';
import { ir } from './ruta.js';

// Tras guardar se vuelve a dibujar la pantalla actual
const refrescar = () => window.dispatchEvent(new Event('hashchange'));

const acciones = () => {
    const h0 = hoy();
    if (esEstudiante()) {
        return [
            ['mas', 'Nueva tarea', () => editarPendiente(null, { tipo: 'tarea', fecha: h0 }, refrescar)],
            ['examen', 'Nuevo examen', () => editarPendiente(null, { tipo: 'examen', fecha: h0 }, refrescar)],
            ['agenda', 'Nuevo evento', () => editarPendiente(null, { tipo: 'evento', fecha: h0 }, refrescar)],
            ['nota', 'Nueva nota', () => editarNota(null, { fecha: h0 }, refrescar)],
            ['campana', 'Un recordatorio', () => ir('/inicio?seccion=recordatorios')],
            ['libro', 'Escribir en mi diario', () => ir('/diario')],
        ];
    }
    if (esAdmin()) {
        return [['aviso', 'Publicar un aviso', () => editarAviso(refrescar)], ['agenda', 'Nuevo evento', () => editarEvento(null, {}, refrescar)], ['usuarios', 'Nueva persona', () => ir('/usuarios')]];
    }
    return [
        ['mas', 'Nueva actividad', () => editarTarea(null, refrescar)],
        ['examen', 'Nuevo examen', () => editarTarea(null, refrescar, { tipo: 'examen' })],
        ['agenda', 'Nuevo evento', () => editarEvento(null, {}, refrescar)],
        ['aviso', 'Nuevo aviso', () => editarAviso(refrescar)],
    ];
};

export function montarAccesoRapido() {
    if (document.querySelector('.fab')) return;
    const lista = h('div', { class: 'fab-menu', role: 'menu', hidden: true });
    const boton = h('button', { class: 'fab-boton', type: 'button', 'aria-label': 'Crear algo nuevo', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onclick: () => alternar() }, icono('mas', 26));
    const cerrar = () => { lista.hidden = true; boton.setAttribute('aria-expanded', 'false'); boton.classList.remove('abierto'); };
    function alternar() {
        if (!lista.hidden) { cerrar(); return; }
        lista.replaceChildren(...acciones().map(([ico, texto, fn]) => h('button', { type: 'button', role: 'menuitem', onclick: () => { cerrar(); fn(); } }, icono(ico, 18), texto)));
        lista.hidden = false; boton.setAttribute('aria-expanded', 'true'); boton.classList.add('abierto');
        lista.querySelector('button')?.focus();
    }
    document.addEventListener('click', (e) => { if (!e.target.closest('.fab')) cerrar(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
    document.body.append(h('div', { class: 'fab' }, lista, boton));
}
