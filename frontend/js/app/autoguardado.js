// Escritura con guardado automático: lo que se escribe se guarda solo (sin botón "Guardar"), se puede corregir y se puede eliminar.
// Se usa en el calendario (horario del día, notas y pendientes).
import { api } from './api.js';
import { h, icono, aviso } from './ui.js';

// Un campo de texto que se guarda mientras se escribe.
//   crear(texto) → Promise<id>      se llama la primera vez que se escribe algo (si todavía no existe)
//   actualizar(id, texto) → Promise se llama en los cambios siguientes
//   eliminar(id) → Promise          botón de papelera (solo aparece cuando ya existe)
export function campoAutoguardado({ id = null, valor = '', multilinea = false, filas = 2, max = 150, placeholder = '', etiqueta, clase = '', crear, actualizar, eliminar, alCrear, alEliminar }) {
    let actual = id;
    const estadoG = h('small', { class: 'guardado', role: 'status' }, '');
    const campo = multilinea
        ? h('textarea', { rows: filas, maxlength: max, placeholder, 'aria-label': etiqueta, class: clase })
        : h('input', { type: 'text', maxlength: max, placeholder, 'aria-label': etiqueta, class: clase });
    campo.value = valor;

    const borrar = h('button', { type: 'button', class: 'btn-icono chico borrar-auto', title: 'Eliminar', 'aria-label': `Eliminar: ${etiqueta}`, hidden: !actual, onclick: async () => {
        if (!actual) return;
        try { await eliminar(actual); actual = null; aviso('Eliminado.'); alEliminar?.(); } catch (e) { aviso(e.message, 'error'); }
    } }, icono('papelera', 15));

    let ocupado = Promise.resolve();
    const hacer = () => {
        // Se guarda de a una vez, en orden, para no crear dos veces lo mismo mientras se sigue escribiendo
        ocupado = ocupado.then(async () => {
            const texto = campo.value.trim();
            if (!texto) { estadoG.textContent = actual ? 'Escribe algo o usa la papelera para eliminar' : ''; return; }
            estadoG.textContent = 'Guardando…';
            try {
                if (actual) await actualizar(actual, texto);
                else { actual = await crear(texto); borrar.hidden = false; alCrear?.(actual); }
                estadoG.textContent = 'Guardado ✓';
            } catch (e) { estadoG.textContent = 'No se guardó'; aviso(e.message, 'error'); }
        });
    };
    let temporizador;
    const guardar = () => { clearTimeout(temporizador); temporizador = setTimeout(hacer, 700); };
    campo.addEventListener('input', () => { estadoG.textContent = 'Escribiendo…'; guardar(); });
    // al salir del campo se guarda enseguida
    campo.addEventListener('blur', () => { if (temporizador) { clearTimeout(temporizador); temporizador = null; hacer(); } });
    return { campo, borrar, estado: estadoG, id: () => actual };
}

// ---------- Cuerpos para la API ----------
// Pendiente (se conservan los demás datos que ya tenía; solo cambia el título)
export const cuerpoPendiente = (p, titulo) => ({
    titulo, descripcion: p.descripcion ?? null, tipo: p.tipo ?? 'tarea', fecha_limite: p.fecha_limite ?? null, hora: p.hora ? String(p.hora).slice(0, 5) : null,
    prioridad: p.prioridad ?? 'media', tarea_id: p.tarea_id ?? null, materia_id: p.materia_id ?? null, nota: p.nota ?? null,
});

// Una nota se escribe como un solo texto: la primera línea es el título y el resto el contenido
export function partirNota(texto) {
    const limpio = texto.trim();
    const i = limpio.indexOf('\n');
    const titulo = (i < 0 ? limpio : limpio.slice(0, i)).trim().slice(0, 150);
    return { titulo: titulo || 'Nota', contenido: i < 0 ? null : limpio.slice(i + 1).trim() || null };
}
export const textoDeNota = (n) => [n.titulo, n.contenido].filter(Boolean).join('\n');

export { api };
