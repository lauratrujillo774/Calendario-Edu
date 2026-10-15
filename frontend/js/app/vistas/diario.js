// Mi diario: un espacio PERSONAL para escribir cómo te sientes (emociones), gratitud, qué salió bien, qué mejorar y una reflexión libre.
// No es el calendario: aquí no hay horarios ni tareas, solo tú y tu día.
import { api } from '../api.js';
import { h, icono, vaciar, cargarEn, aviso, retardo } from '../ui.js';
import { fraseDelDia, encabezadoPagina } from '../comp.js';
import { hoy, sumarDias, fechaLarga, nombreDia, diaDelMes, nombreMes, inicioMes, deISO, fechaCorta } from '../fechas.js';
import { ir } from '../ruta.js';

const ANIMOS = [['😞', 'Muy mal'], ['😕', 'Mal'], ['😐', 'Normal'], ['🙂', 'Bien'], ['😄', 'Excelente']];
const EMOCIONES = [
    ['feliz', '😊', 'Feliz'], ['tranquilo', '😌', 'Tranquilo'], ['motivado', '💪', 'Motivado'], ['agradecido', '🙏', 'Agradecido'], ['orgulloso', '🏅', 'Orgulloso'],
    ['cansado', '😴', 'Cansado'], ['estresado', '😣', 'Estresado'], ['ansioso', '😰', 'Ansioso'], ['triste', '😢', 'Triste'], ['enojado', '😠', 'Enojado'],
    ['aburrido', '🥱', 'Aburrido'], ['confundido', '😕', 'Confundido'],
];
const ENERGIA = ['Muy baja', 'Baja', 'Normal', 'Buena', 'Mucha'];
let fechaVista = null;

export async function diario(cont, _p, consulta) {
    fechaVista = consulta.get('fecha') ?? fechaVista ?? hoy();
    const f = fechaVista;
    const esHoy = f === hoy();

    await cargarEn(cont, 'Abriendo tu diario…', async () => {
        const mesIni = inicioMes(f);
        const [datos, animos, previas] = await Promise.all([
            api.get(`/diario/${f}`),
            api.get('/diario', { desde: mesIni, hasta: sumarDias(mesIni, 31) }).catch(() => ({ items: [] })),
            api.get('/diario/entradas', { limite: 12 }).catch(() => ({ items: [] })),
        ]);
        const dia = { ...datos.dia, emociones: [...datos.dia.emociones] };

        // ----- guardado automático -----
        const estadoGuardado = h('small', { class: 'guardado', role: 'status' }, '');
        // Se guarda solo al escribir (con una pausa) y también al pulsar «Guardar en mi diario»
        const guardarAhora = async (avisar = false) => {
            try {
                await api.put(`/diario/${f}`, dia);
                estadoGuardado.textContent = 'Guardado ✓';
                if (avisar) aviso('Guardado en tu diario.');
            } catch (e) { estadoGuardado.textContent = ''; aviso(e.message, 'error'); }
        };
        const guardar = retardo(() => guardarAhora(), 700);
        const botonGuardar = () => h('button', { class: 'btn btn-primario boton-guardar-diario', type: 'button', onclick: async (e) => {
            const b = e.currentTarget;
            b.disabled = true; estadoGuardado.textContent = 'Guardando…';
            await guardarAhora(true);
            b.disabled = false;
        } }, icono('check', 16), 'Guardar en mi diario');
        const cambio = () => { estadoGuardado.textContent = 'Guardando…'; guardar(); };
        const area = (campo, etiqueta, ayuda, filas, max = 3000) => {
            const t = h('textarea', { rows: filas, maxlength: max, 'aria-label': etiqueta, placeholder: ayuda, oninput: (e) => { dia[campo] = e.target.value; cambio(); } });
            t.value = dia[campo] ?? '';
            return h('label', { class: 'campo-diario' }, h('span', null, etiqueta), t);
        };

        // ----- navegación de fechas -----
        const barra = h('div', { class: 'diario-nav' },
            h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Día anterior', onclick: () => ir(`/diario?fecha=${sumarDias(f, -1)}`) }, icono('izquierda')),
            h('button', { class: 'btn', type: 'button', disabled: esHoy, onclick: () => ir(`/diario?fecha=${hoy()}`) }, 'Hoy'),
            h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Día siguiente', onclick: () => ir(`/diario?fecha=${sumarDias(f, 1)}`) }, icono('derecha')),
            h('input', { type: 'date', value: f, 'aria-label': 'Ir a una fecha', onchange: (e) => e.target.value && ir(`/diario?fecha=${e.target.value}`) }));

        // ----- ánimo, emociones y energía -----
        const animoFila = h('div', { class: 'animos', role: 'group', 'aria-label': '¿Cómo te sientes hoy?' }, ANIMOS.map(([emoji, nombre], i) => h('button', {
            type: 'button', class: `animo-btn${dia.animo === i + 1 ? ' elegido' : ''}`, 'aria-pressed': String(dia.animo === i + 1), title: nombre, 'aria-label': nombre,
            onclick: () => {
                dia.animo = dia.animo === i + 1 ? null : i + 1;
                animoFila.querySelectorAll('.animo-btn').forEach((b, j) => { b.classList.toggle('elegido', dia.animo === j + 1); b.setAttribute('aria-pressed', String(dia.animo === j + 1)); });
                cambio();
            },
        }, emoji)));
        const chipsEmociones = h('div', { class: 'emociones', role: 'group', 'aria-label': 'Emociones de hoy' }, EMOCIONES.map(([clave, emoji, nombre]) => h('button', {
            type: 'button', class: `emocion${dia.emociones.includes(clave) ? ' elegida' : ''}`, 'aria-pressed': String(dia.emociones.includes(clave)),
            onclick: (e) => {
                const i = dia.emociones.indexOf(clave);
                if (i >= 0) dia.emociones.splice(i, 1); else dia.emociones.push(clave);
                e.currentTarget.classList.toggle('elegida', i < 0);
                e.currentTarget.setAttribute('aria-pressed', String(i < 0));
                cambio();
            },
        }, h('span', { 'aria-hidden': 'true' }, emoji), nombre)));
        const energia = h('div', { class: 'energia', role: 'group', 'aria-label': 'Nivel de energía' }, ENERGIA.map((nombre, i) => h('button', {
            type: 'button', class: `energia-btn${dia.energia === i + 1 ? ' elegida' : ''}${dia.energia >= i + 1 ? ' llena' : ''}`, 'aria-pressed': String(dia.energia === i + 1), title: nombre, 'aria-label': `Energía: ${nombre}`,
            onclick: () => {
                dia.energia = dia.energia === i + 1 ? null : i + 1;
                energia.querySelectorAll('.energia-btn').forEach((b, j) => { b.classList.toggle('llena', dia.energia >= j + 1); b.classList.toggle('elegida', dia.energia === j + 1); b.setAttribute('aria-pressed', String(dia.energia === j + 1)); });
                cambio();
            },
        }, '▮')));

        // ----- tira de ánimo del mes -----
        const porDia = new Map(animos.items.map((x) => [x.fecha, x]));
        const diasMes = Array.from({ length: 31 }, (_, i) => sumarDias(mesIni, i)).filter((d) => d.slice(0, 7) === f.slice(0, 7));
        const tira = h('div', { class: 'tira-animo', 'aria-label': `Cómo me sentí en ${nombreMes(f)}` }, diasMes.map((d) => {
            const x = porDia.get(d);
            const nombre = x?.animo ? ANIMOS[x.animo - 1][1] : 'sin registrar';
            return h('button', { type: 'button', class: `punto-animo${d === f ? ' hoy' : ''}`, title: `${diaDelMes(d)}: ${nombre}`, 'aria-label': `${fechaLarga(d)}: ${nombre}`, onclick: () => ir(`/diario?fecha=${d}`) },
                x?.animo ? ANIMOS[x.animo - 1][0] : String(diaDelMes(d)));
        }));

        // ----- entradas anteriores -----
        const anteriores = previas.items.filter((x) => x.fecha !== f).slice(0, 8);

        const paginaIzq = h('section', { class: 'pagina-cuaderno izquierda', 'aria-label': 'Cómo me siento' },
            h('header', { class: 'fecha-hobo' },
                h('span', { class: 'numero-dia letra-mano' }, diaDelMes(f)),
                h('div', null, h('strong', { class: 'letra-mano' }, nombreDia(f)), h('small', null, `${nombreMes(f)} ${deISO(f).getFullYear()}`))),
            h('p', { class: 'frase-hobo letra-mano' }, `“${fraseDelDia()}”`),
            h('div', { class: 'bloque-hobo' }, h('h3', null, '¿Cómo me siento hoy?'), animoFila,
                h('p', { class: 'etiqueta-mini' }, '¿Qué emociones tengo?'), chipsEmociones,
                h('p', { class: 'etiqueta-mini' }, 'Mi nivel de energía'), energia),
            h('div', { class: 'bloque-hobo' }, area('sentir', 'Cuéntate cómo te sientes', 'Escribe con libertad: nadie más lo ve…', 5, 5000)),
            h('div', { class: 'bloque-hobo' }, h('h3', null, icono('estrella', 16), 'Gratitud'), area('gratitud', 'Hoy agradezco…', 'Tres cosas por las que estoy agradecido', 3, 1000)));

        const paginaDer = h('section', { class: 'pagina-cuaderno derecha', 'aria-label': 'Reflexión' },
            h('div', { class: 'bloque-hobo' }, h('h3', null, icono('check', 16), 'Mi día en balance'),
                area('bien', '¿Qué salió bien hoy?', 'Un logro, grande o pequeño', 3),
                area('mejorar', '¿Qué puedo mejorar mañana?', 'Un cambio concreto y posible', 3)),
            h('div', { class: 'bloque-hobo' }, h('h3', null, icono('nota', 16), 'Reflexión y notas libres'),
                area('reflexion', 'Reflexión del día', 'Lo que aprendí, lo que me hizo pensar…', 4, 5000), area('memo', 'Espacio libre', 'Ideas, recuerdos, metas, dibujos con palabras…', 4, 10000),
                h('div', { class: 'guardar-diario' }, botonGuardar(), estadoGuardado)),
            h('div', { class: 'bloque-hobo' }, h('h3', null, icono('agenda', 16), `Cómo me sentí en ${nombreMes(f).toLowerCase()}`), tira),
            anteriores.length ? h('div', { class: 'bloque-hobo' }, h('h3', null, icono('libro', 16), 'Mis entradas anteriores'),
                h('div', { class: 'entradas-previas' }, anteriores.map((x) => h('button', { type: 'button', class: 'entrada-previa', onclick: () => ir(`/diario?fecha=${x.fecha}`) },
                    h('strong', null, `${x.animo ? ANIMOS[x.animo - 1][0] + ' ' : ''}${fechaCorta(x.fecha)}`), h('span', null, x.sentir || x.bien || x.reflexion || x.gratitud || x.memo || x.mejorar))))) : null);

        return h('div', { class: 'diario' },
            encabezadoPagina('Mi diario', esHoy ? 'Un espacio solo para ti' : fechaLarga(f), barra, botonGuardar()),
            h('div', { class: 'cuaderno' }, paginaIzq, paginaDer));
    });
}
