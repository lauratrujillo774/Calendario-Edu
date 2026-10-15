// Componentes de presentación compartidos por varias pantallas (chips de agenda, tarjetas de tareas, insignias).
import { h, icono, insignia } from './ui.js';
import { esEstudiante } from './estado.js';
import { fechaCorta, horaCorta, relativa } from './fechas.js';

export const TIPOS = {
    tarea: { nombre: 'Tarea', icono: 'archivo' },
    trabajo: { nombre: 'Trabajo', icono: 'libro' },
    examen: { nombre: 'Examen', icono: 'alerta' },
    proyecto: { nombre: 'Proyecto', icono: 'estrella' },
    evento: { nombre: 'Evento', icono: 'agenda' },
    nota: { nombre: 'Nota', icono: 'nota' },
    pendiente: { nombre: 'Pendiente', icono: 'check' },
    recordatorio: { nombre: 'Recordatorio', icono: 'campana' },
};
export const PRIORIDADES = { baja: 'Baja', media: 'Media', alta: 'Alta' };
export const ESTADOS_ENTREGA = { pendiente: 'Pendiente', entregada: 'Entregada', calificada: 'Calificada' };
export const COLORES_NOTA = { crema: 'Crema', rosa: 'Rosa', durazno: 'Durazno', menta: 'Menta', cielo: 'Cielo', lavanda: 'Lavanda' };

export const opcionesTipos = Object.entries(TIPOS).slice(0, 4).map(([valor, t]) => ({ valor, texto: t.nombre }));
export const opcionesPrioridades = Object.entries(PRIORIDADES).map(([valor, texto]) => ({ valor, texto }));

// Estado legible de una tarea según quién la mira. El color nunca es el único indicador: siempre hay texto e icono.
export function estadoTarea(t) {
    if (esEstudiante()) {
        if (t.estado === 'calificada') return { texto: t.calificacion != null ? `Calificada · ${Number(t.calificacion).toFixed(1)}` : 'Calificada', clase: 'ok', icono: 'check' };
        if (t.estado === 'entregada') return { texto: 'Entregada', clase: 'ok', icono: 'check' };
        if (t.vencida) return { texto: 'Vencida', clase: 'mal', icono: 'alerta' };
        return { texto: 'Pendiente', clase: 'neutro', icono: 'reloj' };
    }
    return t.publicada ? { texto: 'Publicada', clase: 'ok', icono: 'check' } : { texto: 'Borrador', clase: 'aviso', icono: 'editar' };
}

export function insigniaEstado(t) {
    const e = estadoTarea(t);
    return h('span', { class: `insignia ${e.clase}` }, icono(e.icono, 13), e.texto);
}

export const insigniaPrioridad = (p) => insignia(`Prioridad ${PRIORIDADES[p].toLowerCase()}`, `prio-${p}`);
export const insigniaTipo = (tipo) => h('span', { class: `insignia tipo t-${tipo}` }, icono(TIPOS[tipo].icono, 13), TIPOS[tipo].nombre);

// Elemento de agenda (tarea, evento, nota, pendiente o recordatorio) en forma de "etiqueta de papel"
export function chip(item, alClic, { hora = true } = {}) {
    const info = TIPOS[item.tipo] ?? TIPOS.tarea;
    const hecho = ['entregada', 'calificada'].includes(item.estado) || item.completado || item.descartado;
    const etiquetaTipo = item.personal ? `${info.nombre} personal` : item.tipo === 'evento' ? (item.ambito === 'grupo' ? `Evento · ${item.grupo}` : 'Evento institucional') : info.nombre;
    const subtitulo = [item.materia, etiquetaTipo].filter(Boolean).join(' · ');
    const estado = item.vencida ? 'Vencida' : item.estado === 'calificada' ? 'Calificada' : item.estado === 'entregada' ? 'Entregada'
        : item.completado ? 'Completado' : item.descartado ? 'Descartado' : item.estado === 'borrador' ? 'Borrador' : null;
    return h('button', {
        type: 'button', class: `chip t-${item.tipo}${hecho ? ' hecho' : ''}${item.vencida ? ' vencida' : ''}`,
        style: item.color ? { '--c': item.color } : item.nota_color ? { '--c': `var(--nota-${item.nota_color})` } : null,
        onclick: () => alClic(item),
    },
    h('span', { class: 'chip-ico' }, icono(item.vencida ? 'alerta' : hecho ? 'check' : info.icono, 15)),
    h('span', { class: 'chip-texto' },
        h('span', { class: 'chip-titulo' }, item.titulo),
        h('span', { class: 'chip-sub' }, hora && item.hora ? `${item.hora} · ` : '', subtitulo, estado ? ` · ${estado}` : '')));
}

export function tarjetaTarea(t, alClic) {
    const est = esEstudiante();
    const vencidaSinEntregar = est && t.vencida;
    return h('button', {
        type: 'button', class: `tarjeta-tarea${vencidaSinEntregar ? ' vencida' : ''}`, style: { '--c': t.color }, onclick: () => alClic(t),
    },
    h('div', { class: 'tt-fecha' },
        h('strong', null, fechaCorta(t.fecha_limite)),
        h('span', null, horaCorta(t.hora_limite)),
        h('small', null, relativa(t.fecha_limite))),
    h('div', { class: 'tt-cuerpo' },
        h('div', { class: 'tt-titulo' }, t.titulo),
        h('div', { class: 'tt-meta' }, `${t.materia} · ${t.grupo}`),
        h('div', { class: 'tt-insignias' }, insigniaTipo(t.tipo), insigniaPrioridad(t.prioridad), insigniaEstado(t),
            est ? insigneAsignadaPor(t.profesor) : null,
            est && t.tipo === 'examen' && t.estado === 'calificada' ? (Number(t.calificacion) >= 3 ? insignia('Aprobado', 'ok') : insignia('No aprobado', 'mal')) : null,
            !est && t.publicada ? insignia(`${t.entregadas} por revisar · ${t.pendientes} pendientes`, 'neutro') : null)));
}

export function tarjetaEstadistica(valor, etiqueta, { icon, clase = '', detalle } = {}) {
    return h('div', { class: `estadistica ${clase}` }, icon ? icono(icon, 20) : null,
        h('strong', null, valor), h('span', null, etiqueta), detalle ? h('small', null, detalle) : null);
}

export function barraProgreso(porcentaje, { color, etiqueta } = {}) {
    return h('div', { class: 'progreso', role: 'progressbar', 'aria-valuenow': porcentaje, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': etiqueta ?? 'Progreso' },
        h('div', { class: 'progreso-relleno', style: { width: `${porcentaje}%`, background: color } }));
}

export function enlaceVolver(texto = 'Volver', destino) {
    return h('a', { class: 'volver', href: destino ?? '#/inicio', onclick: destino ? null : (e) => { if (history.length > 1) { e.preventDefault(); history.back(); } } },
        icono('izquierda', 16), texto);
}

export function encabezadoPagina(titulo, subtitulo, ...acciones) {
    return h('header', { class: 'pagina-cab' },
        h('div', null, h('h1', null, titulo), subtitulo ? h('p', { class: 'subtitulo' }, subtitulo) : null),
        h('div', { class: 'pagina-acciones' }, ...acciones));
}

// Anillo de progreso (SVG) con el porcentaje en el centro
export function anillo(porcentaje, { color = 'var(--acento)', tam = 64, grosor = 7 } = {}) {
    const span = document.createElement('span');
    span.className = 'anillo';
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', `${porcentaje}%`);
    const r = (tam - grosor) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, Number(porcentaje) || 0));
    span.innerHTML = `<svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}"><circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="var(--linea)" stroke-width="${grosor}"/>` +
        `<circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="${/^(#[0-9a-fA-F]{3,8}|var\(--[a-z-]+\))$/.test(color) ? color : 'var(--acento)'}" stroke-width="${grosor}" stroke-linecap="round" ` +
        `stroke-dasharray="${(c * pct) / 100} ${c}" transform="rotate(-90 ${tam / 2} ${tam / 2})"/></svg><strong>${Math.round(pct)}%</strong>`;
    return span;
}

// Fila "anillo + título + detalle" como la tarjeta de Estadísticas
export function filaAnillo(porcentaje, titulo, detalle, color) {
    return h('div', { class: 'fila-anillo' }, anillo(porcentaje, { color, tam: 58, grosor: 6 }),
        h('div', null, h('strong', null, titulo), h('span', null, detalle)));
}

const FRASES = [
    'Cada esfuerzo cuenta, sigue adelante.', 'Un pequeño avance cada día se convierte en un gran resultado.',
    'Lo difícil de hoy es lo fácil de mañana.', 'Estudiar un poco cada día vale más que mucho un solo día.',
    'Tú puedes más de lo que crees.', 'Organízate hoy, descansa tranquilo mañana.',
    'Los errores también son maestros: aprende y continúa.', 'Empieza por lo más pequeño; el impulso hará el resto.',
    'Tu futuro se construye con lo que haces hoy.', 'Respira, ordena tus tareas y da el primer paso.',
];
export const fraseDelDia = () => FRASES[Math.floor(Date.now() / 86400000) % FRASES.length];

export const COLOR_TIPO = {
    tarea: 'var(--tarea)', trabajo: 'var(--trabajo)', examen: 'var(--examen)', proyecto: 'var(--proyecto)',
    evento: 'var(--evento)', nota: 'var(--nota)', pendiente: 'var(--pendiente)', recordatorio: 'var(--recordatorio)',
};

export const esAprobada = (nota, minima = 3) => Number(nota) >= minima;


// "Asignada por docente · Nombre": deja claro que la actividad la puso un profesor (no el propio estudiante)
export const insigneAsignadaPor = (docente) => h('span', { class: 'insignia asignada', title: 'Actividad asignada por tu docente' }, icono('usuario', 13), `Asignada por docente: ${docente}`);
export const insigniaPropia = () => h('span', { class: 'insignia propia', title: 'La creaste tú' }, icono('editar', 13), 'Creada por ti');

// Avatar con la foto de perfil (si tiene) o su inicial. `foto` es verdadero cuando la persona subió una.
export function avatar(persona, tam = 38) {
    const inicial = (persona.nombre ?? '?').trim().charAt(0).toUpperCase();
    const el = h('span', { class: 'avatar', style: { width: `${tam}px`, height: `${tam}px`, fontSize: `${Math.round(tam * 0.42)}px` }, 'aria-hidden': 'true' }, inicial);
    if (persona.foto || persona.tiene_foto) {
        const img = h('img', { src: `/api/auth/foto/${persona.id}?v=${persona.versionFoto ?? 0}`, alt: '', loading: 'lazy' });
        img.addEventListener('error', () => img.remove());
        el.append(img);
    }
    return el;
}

// Paleta de colores con nombre (se elige un color; nunca se escribe un código)
export const PALETA = [
    { nombre: 'Azul', valor: '#2563EB' }, { nombre: 'Celeste', valor: '#0EA5E9' }, { nombre: 'Turquesa', valor: '#14B8A6' }, { nombre: 'Verde', valor: '#10B981' },
    { nombre: 'Lima', valor: '#84CC16' }, { nombre: 'Amarillo', valor: '#EAB308' }, { nombre: 'Naranja', valor: '#F97316' }, { nombre: 'Rojo', valor: '#EF4444' },
    { nombre: 'Rosa', valor: '#EC4899' }, { nombre: 'Violeta', valor: '#8B5CF6' }, { nombre: 'Índigo', valor: '#6366F1' }, { nombre: 'Gris', valor: '#64748B' },
];

// Emoji sugerido según lo que el usuario escribe como nombre del hábito
const EMOJIS = [
    [/estudi|repas|tarea|deber/, '📖'], [/le(er|e)|lectur|libro/, '📚'], [/agua|hidrat|beber/, '💧'], [/dorm|sue[nñ]o|descans/, '😴'], [/ejercicio|deporte|correr|gimnas|entren|camin/, '🏃'],
    [/medit|respir|calma|relaj/, '🧘'], [/ingl[eé]s|idioma|franc[eé]s|vocabulari/, '🗣️'], [/m[uú]sica|guitarra|piano|cant/, '🎵'], [/dibuj|arte|pint/, '🎨'], [/program|c[oó]digo|computad/, '💻'],
    [/escrib|diario|journal|redact/, '✍️'], [/orden|limpi|cuarto|aseo/, '🧹'], [/com(er|i)|fruta|verdura|desayun|alimenta|saludable/, '🥗'], [/familia|amig|llamar/, '👨‍👩‍👧'],
    [/gratitud|agradec/, '🙏'], [/plan|agenda|organiz/, '🗓️'], [/califica|retroalim|correg/, '✅'], [/pausa|estir/, '🤸'], [/matem|c[aá]lcul|ecuaci/, '🧮'], [/ciencia|qu[ií]mica|f[ií]sica|biolog/, '🔬'],
    [/ahorr|dinero|presupuesto/, '💰'], [/sol|aire libre|parque|naturaleza/, '🌿'], [/pantalla|celular|redes/, '📵'], [/ahorro|reciclar/, '♻️'],
];
export function emojiPara(nombre) {
    const t = String(nombre ?? '').toLowerCase().normalize('NFC');
    for (const [re, emoji] of EMOJIS) if (re.test(t)) return emoji;
    return t.trim().length >= 3 ? '⭐' : '';
}
