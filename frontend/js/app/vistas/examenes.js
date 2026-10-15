// Exámenes: los oficiales (publicados por los profesores) y, para el estudiante, los que él mismo registra.
import { api } from '../api.js';
import { estado, esEstudiante, puedeGestionar } from '../estado.js';
import { h, icono, vaciar, cargarEn, vacio, aviso, insignia, modal, formulario, opcionesDe } from '../ui.js';
import { encabezadoPagina, tarjetaTarea, tarjetaEstadistica, insigniaPrioridad, insigniaPropia, TIPOS } from '../comp.js';
import { editarTarea, editarPendiente } from '../formularios.js';
import { hoy, fechaCorta, horaCorta, relativa } from '../fechas.js';
import { ir } from '../ruta.js';

const NOTA_APROBATORIA = 3;

// "Presentado": el estudiante marca su examen como presentado y puede escribir (o corregir) su nota
function modalPresentado(p, alGuardar) {
    const m = modal({ titulo: p.completado ? 'Editar nota del examen' : 'Examen presentado', ancho: 'chico', cuerpo: '' });
    const f = formulario({
        enviar: 'Guardar', alCancelar: m.cerrar,
        campos: [
            { nombre: 'nota', etiqueta: 'Nota obtenida (0.0 a 5.0)', tipo: 'number', min: 0, maxValor: 5, paso: '0.1', valor: p.nota ?? '', ayuda: 'Déjala vacía si aún no te la dan: el examen quedará como presentado.' },
            ...((estado.catalogo.materias ?? []).length ? [{ nombre: 'materia_id', etiqueta: 'Materia', tipo: 'select', opciones: opcionesDe(estado.catalogo.materias, 'id', 'nombre', 'Sin materia'), valor: p.materia_id ?? '' }] : []),
        ],
        extra: p.completado ? h('div', { class: 'acciones inicio' }, h('button', { class: 'btn btn-texto-peligro btn-chico', type: 'button', onclick: async () => {
            try { await api.patch(`/pendientes/${p.id}/presentado`, { presentado: false }); m.cerrar(); aviso('Marcado como no presentado.'); alGuardar(); } catch (e) { aviso(e.message, 'error'); }
        } }, 'Todavía no lo he presentado')) : null,
        alEnviar: async (v) => {
            await api.patch(`/pendientes/${p.id}/presentado`, { presentado: true, nota: v.nota === '' ? null : v.nota, materia_id: v.materia_id === '' ? null : v.materia_id });
            m.cerrar(); aviso(v.nota === '' ? 'Examen marcado como presentado.' : 'Nota guardada en tus calificaciones.'); alGuardar();
        },
    });
    m.el.querySelector('.modal-cuerpo').append(f.el);
}

function tarjetaPersonal(p, recargar) {
    const nota = p.nota == null ? null : Number(p.nota);
    return h('div', { class: `tarjeta-tarea personal${p.completado ? ' hecho' : ''}`, style: { '--c': 'var(--examen)' } },
        h('div', { class: 'tt-fecha' }, h('strong', null, fechaCorta(p.fecha_limite)), h('span', null, horaCorta(p.hora)), h('small', null, relativa(p.fecha_limite))),
        h('div', { class: 'tt-cuerpo' },
            h('button', { type: 'button', class: 'tt-titulo enlace', onclick: () => editarPendiente(p, {}, recargar) }, p.titulo),
            h('div', { class: 'tt-meta' }, p.materia ? `${p.materia} · ` : '', 'Examen que tú registraste'),
            h('div', { class: 'tt-insignias' }, insigniaPropia(), insigniaPrioridad(p.prioridad), p.completado ? insignia('Presentado', 'ok') : null,
                nota != null ? insignia(`Nota ${nota.toFixed(1)} · ${nota >= NOTA_APROBATORIA ? 'Aprobado' : 'No aprobado'}`, nota >= NOTA_APROBATORIA ? 'ok' : 'mal') : null)),
        h('button', { class: `btn btn-chico${p.completado ? '' : ' btn-primario'}`, type: 'button', onclick: () => modalPresentado(p, recargar) },
            icono('check', 14), p.completado ? (nota != null ? 'Editar nota' : 'Poner nota') : 'Ya lo presenté'));
}

export async function examenes(cont) {
    let pestana = 'proximos';
    const resumen = h('div', { class: 'estadisticas' });
    const lista = h('div', { class: 'lista-tareas' });
    const tabs = h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Exámenes' });

    const recargar = () => {
        vaciar(tabs).append([['proximos', 'Próximos'], ['anteriores', 'Anteriores']].map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(pestana === v), class: pestana === v ? 'activo' : '',
            onclick: () => { pestana = v; recargar(); } }, t)));
        return cargarEn(lista, 'Cargando exámenes…', async () => {
            const [oficiales, personales] = await Promise.all([
                api.get('/tareas', { tipo: 'examen', por_pagina: 100 }),
                esEstudiante() ? api.get('/pendientes', { tipo: 'examen' }) : { items: [] },
            ]);
            const h0 = hoy();
            const proximo = (x) => (x.fecha_limite ?? '9999') >= h0 && !['calificada'].includes(x.estado) && !x.completado;
            const todos = [...oficiales.items.map((x) => ({ ...x, _o: true })), ...personales.items.filter((p) => p.fecha_limite).map((p) => ({ ...p, _o: false }))];
            // Notas de exámenes oficiales calificados + las que el estudiante registró de sus propios exámenes
            const notas = [...oficiales.items.filter((x) => x.estado === 'calificada').map((x) => Number(x.calificacion)), ...personales.items.filter((x) => x.nota != null).map((x) => Number(x.nota))];
            const calificados = notas;
            const aprobados = notas.filter((n) => n >= NOTA_APROBATORIA).length;
            const promedio = notas.length ? (notas.reduce((a, n) => a + n, 0) / notas.length).toFixed(1) : '—';
            vaciar(resumen).append(esEstudiante() ? [
                tarjetaEstadistica(todos.filter(proximo).length, 'Próximos', { icon: 'reloj' }),
                tarjetaEstadistica(`${aprobados} / ${calificados.length}`, 'Aprobados', { icon: 'check', detalle: `nota mínima ${NOTA_APROBATORIA.toFixed(1)}` }),
                tarjetaEstadistica(promedio, 'Promedio en exámenes', { icon: 'estrella' }),
            ] : [
                tarjetaEstadistica(oficiales.items.filter(proximo).length, 'Exámenes próximos', { icon: 'reloj' }),
                tarjetaEstadistica(oficiales.items.reduce((a, x) => a + (x.entregadas ?? 0), 0), 'Por calificar', { icon: 'check' }),
                tarjetaEstadistica(oficiales.items.length, 'Exámenes en total', { icon: 'examen' }),
            ]);
            const mostrar = todos.filter((x) => (pestana === 'proximos' ? proximo(x) : !proximo(x)))
                .sort((a, b) => (pestana === 'proximos' ? 1 : -1) * ((a.fecha_limite + (a.hora_limite ?? a.hora ?? '')).localeCompare(b.fecha_limite + (b.hora_limite ?? b.hora ?? ''))));
            if (!mostrar.length) {
                return vacio(pestana === 'proximos' ? 'Sin exámenes próximos' : 'Sin exámenes anteriores',
                    pestana === 'proximos' ? (esEstudiante() ? 'Cuando tus profesores programen un examen aparecerá aquí. También puedes registrar uno tú mismo.' : 'Programa un examen para tus grupos.') : 'Aquí verás tus exámenes ya presentados y sus notas.');
            }
            return mostrar.map((x) => (x._o ? tarjetaTarea(x, () => ir(`/tarea/${x.id}`)) : tarjetaPersonal(x, recargar)));
        });
    };

    cont.append(encabezadoPagina('Exámenes', esEstudiante() ? 'Prepárate con tiempo y revisa tus resultados' : 'Evaluaciones programadas para tus grupos',
        esEstudiante() ? h('button', { class: 'btn btn-primario', type: 'button', onclick: () => editarPendiente(null, { tipo: 'examen' }, recargar) }, '+ Agregar examen')
            : (puedeGestionar() ? h('button', { class: 'btn btn-primario', type: 'button', onclick: () => editarTarea(null, recargar, { tipo: 'examen' }) }, '+ Nuevo examen') : null)),
    resumen, tabs, lista);
    await recargar();
}

export { icono, TIPOS };
