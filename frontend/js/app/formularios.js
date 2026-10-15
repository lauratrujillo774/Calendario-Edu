// Formularios en ventana (modal) para crear/editar tareas, notas, pendientes, recordatorios, eventos y avisos.
import { api } from './api.js';
import { estado, esAdmin } from './estado.js';
import { modal, formulario, aviso, confirmar, opcionesDe, h } from './ui.js';
import { opcionesTipos, opcionesPrioridades, COLORES_NOTA } from './comp.js';
import { ahoraParaInput, hoy, horaCorta } from './fechas.js';

// Crea una ventana con un formulario; al guardar bien, cierra, avisa y llama a alGuardar
function ventanaFormulario({ titulo, campos, enviar, guardar, mensaje, alGuardar, extra, ancho }) {
    const m = modal({ titulo, ancho, cuerpo: '' });
    const f = formulario({
        campos, enviar, extra,
        alCancelar: m.cerrar,
        alEnviar: async (valores) => {
            const resultado = await guardar(valores);
            m.cerrar();
            aviso(mensaje);
            await alGuardar?.(resultado);
        },
    });
    m.el.querySelector('.modal-cuerpo').append(f.el);
    f.el.querySelector('input:not([type=hidden]), textarea, select')?.focus();
    return { ...m, formulario: f };
}

function botonEliminar(texto, accion, m) {
    return h('button', {
        class: 'btn btn-texto-peligro', type: 'button',
        onclick: async () => {
            if (!(await confirmar({ titulo: 'Eliminar', mensaje: texto, textoOk: 'Eliminar', peligro: true }))) return;
            try { await accion(); } catch (e) { aviso(e.message, 'error'); return; }
            m.cerrar();
        },
    }, 'Eliminar');
}

// ---------- Tareas (profesor / administrador) ----------
export function editarTarea(tarea, alGuardar, predeterminados = {}) {
    const asignaciones = estado.catalogo.asignaciones;
    const editando = Boolean(tarea);
    const opciones = opcionesDe(asignaciones, 'id', (a) => `${a.materia} · ${a.grupo}${esAdmin() ? ` (${a.profesor})` : ''}`,
        editando ? undefined : 'Elige materia y grupo…');
    if (editando && !asignaciones.some((a) => a.id === tarea.asignacion_id)) opciones.push({ valor: tarea.asignacion_id, texto: `${tarea.materia} · ${tarea.grupo}` });
    const nombreArchivo = tarea?.archivo_url?.split('|')[1];
    ventanaFormulario({
        titulo: editando ? 'Editar actividad' : predeterminados.titulo ? 'Actividad sugerida por la IA' : predeterminados.tipo === 'examen' ? 'Nuevo examen' : 'Nueva actividad', ancho: 'grande',
        enviar: editando ? 'Guardar cambios' : 'Crear actividad',
        mensaje: editando ? 'Cambios guardados.' : 'Actividad creada.',
        campos: [
            { nombre: 'asignacion_id', etiqueta: 'Materia y grupo', tipo: 'select', opciones, valor: tarea?.asignacion_id ?? predeterminados.asignacion_id ?? '', requerido: true,
                ayuda: editando ? 'La materia y el grupo no se pueden cambiar una vez creada la actividad.' : undefined },
            { nombre: 'titulo', etiqueta: 'Título', requerido: true, max: 150, valor: tarea?.titulo ?? predeterminados.titulo },
            { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', max: 5000, valor: tarea?.descripcion ?? predeterminados.descripcion },
            { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', opciones: opcionesTipos, valor: tarea?.tipo ?? predeterminados.tipo ?? 'tarea', ancho: 'mitad' },
            { nombre: 'prioridad', etiqueta: 'Prioridad', tipo: 'select', opciones: opcionesPrioridades, valor: tarea?.prioridad ?? predeterminados.prioridad ?? 'media', ancho: 'mitad' },
            { nombre: 'fecha_limite', etiqueta: 'Fecha límite', tipo: 'date', requerido: true, valor: tarea?.fecha_limite ?? predeterminados.fecha_limite ?? hoy(), ancho: 'mitad' },
            { nombre: 'hora_limite', etiqueta: 'Hora límite (24 h)', tipo: 'time', valor: tarea ? horaCorta(tarea.hora_limite) : '23:59', ancho: 'mitad' },
            { nombre: 'archivo', etiqueta: 'Material adjunto (opcional)', tipo: 'file',
                accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip',
                ayuda: `Máximo 5 MB.${nombreArchivo ? ` Actual: ${nombreArchivo}. Si eliges otro, lo reemplaza.` : ''}` },
            { nombre: 'publicada', etiqueta: 'Publicar ahora para los estudiantes (si no, queda como borrador)', tipo: 'checkbox', valor: tarea ? Boolean(tarea.publicada) : true },
        ],
        guardar: async (v) => {
            const cuerpo = {
                asignacion_id: v.asignacion_id, titulo: v.titulo, descripcion: v.descripcion, tipo: v.tipo, prioridad: v.prioridad,
                fecha_limite: v.fecha_limite, hora_limite: v.hora_limite || '23:59', publicada: v.publicada,
            };
            const id = editando ? tarea.id : (await api.post('/tareas', cuerpo)).id;
            if (editando) await api.put(`/tareas/${id}`, cuerpo);
            if (v.archivo) {
                const form = new FormData();
                form.append('archivo', v.archivo);
                await api.subir(`/tareas/${id}/archivo`, form);
            }
            return id;
        },
        alGuardar,
    });
}

// ---------- Notas personales ----------
export function editarNota(nota, { fecha, tarea } = {}, alGuardar) {
    const editando = Boolean(nota?.id);
    const m = ventanaFormulario({
        titulo: editando ? 'Editar nota' : 'Nueva nota', enviar: 'Guardar nota', mensaje: 'Nota guardada.',
        campos: [
            { nombre: 'titulo', etiqueta: 'Título', requerido: true, max: 150, valor: nota?.titulo },
            { nombre: 'contenido', etiqueta: 'Escribe tu nota', tipo: 'textarea', filas: 6, max: 10000, valor: nota?.contenido },
            { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', valor: nota?.fecha ?? fecha ?? hoy(), ancho: 'mitad' },
            { nombre: 'color', etiqueta: 'Color del papel', tipo: 'select', ancho: 'mitad', valor: nota?.color ?? 'crema',
                opciones: Object.entries(COLORES_NOTA).map(([valor, texto]) => ({ valor, texto })) },
        ],
        extra: (nota?.tarea || tarea) ? h('p', { class: 'ayuda' }, `Relacionada con: ${nota?.tarea ?? tarea.titulo}`) : null,
        guardar: (v) => {
            const cuerpo = { ...v, fecha: v.fecha || null, tarea_id: nota?.tarea_id ?? tarea?.id ?? null };
            return editando ? api.put(`/notas/${nota.id}`, cuerpo) : api.post('/notas', cuerpo);
        },
        alGuardar,
    });
    if (editando) {
        m.formulario.el.querySelector('.acciones').prepend(botonEliminar('¿Eliminar esta nota?', async () => {
            await api.del(`/notas/${nota.id}`);
            aviso('Nota eliminada.');
            await alGuardar?.();
        }, m));
    }
}

// ---------- Pendientes personales ----------
export function editarPendiente(p, { fecha, tarea, tipo, hora, materia_id } = {}, alGuardar) {
    const editando = Boolean(p?.id);
    const materias = estado.catalogo.materias ?? [];
    const m = ventanaFormulario({
        titulo: editando ? 'Editar pendiente' : ({ examen: 'Agregar examen', evento: 'Agregar evento' }[tipo] ?? 'Agregar tarea'), enviar: 'Guardar', mensaje: 'Guardado en tu agenda.',
        campos: [
            { nombre: 'titulo', etiqueta: 'Título', requerido: true, max: 150, valor: p?.titulo ?? (tarea ? `Preparar: ${tarea.titulo}` : '') },
            { nombre: 'tipo', etiqueta: 'Es un…', tipo: 'select', opciones: [{ valor: 'tarea', texto: 'Tarea' }, { valor: 'examen', texto: 'Examen' }, { valor: 'evento', texto: 'Evento' }], valor: p?.tipo ?? tipo ?? 'tarea' },
            { nombre: 'descripcion', etiqueta: 'Detalles (opcional)', tipo: 'textarea', filas: 3, max: 3000, valor: p?.descripcion },
            { nombre: 'fecha_limite', etiqueta: 'Fecha (opcional)', tipo: 'date', valor: p?.fecha_limite ?? fecha ?? '', ancho: 'mitad' },
            { nombre: 'hora', etiqueta: 'Hora (opcional, 24 h)', tipo: 'time', valor: p?.hora ? horaCorta(p.hora) : hora ?? '', ancho: 'mitad' },
            { nombre: 'prioridad', etiqueta: 'Prioridad', tipo: 'select', opciones: opcionesPrioridades, valor: p?.prioridad ?? 'media', ancho: 'mitad' },
            ...(materias.length ? [{ nombre: 'materia_id', etiqueta: 'Materia (opcional)', tipo: 'select', opciones: opcionesDe(materias, 'id', 'nombre', 'Sin materia'), valor: p?.materia_id ?? materia_id ?? '', ancho: 'mitad' }] : []),
            { nombre: 'nota', etiqueta: '¿Ya lo presentaste? Escribe tu nota (0.0 a 5.0)', tipo: 'number', min: 0, maxValor: 5, paso: '0.1', valor: p?.nota ?? '', ancho: 'mitad', ayuda: 'Si pones una nota, queda registrada en tus calificaciones.' },
        ],
        extra: (p?.tarea || tarea) ? h('p', { class: 'ayuda' }, `Relacionado con: ${p?.tarea ?? tarea.titulo}. La tarea original no se modifica.`) : null,
        guardar: (v) => {
            const cuerpo = { ...v, fecha_limite: v.fecha_limite || null, hora: v.hora || null, materia_id: v.materia_id || null, nota: v.nota === '' ? null : v.nota, tarea_id: p?.tarea_id ?? tarea?.id ?? null };
            return editando ? api.put(`/pendientes/${p.id}`, cuerpo) : api.post('/pendientes', cuerpo);
        },
        alGuardar,
    });
    if (editando) {
        m.formulario.el.querySelector('.acciones').prepend(botonEliminar('¿Eliminar este pendiente?', async () => {
            await api.del(`/pendientes/${p.id}`);
            aviso('Pendiente eliminado.');
            await alGuardar?.();
        }, m));
    }
}

// ---------- Recordatorios ----------
// Se ESCRIBE qué recordar y cuándo. origen: { tarea_id, titulo } o { pendiente_id, titulo } al crearlo desde una tarea o pendiente.
export function editarRecordatorio(origen, alGuardar) {
    return ventanaFormulario({
        titulo: 'Nuevo recordatorio', enviar: 'Crear recordatorio', mensaje: 'Recordatorio creado.', ancho: 'chico',
        campos: [
            ...(origen ? [] : [{ nombre: 'texto', etiqueta: '¿Qué quieres recordar?', requerido: true, max: 200, placeholder: 'Ej.: Llevar la calculadora al examen' }]),
            { nombre: 'avisar_en', etiqueta: 'Avisarme el (fecha y hora, 24 h)', tipo: 'datetime-local', requerido: true, valor: ahoraParaInput(60) },
        ],
        extra: origen ? h('p', { class: 'ayuda' }, `Sobre: ${origen.titulo}`) : h('p', { class: 'ayuda' }, 'Te avisaremos en el inicio, en la campanita y por correo (si está activado).'),
        guardar: (v) => {
            const cuerpo = { avisar_en: v.avisar_en };
            if (origen?.tarea_id) cuerpo.tarea_id = origen.tarea_id;
            else if (origen?.pendiente_id) cuerpo.pendiente_id = origen.pendiente_id;
            else cuerpo.texto = v.texto;
            return api.post('/recordatorios', cuerpo);
        },
        alGuardar,
    });
}

// ---------- Eventos ----------
export function editarEvento(ev, { fecha } = {}, alGuardar) {
    const editando = Boolean(ev?.id);
    const grupos = estado.catalogo.grupos;
    const opciones = opcionesDe(grupos, 'id', 'nombre', esAdmin() ? 'Institucional (todo el colegio)' : 'Elige el grupo…');
    const m = ventanaFormulario({
        titulo: editando ? 'Editar evento' : 'Nuevo evento', enviar: 'Guardar evento', mensaje: 'Evento guardado.',
        campos: [
            { nombre: 'titulo', etiqueta: 'Título', requerido: true, max: 150, valor: ev?.titulo },
            { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'textarea', filas: 3, max: 2000, valor: ev?.descripcion },
            { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', requerido: true, valor: ev?.fecha ?? fecha ?? hoy(), ancho: 'mitad' },
            { nombre: 'hora', etiqueta: 'Hora (opcional, 24 h)', tipo: 'time', valor: ev?.hora ? horaCorta(ev.hora) : '', ancho: 'mitad' },
            { nombre: 'grupo_id', etiqueta: 'Dirigido a', tipo: 'select', opciones, valor: ev?.grupo_id ?? '', requerido: !esAdmin() },
        ],
        guardar: (v) => {
            const cuerpo = { ...v, hora: v.hora || null, grupo_id: v.grupo_id || null };
            return editando ? api.put(`/eventos/${ev.id}`, cuerpo) : api.post('/eventos', cuerpo);
        },
        alGuardar,
    });
    if (editando) {
        m.formulario.el.querySelector('.acciones').prepend(botonEliminar('¿Eliminar este evento para todos los que lo ven?', async () => {
            await api.del(`/eventos/${ev.id}`);
            aviso('Evento eliminado.');
            await alGuardar?.();
        }, m));
    }
}

// ---------- Avisos ----------
export function editarAviso(alGuardar) {
    const opciones = opcionesDe(estado.catalogo.grupos, 'id', 'nombre', esAdmin() ? 'Todos (institucional)' : 'Elige el grupo…');
    ventanaFormulario({
        titulo: 'Nuevo aviso', enviar: 'Publicar aviso', mensaje: 'Aviso publicado.',
        campos: [
            { nombre: 'titulo', etiqueta: 'Título', requerido: true, max: 150 },
            { nombre: 'contenido', etiqueta: 'Mensaje', tipo: 'textarea', filas: 5, requerido: true, max: 3000 },
            { nombre: 'grupo_id', etiqueta: 'Dirigido a', tipo: 'select', opciones, valor: '', requerido: !esAdmin() },
        ],
        guardar: (v) => api.post('/avisos', { ...v, grupo_id: v.grupo_id || null }),
        alGuardar,
    });
}

// Menú rápido de creación usado en inicio y agenda
export function menuCrear({ fecha, alCambiar }) {
    const gestion = estado.usuario.rol !== 'estudiante';
    const abrir = (fn) => () => { menu.open = false; fn(); };
    const op = (texto, fn) => h('button', { type: 'button', onclick: abrir(fn) }, texto);
    const menu = h('details', { class: 'menu-crear' },
        h('summary', { class: 'btn btn-primario' }, '+ Nuevo'),
        h('div', { class: 'menu-lista' },
            gestion ? [op('Actividad', () => editarTarea(null, alCambiar)), op('Examen', () => editarTarea(null, alCambiar, { tipo: 'examen' })),
                op('Evento', () => editarEvento(null, { fecha }, alCambiar)), op('Aviso', () => editarAviso(alCambiar))] : null,
            op('Tarea personal', () => editarPendiente(null, { fecha, tipo: 'tarea' }, alCambiar)),
            op('Examen personal', () => editarPendiente(null, { fecha, tipo: 'examen' }, alCambiar)),
            op('Evento personal', () => editarPendiente(null, { fecha, tipo: 'evento' }, alCambiar)),
            op('Nota', () => editarNota(null, { fecha }, alCambiar)),
            op('Recordatorio', () => editarRecordatorio(null, alCambiar))));
    return menu;
}

// Agregar un pendiente rápido: solo nombre y una breve descripción. `fecha` puede ser un valor o una función.
export function formularioPendienteRapido({ fecha = null, alCambiar }) {
    const entrada = h('input', { type: 'text', placeholder: 'Nombre del pendiente', maxlength: 150, 'aria-label': 'Nombre del nuevo pendiente' });
    const descripcion = h('input', { type: 'text', class: 'descripcion-rapida', placeholder: 'Breve descripción (opcional)', maxlength: 200, 'aria-label': 'Breve descripción del pendiente' });
    const fechaDe = () => (typeof fecha === 'function' ? fecha() : fecha) || null;
    return h('form', { class: 'agregar-rapido', onsubmit: async (e) => {
        e.preventDefault();
        const titulo = entrada.value.trim();
        if (!titulo) { aviso('Escribe el nombre del pendiente.', 'error'); entrada.focus(); return; }
        try {
            await api.post('/pendientes', { titulo, descripcion: descripcion.value.trim() || null, tipo: 'tarea', fecha_limite: fechaDe(), prioridad: 'media' });
            entrada.value = ''; descripcion.value = ''; await alCambiar?.();
        } catch (er) { aviso(er.message, 'error'); }
    } }, entrada, descripcion, h('button', { class: 'btn btn-primario btn-chico', type: 'submit' }, 'Agregar'));
}
