// Arranque de la aplicación: comprueba la sesión, dibuja el marco (menú, buscador, campanita, perfil y salir) y enruta cada pantalla.
import { api } from './api.js';
import { estado, esEstudiante } from './estado.js';
import { h, icono, vaciar, cargando, errorCaja, vacio, retardo, aviso } from './ui.js';
import { cargarCatalogo } from './catalogo.js';
import { rutaActual } from './ruta.js';
import { TIPOS, avatar } from './comp.js';
import { fechaCorta, fechaHora } from './fechas.js';
import { montarAccesoRapido } from './acceso-rapido.js';
import { paginaDe } from './paginas.js';
import { inicio } from './vistas/inicio.js';
import { agenda } from './vistas/agenda.js';
import { tareas, detalleTarea } from './vistas/tareas.js';
import { examenes } from './vistas/examenes.js';
import { calificaciones } from './vistas/calificaciones.js';
import { estadisticas } from './vistas/estadisticas.js';
import { perfil } from './vistas/perfil.js';
import { diario } from './vistas/diario.js';
import { habitos } from './vistas/habitos.js';
import { materias } from './vistas/materias.js';
import { alertas } from './vistas/alertas.js';

const LOGIN = 'inicio-sesion.html';

// Menú lateral (EduCal es solo para estudiantes). `contador` muestra una insignia numérica.
const NAV = [
    { ruta: '/inicio', texto: 'Inicio', ico: 'inicio' },
    { ruta: '/agenda', texto: 'Calendario', ico: 'agenda' },
    { ruta: '/alertas', texto: 'Alertas', ico: 'campana', contador: 'alertas' },
    { ruta: '/tareas', texto: 'Tareas', ico: 'archivo', contador: 'tareas' },
    { ruta: '/examenes', texto: 'Exámenes', ico: 'examen' },
    { ruta: '/materias', texto: 'Mis materias', ico: 'libro' },
    { ruta: '/calificaciones', texto: 'Mis calificaciones', ico: 'libro' },
    { ruta: '/estadisticas', texto: 'Estadísticas', ico: 'grafica' },
    { titulo: 'Mi espacio' },
    { ruta: '/diario', texto: 'Mi diario', ico: 'nota' },
    { ruta: '/habitos', texto: 'Hábitos', ico: 'objetivo' },
    { ruta: '/perfil', texto: 'Configuración', ico: 'ajustes' },
];

// Secciones que ahora viven dentro de otra pantalla
const REDIRECCIONES = {
    '/notas': '/agenda?seccion=notas', '/pendientes': '/agenda?seccion=pendientes', '/recordatorios': '/inicio?seccion=recordatorios', '/colecciones': '/inicio',
    '/eventos': '/agenda', '/avisos': '/inicio', '/futuro': '/inicio', '/asistente': '/inicio', '/planeacion': '/inicio', '/tecnicas': '/inicio',
};

// patrón, vista, título de la pestaña, opción del menú que se resalta, roles permitidos
const RUTAS = [
    [/^\/inicio$/, inicio, 'Inicio', '/inicio'],
    [/^\/agenda$/, agenda, 'Calendario', '/agenda'],
    [/^\/alertas$/, alertas, 'Alertas', '/alertas'],
    [/^\/tareas$/, tareas, 'Tareas', '/tareas'],
    [/^\/tarea\/(\d+)$/, detalleTarea, 'Actividad', '/tareas'],
    [/^\/examenes$/, examenes, 'Exámenes', '/examenes'],
    [/^\/calificaciones$/, calificaciones, 'Calificaciones', '/calificaciones'],
    [/^\/estadisticas$/, estadisticas, 'Estadísticas', '/estadisticas'],
    [/^\/perfil$/, perfil, 'Configuración', '/perfil'],
    [/^\/diario$/, diario, 'Mi diario', '/diario'],
    [/^\/habitos$/, habitos, 'Hábitos', '/habitos'],
    [/^\/materias$/, materias, 'Mis materias', '/materias'],
];

const ROLES = { estudiante: 'Estudiante' };
const ICONO_NOTIFICACION = {
    nueva_tarea: 'archivo', cambio_fecha: 'reloj', proxima: 'alerta', vencida: 'alerta', calificacion: 'estrella', entrega: 'check',
    guia: 'libro', pendiente: 'objetivo', recordatorio: 'campana', por_calificar: 'check',
};
const contadores = { tareas: 0, alertas: 0, ultima: 0 };
let notificaciones = { items: [], no_leidas: 0 };
let principal;
let ficha = 0;

async function cerrarSesion() {
    try { await api.post('/auth/logout'); } catch { /* aunque falle, se sale */ }
    location.replace('pagina-principal.html');
}

function pintarUsuario() {
    for (const chip of document.querySelectorAll('.usuario-chip')) {
        vaciar(chip).append(avatar({ ...estado.usuario, foto: estado.usuario.foto }, 38),
            h('span', { class: 'usuario-texto' }, h('strong', null, estado.usuario.nombre), h('small', null, ROLES[estado.usuario.rol])));
    }
}

// ---------- Contadores del menú y campanita ----------
async function refrescarContadores(forzar = false) {
    if (!forzar && Date.now() - contadores.ultima < 15000) return;
    contadores.ultima = Date.now();
    try {
        const [notifs, otro] = await Promise.all([api.get('/notificaciones'), api.get('/estadisticas')]);
        notificaciones = notifs;
        contadores.tareas = otro.pendientes;
        contadores.alertas = notifs.no_leidas;
        pintarContadores();
    } catch { /* los contadores son un extra; si fallan no se muestra nada */ }
}

function pintarContadores() {
    for (const a of document.querySelectorAll('[data-contador]')) {
        const n = contadores[a.dataset.contador];
        let ins = a.querySelector('.contador-menu');
        if (n > 0) {
            if (!ins) { ins = h('span', { class: 'contador-menu' }); a.append(ins); }
            ins.textContent = n > 99 ? '99+' : n;
            ins.setAttribute('aria-label', a.dataset.contador === 'alertas' ? `${n} alertas sin leer` : `${n} pendientes`);
        } else ins?.remove();
    }
    const numero = document.querySelector('.campana-numero');
    if (numero) {
        numero.hidden = notificaciones.no_leidas === 0;
        numero.textContent = notificaciones.no_leidas > 99 ? '99+' : notificaciones.no_leidas;
    }
    const lista = document.querySelector('.campana-lista');
    if (lista) {
        vaciar(lista).append(notificaciones.items.length ? notificaciones.items.slice(0, 15).map((n) => h('a', {
            class: `notificacion${n.leida ? '' : ' nueva'}`, href: `#${n.ruta ?? '/inicio'}`,
            onclick: () => { cerrarPaneles(); if (!n.leida) api.post(`/notificaciones/${n.id}/leer`).then(() => refrescarContadores(true)).catch(() => {}); },
        }, icono(ICONO_NOTIFICACION[n.tipo] ?? 'campana', 18), h('span', null, h('strong', null, n.titulo), n.mensaje ? h('small', null, n.mensaje) : null, h('small', { class: 'cuando' }, fechaHora(n.creada_en)))))
            : h('p', { class: 'ayuda centro' }, 'No tienes notificaciones. ¡Todo al día!'));
        const pie = document.querySelector('.campana-pie');
        if (pie) {
            vaciar(pie).append(h('a', { class: 'btn btn-chico', href: paginaDe('/alertas') }, 'Ver todas las alertas'), notificaciones.no_leidas ? h('button', { class: 'btn btn-texto btn-chico', type: 'button', onclick: async () => { await api.post('/notificaciones/leer-todas'); refrescarContadores(true); } }, 'Marcar todas como leídas') : null,
                notificaciones.correo ? h('small', { class: 'ayuda' }, notificaciones.correo.configurado ? (notificaciones.correo.activado ? '✉ También te llegan por correo.' : '✉ Correo desactivado (Configuración).') : 'El correo aún no está configurado.') : null);
        }
    }
}

function cerrarPaneles() {
    document.querySelector('.campana-panel')?.setAttribute('hidden', '');
    document.querySelector('.campana-boton')?.setAttribute('aria-expanded', 'false');
    document.querySelector('.busqueda-resultados')?.setAttribute('hidden', '');
}

// ---------- Marco ----------
function crearBuscador() {
    const resultados = h('div', { class: 'busqueda-resultados', hidden: true, role: 'listbox', 'aria-label': 'Resultados de búsqueda' });
    const entrada = h('input', { type: 'search', placeholder: 'Buscar tareas, eventos, exámenes…', 'aria-label': 'Buscar tareas, eventos y exámenes', autocomplete: 'off', maxlength: 100 });
    let ultima = 0;
    const buscar = retardo(async () => {
        const q = entrada.value.trim();
        if (q.length < 2) { resultados.hidden = true; return; }
        const mia = ++ultima;
        try {
            const r = await api.get('/buscar', { q });
            if (mia !== ultima) return;
            const grupo = (titulo, lista, fila) => (lista.length ? [h('p', { class: 'res-titulo' }, titulo), lista.map(fila)] : null);
            const fila = (ico, texto, detalle, ruta) => h('a', { role: 'option', class: 'res-fila', href: `#${ruta}`, onclick: () => { resultados.hidden = true; entrada.value = ''; } },
                icono(ico, 17), h('span', null, h('strong', null, texto), detalle ? h('small', null, detalle) : null));
            const hay = r.tareas.length + r.eventos.length + r.notas.length + r.pendientes.length;
            vaciar(resultados).append(hay ? [
                grupo('Actividades y exámenes', r.tareas, (t) => fila(TIPOS[t.tipo].icono, t.titulo, `${t.materia} · ${fechaCorta(t.fecha)}`, `/tarea/${t.id}`)),
                grupo('Eventos', r.eventos, (e) => fila('agenda', e.titulo, `${fechaCorta(e.fecha)}${e.grupo ? ` · ${e.grupo}` : ''}`, `/agenda?vista=dia&fecha=${e.fecha}`)),
                grupo('Notas', r.notas, (n) => fila('nota', n.titulo, n.fecha ? fechaCorta(n.fecha) : '', '/agenda?seccion=notas')),
                grupo('Mis pendientes', r.pendientes, (p) => fila('objetivo', p.titulo, p.fecha_limite ? fechaCorta(p.fecha_limite) : '', '/agenda?seccion=pendientes')),
            ] : h('p', { class: 'ayuda centro' }, `Sin resultados para “${q}”.`));
            resultados.hidden = false;
        } catch { resultados.hidden = true; }
    }, 300);
    entrada.addEventListener('input', buscar);
    entrada.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { resultados.hidden = true; entrada.blur(); }
        if (e.key === 'Enter') { const primero = resultados.querySelector('a'); if (primero) { e.preventDefault(); primero.click(); } }
    });
    return h('div', { class: 'busqueda', role: 'search' }, icono('buscar', 18), entrada, resultados);
}

function crearCampana() {
    const panel = h('div', { class: 'campana-panel', hidden: true }, h('h3', null, 'Notificaciones'), h('div', { class: 'campana-lista' }), h('div', { class: 'campana-pie' }));
    const boton = h('button', { class: 'btn-icono campana-boton', type: 'button', 'aria-label': 'Notificaciones', 'aria-expanded': 'false', onclick: () => {
        const abrir = panel.hidden;
        cerrarPaneles();
        panel.hidden = !abrir;
        boton.setAttribute('aria-expanded', String(abrir));
        if (abrir) refrescarContadores(true);
    } }, icono('campana', 22), h('span', { class: 'campana-numero', hidden: true }));
    return h('div', { class: 'campana' }, boton, panel);
}

function montarMarco() {
    const visibles = NAV;
    // se quitan los títulos de sección que se quedaron sin opciones
    const items = visibles.filter((n, i) => !n.titulo || (visibles[i + 1] && !visibles[i + 1].titulo));
    const menu = h('nav', { class: 'menu', id: 'menu', 'aria-label': 'Principal' },
        items.map((n) => (n.titulo ? h('p', { class: 'menu-titulo' }, n.titulo)
            : h('a', { href: paginaDe(n.ruta), title: typeof n.texto === 'function' ? n.texto() : n.texto, dataset: n.contador ? { ruta: n.ruta, contador: n.contador } : { ruta: n.ruta } },
                icono(n.ico, 20), h('span', { class: 'menu-texto' }, typeof n.texto === 'function' ? n.texto() : n.texto), n.etiqueta ? h('span', { class: 'etiqueta-menu' }, n.etiqueta) : null))));
    const lateral = h('aside', { class: 'lateral' },
        h('a', { class: 'marca', href: paginaDe('/inicio') }, h('span', { class: 'marca-logo', 'aria-hidden': 'true' }, icono('agenda', 24)),
            h('span', { class: 'marca-texto' }, h('strong', null, 'EduCal'), h('small', null, 'Tu calendario, tu futuro'))),
        menu,
        h('div', { class: 'lateral-pie' }, h('div', { class: 'animo' }, h('span', { 'aria-hidden': 'true' }, '📚'), h('strong', null, '¡Tú puedes lograrlo!'))));
    principal = h('main', { id: 'principal', tabindex: '-1' });

    const botonMenu = h('button', { class: 'btn-icono boton-menu', type: 'button', 'aria-label': 'Abrir menú', 'aria-expanded': 'false', 'aria-controls': 'menu', onclick: (e) => alternarMenu(e.currentTarget) }, icono('menu', 24));
    const salir = h('button', { class: 'btn btn-salir', type: 'button', title: 'Cerrar sesión', onclick: cerrarSesion }, icono('salir', 18), h('span', null, 'Cerrar sesión'));
    const barra = h('header', { class: 'topbar' },
        botonMenu, h('a', { class: 'marca-movil', href: paginaDe('/inicio') }, h('span', { class: 'marca-logo chico', 'aria-hidden': 'true' }, icono('agenda', 18)), 'EduCal'),
        crearBuscador(), h('div', { class: 'topbar-der' }, crearCampana(), h('a', { class: 'usuario-chip', href: paginaDe('/perfil'), title: 'Configuración y perfil' }), salir));
    const fondoMenu = h('div', { class: 'fondo-menu', onclick: () => alternarMenu(botonMenu, false) });
    const rapida = [['/inicio', 'inicio', 'Inicio'], ['/agenda', 'agenda', 'Calendario'], ['/tareas', 'archivo', 'Tareas'], ['/diario', 'nota', 'Diario']];
    const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Acceso rápido' },
        rapida.map(([r, i, t]) => h('a', { href: paginaDe(r), dataset: { ruta: r } }, icono(i, 22), t)),
        h('button', { type: 'button', onclick: () => alternarMenu(botonMenu, true) }, icono('menu', 22), 'Más'));

    document.body.append(h('a', { class: 'saltar', href: '#principal', onclick: (e) => { e.preventDefault(); principal.focus(); } }, 'Saltar al contenido'),
        h('div', { class: 'app' }, lateral, fondoMenu, h('div', { class: 'contenido-wrap' }, barra, principal), tabbar));
    pintarUsuario();
    montarAccesoRapido();

    menu.addEventListener('click', (e) => { if (e.target.closest('a')) alternarMenu(botonMenu, false); });
    document.addEventListener('click', (e) => {
        document.querySelectorAll('details.menu-crear[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
        if (!e.target.closest('.campana')) { document.querySelector('.campana-panel')?.setAttribute('hidden', ''); document.querySelector('.campana-boton')?.setAttribute('aria-expanded', 'false'); }
        if (!e.target.closest('.busqueda')) document.querySelector('.busqueda-resultados')?.setAttribute('hidden', '');
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarPaneles(); });
    window.addEventListener('educal:perfil', pintarUsuario);
    window.addEventListener('educal:alertas', () => refrescarContadores(true));
    window.addEventListener('educal:materias', () => { cargarCatalogo().catch(() => {}); }); // cambió el grado o las materias: se actualizan las listas desplegables
}

function alternarMenu(boton, abrir) {
    const app = document.querySelector('.app');
    const abierto = abrir ?? !app.classList.contains('menu-abierto');
    app.classList.toggle('menu-abierto', abierto);
    boton.setAttribute('aria-expanded', String(abierto));
    boton.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
}

async function navegar() {
    const { ruta, consulta } = rutaActual();
    if (REDIRECCIONES[ruta]) { location.replace(`#${REDIRECCIONES[ruta]}`); return; }
    const mia = ++ficha;
    const coincidencia = RUTAS.map((r) => ({ r, m: r[0].exec(ruta) })).find((x) => x.m);
    if (!coincidencia) { location.hash = '#/inicio'; return; }
    const [, vista, titulo, activa, roles] = coincidencia.r;

    document.title = `${titulo} · EduCal`;
    document.querySelectorAll('[data-ruta]').forEach((a) => {
        const activo = a.dataset.ruta === activa;
        a.classList.toggle('activo', activo);
        if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    vaciar(principal);
    window.scrollTo(0, 0);
    if (roles && !roles.includes(estado.usuario.rol)) {
        principal.append(vacio('No tienes acceso a esta sección', 'Tu rol no incluye esta pantalla.', h('a', { class: 'btn btn-primario', href: '#/inicio' }, 'Ir al inicio')));
        return;
    }
    const contenedor = h('div', { class: 'vista' });
    principal.append(contenedor);
    refrescarContadores();
    try {
        await vista(contenedor, coincidencia.m.slice(1), consulta, { cerrarSesion, pintarUsuario });
    } catch (err) {
        if (mia === ficha && err.codigo !== 401) vaciar(contenedor).append(errorCaja(err, navegar));
    }
    if (mia === ficha) principal.focus({ preventScroll: true });
}

async function arrancar() {
    const pantalla = h('div', { class: 'pantalla-inicial' }, cargando('Abriendo tu agenda…'));
    document.body.append(pantalla);
    try {
        const r = await api.get('/auth/yo');
        estado.usuario = r.usuario;
        estado.csrf = r.csrf;
    } catch (err) {
        if (err.codigo === 401) { location.replace(LOGIN); return; }
        vaciar(pantalla).append(errorCaja(err, () => location.reload()));
        return;
    }
    estado.alExpirar = () => location.replace(`${LOGIN}?expirada=1`);
    try {
        await cargarCatalogo();
    } catch (err) {
        vaciar(pantalla).append(errorCaja(err, () => location.reload()));
        return;
    }
    pantalla.remove();
    montarMarco();
    window.addEventListener('hashchange', navegar);
    setInterval(() => refrescarContadores(true), 60000);
    // Cada página HTML abre su propia pantalla (data-pantalla); app.html abre el inicio
    if (!location.hash) location.hash = `#${document.body.dataset.pantalla || '/inicio'}`; else navegar();
}

arrancar();

export { aviso };
