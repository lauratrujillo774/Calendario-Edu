// Estadísticas reales del usuario, según su rol. En el estudiante incluye el control de días de estudio.
import { api } from '../api.js';
import { esEstudiante, esAdmin } from '../estado.js';
import { h, icono, vaciar, cargarEn, aviso, modal, formulario, vacio, insignia } from '../ui.js';
import { encabezadoPagina, tarjetaEstadistica, barraProgreso, filaAnillo, anillo } from '../comp.js';
import { hoy, inicioSemana, sumarDias, DIAS_CORTOS, fechaLarga, diaDelMes } from '../fechas.js';

const tarjeta = (titulo, ico, ...contenido) => h('section', { class: 'tarjeta' }, h('h3', null, icono(ico, 18), titulo), ...contenido);

export async function estadisticas(cont) {
    await cargarEn(cont, 'Calculando tus estadísticas…', async () => {
        const s = await api.get('/estadisticas');
        return esEstudiante() ? await vistaEstudiante(s, cont) : vistaGestion(s);
    });
}

// ---------- Estudiante ----------
async function vistaEstudiante(s, cont) {
    const recargar = () => { vaciar(cont); estadisticas(cont); };
    const lunes = inicioSemana(hoy());
    const semana = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
    const estudio = await api.get('/estudio', { desde: semana[0], hasta: semana[6] });
    const marcados = new Map(estudio.items.map((x) => [x.fecha, x.minutos]));
    const ex = s.examenes;
    const hechas = s.entregadas + s.calificadas;

    const diaEstudio = (fecha) => {
        const marcado = marcados.has(fecha);
        const m = modal({ titulo: fechaLarga(fecha), ancho: 'chico', cuerpo: '' });
        const f = formulario({
            enviar: marcado ? 'Guardar' : 'Marcar como día de estudio', alCancelar: m.cerrar,
            campos: [{ nombre: 'minutos', etiqueta: 'Minutos estudiados (opcional)', tipo: 'number', min: 1, maxValor: 1440, valor: marcados.get(fecha) ?? '' }],
            alEnviar: async (v) => { await api.put(`/estudio/${fecha}`, { minutos: v.minutos || null }); m.cerrar(); aviso('Día de estudio registrado.'); recargar(); },
        });
        if (marcado) {
            f.el.querySelector('.acciones').prepend(h('button', { class: 'btn btn-texto-peligro', type: 'button', onclick: async () => {
                try { await api.del(`/estudio/${fecha}`); m.cerrar(); aviso('Día quitado.'); recargar(); } catch (e) { aviso(e.message, 'error'); }
            } }, 'Quitar'));
        }
        m.el.querySelector('.modal-cuerpo').append(f.el);
    };

    return h('div', { class: 'estadisticas-pagina' },
        encabezadoPagina('Estadísticas', 'Tu avance académico, calculado con tus datos reales'),
        h('div', { class: 'anillos-grandes' },
            h('div', { class: 'tarjeta anillo-grande' }, anillo(s.progreso, { color: 'var(--acento)', tam: 96, grosor: 10 }), h('strong', null, 'Tareas completadas'), h('span', null, `${hechas} de ${s.total} actividades`)),
            h('div', { class: 'tarjeta anillo-grande' }, anillo(ex.calificados ? Math.round((ex.aprobados * 100) / ex.calificados) : 0, { color: 'var(--ok)', tam: 96, grosor: 10 }), h('strong', null, 'Exámenes aprobados'),
                h('span', null, ex.calificados ? `${ex.aprobados} de ${ex.calificados} calificados (mínimo ${s.nota_aprobatoria.toFixed(1)})` : 'Aún no tienes exámenes calificados')),
            h('div', { class: 'tarjeta anillo-grande' }, anillo(Math.round((s.estudio_semana.dias * 100) / 7), { color: 'var(--evento)', tam: 96, grosor: 10 }), h('strong', null, 'Días de estudio'),
                h('span', null, `${s.estudio_semana.dias} de 7 esta semana${s.estudio_semana.minutos ? ` · ${s.estudio_semana.minutos} min` : ''}`))),
        h('div', { class: 'estadisticas' },
            tarjetaEstadistica(s.pendientes, 'Pendientes', { icon: 'reloj' }),
            tarjetaEstadistica(s.vencidas, 'Vencidas', { icon: 'alerta', clase: s.vencidas ? 'mal' : '' }),
            tarjetaEstadistica(s.promedio ?? '—', 'Promedio general', { icon: 'estrella', detalle: 'sobre 5.0' }),
            tarjetaEstadistica(`${s.personales.hechos} / ${s.personales.total}`, 'Pendientes personales', { icon: 'check' })),
        tarjeta('Mi semana de estudio', 'libro',
            h('p', { class: 'ayuda' }, 'Toca un día para marcar que estudiaste (y cuántos minutos). Solo puedes registrar hoy o días pasados.'),
            h('div', { class: 'semana-estudio' }, semana.map((d, i) => {
                const futuro = d > hoy();
                const marcado = marcados.has(d);
                return h('button', { type: 'button', class: `dia-estudio${marcado ? ' marcado' : ''}${d === hoy() ? ' es-hoy' : ''}`, disabled: futuro,
                    'aria-pressed': String(marcado), 'aria-label': `${fechaLarga(d)}: ${marcado ? 'estudiaste' : 'sin registrar'}`, onclick: () => diaEstudio(d) },
                h('small', null, DIAS_CORTOS[i]), h('strong', null, diaDelMes(d)), h('span', { 'aria-hidden': 'true' }, marcado ? icono('check', 16) : ''),
                marcado && marcados.get(d) ? h('em', null, `${marcados.get(d)} min`) : null);
            }))),
        tarjeta('Avance por materia', 'grafica', s.por_materia.length ? h('div', { class: 'materias-seguimiento' }, s.por_materia.map((m) => tarjetaMateria(m, s.nota_aprobatoria)))
            : vacio('Aún no tienes materias', 'Elige tu grado en Configuración y verás aquí tus materias y su seguimiento.')));
}

// Seguimiento de una materia: docente, avance, estados de las actividades, promedio y próxima entrega
function tarjetaMateria(m, minima) {
    const estadoNota = m.promedio == null ? null : m.promedio >= minima ? 'ok' : 'mal';
    const dato = (n, t, clase = '') => h('div', { class: `seg-dato ${clase}` }, h('strong', null, n), h('small', null, t));
    return h('article', { class: 'seg-materia', style: { '--c': m.color } },
        h('header', null, h('h4', null, h('i', { class: 'punto-color', style: { background: m.color } }), m.materia),
            m.docentes ? h('small', { class: 'autor-guia' }, icono('usuario', 13), m.docentes) : h('small', { class: 'autor-guia' }, 'Sin docente asignado aún')),
        barraProgreso(m.progreso, { color: m.color, etiqueta: `Avance en ${m.materia}` }),
        h('small', null, m.total ? `${m.hechas} de ${m.total} actividades entregadas (${m.progreso}%)` : 'Sin actividades publicadas todavía'),
        h('div', { class: 'seg-datos' },
            dato(m.pendientes, 'Pendientes'), dato(m.entregadas, 'Por calificar'), dato(m.calificadas, 'Calificadas'), dato(m.vencidas, 'Vencidas', m.vencidas ? 'mal' : '')),
        h('div', { class: 'seg-pie' },
            h('span', { class: `seg-promedio ${estadoNota ?? ''}` }, m.promedio == null ? 'Sin notas aún' : `Promedio ${m.promedio.toFixed(1)}`,
                m.notas_personales ? h('small', null, ` · incluye ${m.notas_personales} nota${m.notas_personales === 1 ? '' : 's'} tuya${m.notas_personales === 1 ? '' : 's'}`) : null),
            m.proxima ? h('small', null, `Próxima: ${m.proxima.titulo} · ${m.proxima.fecha}`) : h('small', null, 'Sin entregas próximas')));
}

// ---------- Profesor y administrador ----------
function vistaGestion(s) {
    const totalNotas = s.aprobadas + s.reprobadas;
    const maxDist = Math.max(1, ...s.distribucion.map((d) => d.total));
    const totalEntregas = s.a_tiempo + s.tardias;
    return h('div', { class: 'estadisticas-pagina' },
        encabezadoPagina('Estadísticas', esAdmin() ? 'Resumen de toda la institución' : 'Rendimiento y cumplimiento de tus grupos'),
        h('div', { class: 'estadisticas' },
            tarjetaEstadistica(s.promedio ?? '—', 'Promedio general', { icon: 'estrella', detalle: 'sobre 5.0' }),
            tarjetaEstadistica(s.aprobadas, 'Calificaciones aprobadas', { icon: 'check', detalle: `desde ${s.nota_aprobatoria.toFixed(1)}` }),
            tarjetaEstadistica(s.reprobadas, 'Por debajo del mínimo', { icon: 'alerta', clase: s.reprobadas ? 'mal' : '' }),
            tarjetaEstadistica(s.por_revisar, 'Por calificar', { icon: 'examen', clase: s.por_revisar ? 'resalta' : '' })),
        h('div', { class: 'rejilla dos' },
            tarjeta('Distribución de notas', 'grafica', totalNotas ? h('div', { class: 'barras' }, s.distribucion.map((d, i) => h('div', { class: 'barra-fila' },
                h('span', null, d.rango), h('div', { class: 'barra' }, h('div', { class: `barra-relleno r${i}`, style: { width: `${(d.total * 100) / maxDist}%` } })), h('strong', null, d.total))))
                : h('p', { class: 'ayuda' }, 'Todavía no hay calificaciones.')),
            tarjeta('Entregas a tiempo', 'reloj', totalEntregas ? h('div', null,
                filaAnillo(Math.round((s.a_tiempo * 100) / totalEntregas), 'A tiempo', `${s.a_tiempo} de ${totalEntregas} entregas recibidas`, 'var(--ok)'),
                h('p', { class: 'ayuda' }, `${s.tardias} entrega${s.tardias === 1 ? '' : 's'} fuera de plazo.`)) : h('p', { class: 'ayuda' }, 'Aún no hay entregas recibidas.'))),
        tarjeta('Avance por grupo y materia', 'usuarios', s.por_grupo.length ? h('div', { class: 'materias-avance' }, s.por_grupo.map((g) => h('div', { class: 'avance-fila' },
            h('span', null, `${g.materia} · ${g.grupo}`), barraProgreso(g.progreso, { etiqueta: `Entregas de ${g.materia} ${g.grupo}` }),
            h('small', null, `${g.progreso}% recibido${g.promedio != null ? ` · prom. ${g.promedio}` : ''} · ${g.por_revisar} por calificar`))))
            : vacio('Sin actividades publicadas', 'Publica actividades para ver el cumplimiento de tus grupos.')),
        esAdmin() && s.usuarios ? tarjeta('Usuarios', 'usuarios', h('div', { class: 'tt-insignias' }, s.usuarios.map((u) => insignia(`${{ admin: 'Administradores', profesor: 'Profesores', estudiante: 'Estudiantes' }[u.rol]}: ${u.activos}/${u.total} activos`, 'neutro')))) : null);
}
