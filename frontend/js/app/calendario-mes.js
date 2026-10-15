// Calendario mensual grande del inicio: cada día muestra sus actividades con hora; al tocar un día se abre su agenda.
import { api } from './api.js';
import { h, icono, vaciar, errorCaja, opcionesDe } from './ui.js';
import { COLOR_TIPO, TIPOS, PRIORIDADES } from './comp.js';
import { estado, esEstudiante } from './estado.js';
import { ir } from './ruta.js';
import { hoy, inicioMes, inicioSemana, sumarDias, sumarMeses, mesYAnio, diaDelMes, fechaLarga, DIAS_CORTOS } from './fechas.js';

const colorDe = (item) => item.color ?? (item.nota_color ? `var(--nota-${item.nota_color})` : COLOR_TIPO[item.tipo] ?? 'var(--tarea)');

export function calendarioMes() {
    let mes = inicioMes(hoy());
    const raiz = h('section', { class: 'tarjeta cal-widget', 'aria-label': 'Calendario del mes' });
    // El docente puede filtrar su calendario por materia, grado, tipo, estado y prioridad
    const filtros = { materia_id: '', grado_id: '', tipo: '', estado: '', prioridad: '' };
    const barraFiltros = esEstudiante() ? null : (() => {
        const cat = estado.catalogo;
        const sel = (nombre, etiqueta, opciones) => {
            const s = h('select', { 'aria-label': etiqueta, onchange: () => { filtros[nombre] = s.value; quitar.hidden = !Object.values(filtros).some(Boolean); pintar(); } },
                opciones.map((o) => h('option', { value: o.valor }, o.texto)));
            s.value = filtros[nombre];
            return s;
        };
        const selectores = [
            sel('materia_id', 'Materia', opcionesDe(cat.materias, 'id', 'nombre', 'Todas las materias')),
            sel('grado_id', 'Grado', opcionesDe(cat.grados, 'id', 'nombre', 'Todos los grados')),
            sel('tipo', 'Tipo', [{ valor: '', texto: 'Todos los tipos' }, ...Object.entries(TIPOS).map(([valor, t]) => ({ valor, texto: t.nombre }))]),
            sel('estado', 'Estado', [{ valor: '', texto: 'Todos los estados' }, { valor: 'publicada', texto: 'Publicada' }, { valor: 'borrador', texto: 'Borrador' }]),
            sel('prioridad', 'Prioridad', [{ valor: '', texto: 'Cualquier prioridad' }, ...Object.entries(PRIORIDADES).map(([valor, texto]) => ({ valor, texto }))]),
        ];
        const quitar = h('button', { class: 'btn btn-texto', type: 'button', hidden: true, onclick: () => {
            Object.keys(filtros).forEach((k) => { filtros[k] = ''; });
            selectores.forEach((s) => { s.value = ''; });
            quitar.hidden = true; pintar();
        } }, 'Quitar filtros');
        return h('div', { class: 'agenda-filtros cal-filtros', role: 'group', 'aria-label': 'Filtros del calendario' }, ...selectores, quitar);
    })();

    async function pintar() {
        const inicio = inicioSemana(mes);
        const dias = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
        let por = new Map();
        let fallo = null;
        try {
            const r = await api.get('/agenda', { desde: inicio, hasta: sumarDias(inicio, 41), ...Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)) });
            for (const it of r.items) {
                if (it.origen === 'nota') continue; // las notas viven en su propia sección
                (por.get(it.fecha) ?? por.set(it.fecha, []).get(it.fecha)).push(it);
            }
        } catch (e) { fallo = e; por = new Map(); }

        const irA = (vista, fecha = hoy()) => () => ir(`/agenda?vista=${vista}&fecha=${fecha}`);
        vaciar(raiz).append(
            h('header', { class: 'cal-cab' },
                h('div', { class: 'cal-titulo' },
                    h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Mes anterior', onclick: () => { mes = sumarMeses(mes, -1); pintar(); } }, icono('izquierda')),
                    h('h2', null, mesYAnio(mes)),
                    h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Mes siguiente', onclick: () => { mes = sumarMeses(mes, 1); pintar(); } }, icono('derecha'))),
                h('div', { class: 'segmentado compacto', role: 'group', 'aria-label': 'Abrir vista' },
                    h('button', { type: 'button', onclick: () => { mes = inicioMes(hoy()); pintar(); } }, 'Hoy'),
                    h('button', { type: 'button', class: 'activo', 'aria-pressed': 'true', onclick: irA('mes', mes) }, 'Mes'),
                    h('button', { type: 'button', onclick: irA('semana') }, 'Semana'),
                    h('button', { type: 'button', onclick: irA('dia') }, 'Día'))),
            barraFiltros,
            fallo ? errorCaja(fallo, pintar) : null,
            h('div', { class: 'cal-semana', 'aria-hidden': 'true' }, DIAS_CORTOS.map((d) => h('span', null, d))),
            h('div', { class: 'cal-grid', role: 'grid' }, dias.map((d) => {
                const lista = por.get(d) ?? [];
                const resumen = lista.length ? `${lista.length} actividad${lista.length > 1 ? 'es' : ''}` : 'sin actividades';
                return h('button', {
                    type: 'button', role: 'gridcell', 'aria-label': `${fechaLarga(d)}: ${resumen}`,
                    class: `cal-celda${d.slice(0, 7) !== mes.slice(0, 7) ? ' fuera' : ''}${d === hoy() ? ' es-hoy' : ''}`,
                    onclick: irA('dia', d),
                },
                h('span', { class: 'cal-num' }, diaDelMes(d)),
                h('span', { class: 'cal-items' }, lista.slice(0, 2).map((x) => h('span', { class: `cal-item${x.vencida ? ' vencida' : ''}`, style: { '--c': colorDe(x) } },
                    h('i', null), h('span', null, x.titulo, x.hora ? h('small', null, ` (${x.hora})`) : null)))),
                lista.length > 2 ? h('span', { class: 'cal-mas' }, `+${lista.length - 2} más`) : null,
                lista.length ? h('span', { class: 'cal-puntos', 'aria-hidden': 'true' }, lista.slice(0, 4).map((x) => h('i', { style: { '--c': colorDe(x) } }))) : null);
            })));
    }
    pintar();
    return raiz;
}
