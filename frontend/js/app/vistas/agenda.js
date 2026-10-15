// Agenda tipo cuaderno: vistas Día, Semana, Mes y Lista, con filtros combinables.
import { api } from '../api.js';
import { estado, esEstudiante, puedeGestionar } from '../estado.js';
import { h, icono, vaciar, cargando, vacio, errorCaja, aviso, retardo, opcionesDe } from '../ui.js';
import { chip, tarjetaTarea, encabezadoPagina, TIPOS, PRIORIDADES, PALETA } from '../comp.js';
import { campoAutoguardado, cuerpoPendiente, partirNota, textoDeNota } from '../autoguardado.js';
import { notas, pendientes } from './personal.js';
import { menuCrear, formularioPendienteRapido } from '../formularios.js';
import { abrirItem } from './items.js';
import { ir } from '../ruta.js';
import {
    hoy, sumarDias, inicioSemana, inicioMes, sumarMeses, fechaLarga, rangoSemana, mesYAnio, nombreDiaCorto, diaDelMes,
    DIAS_CORTOS, relativa, aISO, deISO,
} from '../fechas.js';

// Se recuerda entre pantallas mientras la pestaña esté abierta
const sesion = { vista: 'dia', elegida: false, fecha: hoy(), filtros: { materia_id: '', grado_id: '', grupo_id: '', tipo: '', estado: '', prioridad: '', q: '' } };

const VISTAS = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']];

function rango() {
    const f = sesion.fecha;
    switch (sesion.vista) {
        case 'dia': return [f, f];
        case 'semana': { const a = inicioSemana(f); return [a, sumarDias(a, 6)]; }
        case 'mes': { const a = inicioSemana(inicioMes(f)); return [a, sumarDias(a, 41)]; }
        default: return [hoy(), sumarDias(hoy(), 60)];
    }
}

function etiquetaRango() {
    const f = sesion.fecha;
    if (sesion.vista === 'dia') return fechaLarga(f);
    if (sesion.vista === 'semana') return rangoSemana(f);
    if (sesion.vista === 'mes') return mesYAnio(f);
    return esEstudiante() ? 'Próximos 60 días' : 'Próximas entregas y eventos (60 días)';
}

function mover(n) {
    if (sesion.vista === 'dia') sesion.fecha = sumarDias(sesion.fecha, n);
    else if (sesion.vista === 'semana') sesion.fecha = sumarDias(sesion.fecha, 7 * n);
    else if (sesion.vista === 'mes') sesion.fecha = sumarMeses(sesion.fecha, n);
}

const seguro = (promesa) => promesa.catch(() => null);

export async function calendario(cont, consulta, { soloLista = false, vistaInicial = null } = {}) {
    if (vistaInicial && !sesion.elegida) sesion.vista = vistaInicial;
    Object.keys(sesion.filtros).forEach((k) => { sesion.filtros[k] = ''; }); // el calendario no tiene filtros de búsqueda
    if (soloLista) sesion.vista = 'lista';
    else {
        if (consulta.get('fecha')) sesion.fecha = consulta.get('fecha');
        if (consulta.get('vista') && VISTAS.some(([v]) => v === consulta.get('vista'))) sesion.vista = consulta.get('vista');
        if (sesion.vista === 'lista') sesion.vista = 'dia';
    }

    const barra = h('div', { class: 'agenda-barra' });
    const filtros = h('div', { class: 'agenda-filtros' });
    const cuerpo = h('div', { class: 'agenda-cuerpo', 'aria-live': 'polite' });
    const botonCrear = menuCrear({ fecha: sesion.fecha, alCambiar: () => cargar() });
    cont.append(h('div', { class: 'agenda-acciones' }, botonCrear), barra, cuerpo);

    let solicitud = 0;
    async function cargar() {
        const mia = ++solicitud;
        pintarBarra();
        const [desde, hasta] = rango();
        vaciar(cuerpo).append(cargando('Abriendo tu agenda…'));
        try {
            const filtrosActivos = Object.fromEntries(Object.entries(sesion.filtros).filter(([, v]) => v));
            const extras = sesion.vista === 'dia' ? await Promise.all([
                seguro(api.get('/notas', { desde: sesion.fecha, hasta: sesion.fecha })),
                seguro(api.get('/pendientes', { estado: 'pendiente', limite: 12 })),
                seguro(api.get('/pendientes', { estado: 'pendiente', limite: 100 })),   // lo que se agrega con el botón + (para «Próximos vencimientos»)
            ]) : [];
            const datos = await api.get('/agenda', { desde, hasta, ...filtrosActivos });
            const vencidas = null;
            if (mia !== solicitud) return; // llegó una respuesta vieja
            vaciar(cuerpo);
            pintarContador(datos.items.length);
            ({ dia: () => vistaDia(datos.items, extras), semana: () => vistaSemana(datos.items), mes: () => vistaMes(datos.items), lista: () => vistaLista(datos.items.filter((i) => i.origen === 'pendiente' && !i.completado), vencidas) })[sesion.vista]();
        } catch (err) {
            if (mia !== solicitud || err.codigo === 401) return;
            vaciar(cuerpo).append(errorCaja(err, cargar));
        }
    }

    // ---------- Barra superior ----------
    function pintarBarra() {
        vaciar(barra).append(
            h('div', { class: 'agenda-nav' },
                !soloLista ? [
                    h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Anterior', onclick: () => { mover(-1); cargar(); } }, icono('izquierda')),
                    h('button', { class: 'btn', type: 'button', onclick: () => { sesion.fecha = hoy(); cargar(); } }, 'Hoy'),
                    h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Siguiente', onclick: () => { mover(1); cargar(); } }, icono('derecha')),
                ] : null,
                h('h2', { class: 'agenda-titulo' }, etiquetaRango())),
            soloLista ? null : h('div', { class: 'segmentado', role: 'group', 'aria-label': 'Tipo de vista' },
                VISTAS.map(([v, t]) => h('button', { type: 'button', 'aria-pressed': String(sesion.vista === v), class: sesion.vista === v ? 'activo' : '', onclick: () => { sesion.vista = v; sesion.elegida = true; cargar(); } }, t))));
    }

    // ---------- Filtros ----------
    const f = sesion.filtros;
    const hayFiltros = () => Object.values(f).some(Boolean);
    function select(nombre, etiqueta, opciones) {
        const s = h('select', { 'aria-label': etiqueta, onchange: () => { f[nombre] = s.value; cargar(); actualizarLimpiar(); } },
            opciones.map((o) => h('option', { value: o.valor }, o.texto)));
        s.value = f[nombre];
        return s;
    }
    const buscador = h('input', { type: 'search', placeholder: 'Buscar por título…', 'aria-label': 'Buscar por título', value: f.q,
        oninput: retardo(() => { f.q = buscador.value.trim(); cargar(); actualizarLimpiar(); }, 350) });
    const contador = h('span', { class: 'contador', role: 'status' });
    const limpiar = h('button', { class: 'btn btn-texto', type: 'button', onclick: () => { Object.keys(f).forEach((k) => { f[k] = ''; }); montarFiltros(); cargar(); } }, 'Quitar filtros');
    const actualizarLimpiar = () => { limpiar.hidden = !hayFiltros(); };
    const pintarContador = (n) => { contador.textContent = hayFiltros() ? `${n} resultado${n === 1 ? '' : 's'}` : ''; };

    function montarFiltros() {
        const cat = estado.catalogo;
        const estados = esEstudiante()
            ? [['pendiente', 'Pendiente'], ['entregada', 'Entregada'], ['calificada', 'Calificada'], ['vencida', 'Vencida'], ['completada', 'Pendiente personal hecho']]
            : [['publicada', 'Publicada'], ['borrador', 'Borrador']];
        vaciar(filtros).append(
            h('div', { class: 'buscador' }, icono('buscar', 16), buscador),
            select('materia_id', 'Materia', opcionesDe(cat.materias, 'id', 'nombre', 'Todas las materias')),
            !esEstudiante() ? select('grado_id', 'Grado', opcionesDe(cat.grados, 'id', 'nombre', 'Todos los grados')) : null,
            !esEstudiante() ? select('grupo_id', 'Grupo', opcionesDe(cat.grupos, 'id', 'nombre', 'Todos los grupos')) : null,
            select('tipo', 'Tipo', [{ valor: '', texto: 'Todos los tipos' }, ...Object.entries(TIPOS).map(([valor, t]) => ({ valor, texto: t.nombre }))]),
            select('estado', 'Estado', [{ valor: '', texto: 'Todos los estados' }, ...estados.map(([valor, texto]) => ({ valor, texto }))]),
            select('prioridad', 'Prioridad', [{ valor: '', texto: 'Cualquier prioridad' }, ...Object.entries(PRIORIDADES).map(([valor, texto]) => ({ valor, texto }))]),
            limpiar, contador);
        buscador.value = f.q;
        actualizarLimpiar();
    }
    montarFiltros();

    const clic = (item) => abrirItem(item, cargar);
    const porFecha = (items) => {
        const m = new Map();
        for (const it of items) (m.get(it.fecha) ?? m.set(it.fecha, []).get(it.fecha)).push(it);
        return m;
    };

    // ---------- Vista día: un papel con el horario donde todo se escribe y se guarda solo ----------
    const leerColorPapel = () => { try { return localStorage.getItem('educal_papel') || ''; } catch { return ''; } };
    const guardarColorPapel = (c) => { try { if (c) localStorage.setItem('educal_papel', c); else localStorage.removeItem('educal_papel'); } catch { /* sin almacenamiento */ } };

    // Selector del color del papel (usa la paleta de colores con nombre)
    function selectorColorPapel(papel) {
        const aplicar = (c) => { if (c) papel.style.setProperty('--papel-tinte', c); else papel.style.removeProperty('--papel-tinte'); };
        const actual = leerColorPapel();
        aplicar(actual);
        const barra = h('div', { class: 'papel-colores', role: 'radiogroup', 'aria-label': 'Color del papel' }, h('small', null, 'Color del papel'));
        const opciones = [{ nombre: 'Blanco', valor: '' }, ...PALETA];
        const pintar = (c) => barra.querySelectorAll('button').forEach((b) => { const on = b.dataset.valor === c; b.classList.toggle('elegido', on); b.setAttribute('aria-checked', String(on)); });
        for (const o of opciones) {
            barra.append(h('button', { type: 'button', class: 'color-op chico', role: 'radio', title: o.nombre, 'aria-label': o.nombre, dataset: { valor: o.valor }, style: { '--c': o.valor || '#ffffff' },
                onclick: () => { guardarColorPapel(o.valor); aplicar(o.valor); pintar(o.valor); } }, icono('check', 12)));
        }
        pintar(actual);
        return barra;
    }

    function vistaDia(items, [notas, pendientes, proximas]) {
        // El horario es propio del calendario (no se mezcla con los pendientes): cada línea se escribe, se corrige, se elimina y se marca como cumplida
        const propios = items.filter((i) => i.origen === 'horario');
        const oficiales = items.filter((i) => i.hora && i.origen !== 'horario' && !['nota', 'recordatorio'].includes(i.origen));
        const sinHora = items.filter((i) => !i.hora && !['nota', 'recordatorio'].includes(i.origen));
        const horas = [];
        // Horario completo: de las 4:00 a. m. hasta las 11:00 p. m.
        for (let hh = 4; hh <= 23; hh++) horas.push(hh);
        const etiquetaHora = (hh) => `${hh % 12 === 0 ? 12 : hh % 12}:00 ${hh < 12 ? 'a. m.' : 'p. m.'}`;

        const lineaHorario = (hh, hora24, fila, existente) => {
            const horaEntrada = existente?.hora ?? hora24;
            const marcar = (hecho) => linea.classList.toggle('cumplido', hecho);
            const casilla = h('input', { type: 'checkbox', class: 'casilla-cumplido', checked: Boolean(existente?.completado), disabled: !existente,
                'aria-label': `Cumplido: ${existente?.titulo ?? 'escribe primero lo que harás'}`, title: 'Márcala cuando lo cumplas',
                onchange: async (e) => {
                    const hecho = e.target.checked;
                    try { await api.patch(`/horario/${a.id()}/cumplido`, { cumplido: hecho }); marcar(hecho); } catch (er) { aviso(er.message, 'error'); e.target.checked = !hecho; }
                } });
            const a = campoAutoguardado({
                id: existente?.id ?? null, valor: existente?.titulo ?? '', max: 150, placeholder: 'Escribe aquí lo que harás…', etiqueta: `Horario de las ${etiquetaHora(hh)}`, clase: 'hora-escribir',
                crear: async (t) => (await api.post('/horario', { texto: t, fecha: sesion.fecha, hora: horaEntrada })).id,
                actualizar: (id, t) => api.put(`/horario/${id}`, { texto: t, fecha: sesion.fecha, hora: horaEntrada }),
                eliminar: (id) => api.del(`/horario/${id}`),
                alCrear: () => { casilla.disabled = false; fila.append(lineaHorario(hh, hora24, fila, null)); },
                alEliminar: () => { linea.remove(); if (!fila.querySelector('.linea-horario')) fila.append(lineaHorario(hh, hora24, fila, null)); },
            });
            const linea = h('div', { class: `linea-horario${existente?.completado ? ' cumplido' : ''}` }, casilla, a.campo, a.estado, a.borrar);
            return linea;
        };
        const filaHora = (hh) => {
            const hora24 = `${String(hh).padStart(2, '0')}:00`;
            const aqui = (hh === 4 ? propios.filter((i) => Number(i.hora.slice(0, 2)) <= 4) : propios.filter((i) => Number(i.hora.slice(0, 2)) === hh));
            const oficialesAqui = oficiales.filter((i) => Number(i.hora.slice(0, 2)) === hh || (hh === 4 && Number(i.hora.slice(0, 2)) < 4));
            const lineas = h('div', { class: 'hora-items' });
            lineas.append(...oficialesAqui.map((i) => chip(i, clic)));
            const fila = h('div', { class: `hora-fila${aqui.length || oficialesAqui.length ? ' con-items' : ''}` }, h('span', { class: 'hora-etiqueta' }, etiquetaHora(hh)), lineas);
            for (const p of aqui) lineas.append(lineaHorario(hh, hora24, lineas, p));
            lineas.append(lineaHorario(hh, hora24, lineas, null));
            return fila;
        };
        const recordatorios = items.filter((i) => i.origen === 'recordatorio');

        const papel = h('section', { class: 'papel dia-papel', 'aria-label': 'Agenda del día' },
            sinHora.length ? h('div', { class: 'bloque' }, h('h3', null, 'Durante el día'), h('div', { class: 'lista-chips' }, sinHora.map((i) => chip(i, clic)))) : null,
            h('div', { class: 'bloque horario' }, h('h3', null, 'Horario'), h('p', { class: 'ayuda' }, 'Escribe en la hora que quieras: se guarda solo (no va a tus pendientes). Marca la casilla cuando lo cumplas; para corregir cambia el texto y para borrar usa la papelera.'), horas.map(filaHora)));
        const contenedorPapel = h('div', { class: 'papel-envoltorio' }, selectorColorPapel(papel), papel);

        const lateral = h('aside', { class: 'dia-lateral' },
            tarjetaNotas(notas?.items ?? []),
            tarjetaLateral('Pendientes rápidos', 'check', pendientes ? listaPendientes(pendientes.items) : [errorMini()], 'Nada pendiente. ¡Bien!', null, true),
            recordatorios.length ? tarjetaLateral('Recordatorios', 'campana', recordatorios.map((r) => chip(r, clic)), '') : null,
            tarjetaLateral('Próximos vencimientos', 'reloj', proximosAgregados(proximas?.items ?? []), 'Todavía no agregas tareas, exámenes ni eventos con fecha. Usa el botón + para agregarlos.'));
        cuerpo.append(h('div', { class: 'dia-grid' }, contenedorPapel, lateral));
    }

    // Notas del día: cada nota es un texto que se guarda solo (primera línea = título); se corrige y se elimina allí mismo
    // Solo lo que la persona agregó (tareas, exámenes y eventos con fecha), de hoy en adelante
    const NOMBRE_PROPIO = { tarea: 'Tarea', examen: 'Examen', evento: 'Evento' };
    function proximosAgregados(lista) {
        return lista.filter((p) => p.fecha_limite && p.fecha_limite >= hoy())
            .sort((a, b) => `${a.fecha_limite} ${a.hora ?? '24:00'}`.localeCompare(`${b.fecha_limite} ${b.hora ?? '24:00'}`)).slice(0, 6)
            .map((p) => h('button', { type: 'button', class: 'mini-venc', style: { '--c': `var(--${p.tipo === 'tarea' ? 'pendiente' : p.tipo})` },
                onclick: () => { sesion.fecha = p.fecha_limite; sesion.vista = 'dia'; cargar(); } },
            h('strong', null, p.titulo), h('span', null, `${NOMBRE_PROPIO[p.tipo] ?? 'Tarea'} · ${relativa(p.fecha_limite)}${p.hora ? ` · ${p.hora.slice(0, 5)}` : ''}`)));
    }

    function tarjetaNotas(lista) {
        const caja = h('div', { class: 'lateral-items notas-auto' });
        const nueva = () => {
            const a = campoAutoguardado({
                multilinea: true, filas: 2, max: 3000, placeholder: 'Escribe una nota… (la primera línea es el título)', etiqueta: 'Nueva nota del día', clase: 'nota-auto nota-crema',
                crear: async (t) => (await api.post('/notas', { ...partirNota(t), fecha: sesion.fecha, color: 'crema' })).id,
                actualizar: (id, t) => api.put(`/notas/${id}`, { ...partirNota(t), fecha: sesion.fecha, color: 'crema' }),
                eliminar: (id) => api.del(`/notas/${id}`),
                alCrear: () => caja.append(nueva()),
                alEliminar: () => { bloque.remove(); if (!caja.querySelector('.nota-bloque')) caja.append(nueva()); },
            });
            const bloque = h('div', { class: 'nota-bloque' }, a.campo, h('div', { class: 'nota-pie' }, a.estado, a.borrar));
            return bloque;
        };
        for (const n of lista) {
            const a = campoAutoguardado({
                id: n.id, valor: textoDeNota(n), multilinea: true, filas: 2, max: 3000, etiqueta: `Nota: ${n.titulo}`, clase: `nota-auto nota-${n.color ?? 'crema'}`,
                crear: async () => n.id,
                actualizar: (id, t) => api.put(`/notas/${id}`, { ...partirNota(t), fecha: n.fecha ?? sesion.fecha, color: n.color ?? 'crema', tarea_id: n.tarea_id ?? null }),
                eliminar: (id) => api.del(`/notas/${id}`),
                alEliminar: () => { bloque.remove(); },
            });
            const bloque = h('div', { class: 'nota-bloque' }, a.campo, h('div', { class: 'nota-pie' }, a.estado, a.borrar));
            caja.append(bloque);
        }
        caja.append(nueva());
        return h('section', { class: 'tarjeta lateral' }, h('header', null, h('h3', null, icono('nota', 16), 'Notas del día')), caja);
    }

    function tarjetaLateral(titulo, ico, contenido, vacioTexto, accion, esLista) {
        const vacia = Array.isArray(contenido) ? contenido.length === 0 : false;
        return h('section', { class: 'tarjeta lateral' },
            h('header', null, h('h3', null, icono(ico, 16), titulo), accion),
            vacia ? h('p', { class: 'ayuda' }, vacioTexto) : h('div', { class: esLista ? 'lista-pend' : 'lateral-items' }, contenido),
            esLista ? agregarRapido() : null);
    }
    const errorMini = () => h('p', { class: 'ayuda' }, 'No se pudo cargar.');

    function listaPendientes(lista) {
        return lista.map((p) => {
            const a = campoAutoguardado({
                id: p.id, valor: p.titulo, max: 150, etiqueta: `Pendiente: ${p.titulo}`, clase: 'pend-texto',
                crear: async () => p.id,
                actualizar: (id, t) => api.put(`/pendientes/${id}`, cuerpoPendiente(p, t)),
                eliminar: (id) => api.del(`/pendientes/${id}`),
                alEliminar: () => fila.remove(),
            });
            const fila = h('div', { class: `pend-fila${p.vencido ? ' vencido' : ''}` },
                h('input', { type: 'checkbox', checked: p.completado, 'aria-label': `Completar: ${p.titulo}`, onchange: async (e) => {
                    try { await api.patch(`/pendientes/${p.id}/completar`, { completado: e.target.checked }); cargar(); } catch (er) { aviso(er.message, 'error'); e.target.checked = !e.target.checked; }
                } }),
                h('div', { class: 'pend-edicion' }, a.campo, p.vencido ? h('em', null, 'vencido') : p.fecha_limite ? h('em', null, relativa(p.fecha_limite).toLowerCase()) : null, a.estado),
                a.borrar);
            return fila;
        });
    }

    const agregarRapido = () => formularioPendienteRapido({ fecha: () => sesion.fecha, alCambiar: () => cargar() });

    // ---------- Vista semana ----------
    function nivelCarga(n) { return n === 0 ? ['', 'Sin carga'] : n <= 2 ? ['●', 'Carga ligera'] : n <= 4 ? ['●●', 'Carga media'] : ['●●●', 'Carga alta']; }

    function vistaSemana(items) {
        const por = porFecha(items);
        const inicio = inicioSemana(sesion.fecha);
        const dias = Array.from({ length: 7 }, (_, i) => sumarDias(inicio, i));
        cuerpo.append(h('div', { class: 'semana-grid' }, dias.map((d, i) => {
            const lista = por.get(d) ?? [];
            const academicas = lista.filter((x) => x.origen === 'tarea').length;
            const [puntos, textoCarga] = nivelCarga(academicas);
            return h('section', { class: `semana-dia${d === hoy() ? ' es-hoy' : ''}${lista.length === 0 ? ' vacio-dia' : ''}`, 'aria-label': fechaLarga(d) },
                h('button', { type: 'button', class: 'semana-cab', onclick: () => { sesion.vista = 'dia'; sesion.fecha = d; cargar(); } },
                    h('span', { class: 'dow' }, DIAS_CORTOS[i]), h('span', { class: 'num' }, diaDelMes(d)),
                    h('span', { class: 'carga', title: textoCarga }, puntos, h('span', { class: 'solo-lector' }, textoCarga))),
                h('div', { class: 'lista-chips' }, lista.length ? lista.map((x) => chip(x, clic)) : h('p', { class: 'ayuda' }, 'Libre')));
        })));
    }

    // ---------- Vista mes ----------
    function vistaMes(items) {
        const por = porFecha(items);
        const inicio = inicioSemana(inicioMes(sesion.fecha));
        const mesActual = sesion.fecha.slice(0, 7);
        const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
        cuerpo.append(h('div', { class: 'mes' },
            h('div', { class: 'mes-semana', 'aria-hidden': 'true' }, DIAS_CORTOS.map((d) => h('span', null, d))),
            h('div', { class: 'mes-grid', role: 'grid' }, celdas.map((d) => {
                const lista = por.get(d) ?? [];
                const resumen = resumenDia(lista);
                return h('button', {
                    type: 'button', role: 'gridcell', class: `mes-celda${d.slice(0, 7) !== mesActual ? ' fuera' : ''}${d === hoy() ? ' es-hoy' : ''}${d === sesion.fecha ? ' elegido' : ''}`,
                    'aria-label': `${fechaLarga(d)}${resumen ? ': ' + resumen : ': sin actividades'}`,
                    onclick: () => { sesion.vista = 'dia'; sesion.fecha = d; cargar(); },
                },
                h('span', { class: 'mes-num' }, diaDelMes(d)),
                h('span', { class: 'mes-pastillas' }, lista.slice(0, 3).map((x) => h('span', { class: `pastilla t-${x.tipo}${x.vencida ? ' vencida' : ''}`, style: x.color ? { '--c': x.color } : null }, x.titulo))),
                lista.length > 3 ? h('span', { class: 'mes-mas' }, `+${lista.length - 3}`) : null,
                lista.length ? h('span', { class: 'mes-puntos', 'aria-hidden': 'true' }, lista.slice(0, 5).map((x) => h('i', { class: `punto t-${x.tipo}`, style: x.color ? { '--c': x.color } : null }))) : null);
            })),
            h('p', { class: 'ayuda centro' }, 'Toca un día para ver su agenda.')));
    }

    function resumenDia(lista) {
        if (!lista.length) return '';
        const cuenta = {};
        lista.forEach((x) => { cuenta[x.tipo] = (cuenta[x.tipo] ?? 0) + 1; });
        return Object.entries(cuenta).map(([t, n]) => `${n} ${TIPOS[t].nombre.toLowerCase()}${n > 1 ? 's' : ''}`).join(', ');
    }

    // ---------- Vista lista ----------
    function vistaLista(items, vencidas) {
        const por = porFecha(items);
        const bloques = [];
        if (vencidas?.items?.length) {
            bloques.push(h('section', { class: 'lista-grupo vencidas' }, h('h3', null, icono('alerta', 16), 'Vencidas sin entregar'),
                vencidas.items.map((t) => tarjetaTarea(t, () => ir(`/tarea/${t.id}`)))));
        }
        for (const [fecha, lista] of [...por.entries()].sort()) {
            bloques.push(h('section', { class: 'lista-grupo' },
                h('h3', null, h('span', null, fechaLarga(fecha)), h('small', null, relativa(fecha))),
                h('div', { class: 'lista-chips' }, lista.map((x) => chip(x, clic)))));
        }
        cuerpo.append(bloques.length ? h('div', { class: 'lista-agenda' }, bloques)
            : vacio('Nada por vencer', 'Aquí aparecen las tareas, los exámenes y los eventos que agregues (con el botón +) en los próximos 60 días.'));
    }

    await cargar();
}

// ---------- Calendario con sus subcategorías ----------
const SECCIONES = () => [
    ['calendario', 'Calendario', 'agenda'],
    ['vencimientos', esEstudiante() ? 'Próximos vencimientos' : 'Próximas entregas', 'reloj'],
    ['notas', 'Notas', 'nota'],
    ['pendientes', 'Pendientes', 'check'],
];

export async function agenda(cont, _p, consulta) {
    let seccion = consulta.get('seccion') ?? 'calendario';
    if (!SECCIONES().some(([k]) => k === seccion)) seccion = 'calendario';
    if (consulta.get('seccion') === 'reflexion') { ir('/diario'); return; } // la reflexión del día ahora vive en Mi diario
    if (consulta.get('vista') === 'lista') seccion = 'vencimientos';
    const panel = h('div', { class: 'seccion-calendario' });
    const tabs = h('nav', { class: 'subcategorias', 'aria-label': 'Secciones del calendario' }, SECCIONES().map(([k, texto, ico]) => h('a', {
        href: `#/agenda?seccion=${k}`, class: k === seccion ? 'activo' : '', 'aria-current': k === seccion ? 'page' : null }, icono(ico, 16), texto)));
    cont.append(encabezadoPagina('Calendario', esEstudiante() ? 'Tu agenda, tus pendientes y tus notas' : 'Tu agenda, tus próximas entregas y tus notas'), tabs, panel);
    if (seccion === 'calendario') await calendario(panel, consulta, { vistaInicial: 'dia' });
    else if (seccion === 'vencimientos') await calendario(panel, consulta, { soloLista: true });
    else if (seccion === 'notas') await notas(panel, [], consulta, { dentro: true });
    else await pendientes(panel, [], consulta, { dentro: true });
}
