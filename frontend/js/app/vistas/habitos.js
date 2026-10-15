// Seguimiento de hábitos (habit tracker del Bullet Journal): rejilla del mes con casillas por día.
import { api } from '../api.js';
import { estado } from '../estado.js';
import { h, icono, vaciar, cargarEn, aviso, modal, formulario, confirmar, vacio } from '../ui.js';
import { encabezadoPagina, barraProgreso, PALETA, emojiPara } from '../comp.js';
import { sumarMeses, mesYAnio, diaDelMes, DIAS_CORTOS, deISO, fechaLarga, hoy as hoyLocal } from '../fechas.js';

let mesElegido = null;

function formularioHabito(hab, alGuardar) {
    const m = modal({ titulo: hab ? 'Editar hábito' : 'Nuevo hábito', ancho: 'chico', cuerpo: '' });
    const f = formulario({
        enviar: 'Guardar', alCancelar: m.cerrar,
        campos: [
            { nombre: 'nombre', etiqueta: 'Nombre del hábito', requerido: true, max: 80, valor: hab?.nombre },
            { nombre: 'emoji', etiqueta: 'Emoji (se elige solo según el nombre; puedes cambiarlo)', max: 8, valor: hab?.emoji ?? emojiPara(hab?.nombre) ?? '', ancho: 'mitad' },
            { nombre: 'color', etiqueta: 'Color', tipo: 'paleta', valor: hab?.color ?? PALETA[0].valor, opciones: PALETA },
            { nombre: 'meta_semanal', etiqueta: 'Meta: días por semana', tipo: 'number', min: 1, maxValor: 7, requerido: true, valor: hab?.meta_semanal ?? 5 },
        ],
        alEnviar: async (v) => {
            if (hab) await api.put(`/habitos/${hab.id}`, v); else await api.post('/habitos', v);
            m.cerrar(); aviso('Hábito guardado.'); alGuardar();
        },
    });
    // El emoji se va creando mientras escribes el nombre, hasta que lo cambies a mano
    const campoEmoji = f.campo('emoji'); const campoNombre = f.campo('nombre');
    let emojiManual = Boolean(hab?.emoji && hab.emoji !== emojiPara(hab.nombre));
    campoEmoji.addEventListener('input', () => { emojiManual = true; });
    campoNombre.addEventListener('input', () => { if (!emojiManual) campoEmoji.value = emojiPara(campoNombre.value); });
    if (hab) {
        f.el.querySelector('.acciones').prepend(h('button', { class: 'btn btn-texto-peligro', type: 'button', onclick: async () => {
            if (!(await confirmar({ mensaje: `¿Eliminar el hábito “${hab.nombre}” y todo su historial?`, textoOk: 'Eliminar', peligro: true }))) return;
            try { await api.del(`/habitos/${hab.id}`); m.cerrar(); aviso('Hábito eliminado.'); alGuardar(); } catch (e) { aviso(e.message, 'error'); }
        } }, 'Eliminar'));
    }
    m.el.querySelector('.modal-cuerpo').append(f.el);
}

export async function habitos(cont) {
    await cargarEn(cont, 'Cargando tus hábitos…', async () => {
        const respuesta = await api.get('/habitos', { mes: mesElegido?.slice(0, 7) });
        const { habitos: lista, mes, hoy } = respuesta;
        mesElegido = mesElegido ?? `${mes}-01`;
        const recargar = () => { vaciar(cont); habitos(cont); };
        const primero = `${mes}-01`;
        const nDias = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();
        const dias = Array.from({ length: nDias }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`);

        const cabecera = encabezadoPagina('Hábitos', 'Pequeñas rutinas, grandes resultados',
            h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Mes anterior', onclick: () => { mesElegido = sumarMeses(primero, -1); recargar(); } }, icono('izquierda')),
            h('strong', { class: 'letra-mano mes-titulo' }, mesYAnio(primero)),
            h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Mes siguiente', onclick: () => { mesElegido = sumarMeses(primero, 1); recargar(); } }, icono('derecha')),
            h('button', { class: 'btn btn-primario', type: 'button', onclick: () => formularioHabito(null, recargar) }, '+ Nuevo hábito'));

        if (!lista.length) {
            return h('div', null, cabecera, vacio('Aún no sigues ningún hábito',
                'Un hábito es algo que quieres hacer con regularidad (estudiar, leer, dormir bien…). Marca cada día que lo cumples y mira crecer tu racha.',
                h('div', { class: 'acciones centro' },
                    h('button', { class: 'btn btn-primario', type: 'button', onclick: async () => {
                        try { const r = await api.post('/habitos/sugeridos'); aviso(`${r.creados} hábitos recomendados agregados.`); recargar(); } catch (e) { aviso(e.message, 'error'); }
                    } }, estado.usuario.rol === 'estudiante' ? 'Agregar hábitos recomendados para estudiantes' : 'Agregar hábitos recomendados para docentes'),
                    h('button', { class: 'btn', type: 'button', onclick: () => formularioHabito(null, recargar) }, 'Crear uno propio'))));
        }

        const alternar = async (hab, dia, hecho, boton) => {
            boton.disabled = true;
            try {
                if (hecho) await api.del(`/habitos/${hab.id}/dias/${dia}`); else await api.put(`/habitos/${hab.id}/dias/${dia}`);
                recargar();
            } catch (e) { aviso(e.message, 'error'); boton.disabled = false; }
        };

        const tabla = h('div', { class: 'tabla-responsive habitos-caja' }, h('table', { class: 'tabla-habitos' },
            h('thead', null, h('tr', null, h('th', { scope: 'col', class: 'fija' }, 'Hábito'),
                dias.map((d) => h('th', { scope: 'col', class: d === hoy ? 'hoy' : '', title: fechaLarga(d) }, h('small', null, DIAS_CORTOS[(deISO(d).getDay() + 6) % 7].slice(0, 1)), diaDelMes(d))),
                h('th', { scope: 'col' }, 'Mes'))),
            h('tbody', null, lista.map((hab) => {
                const hechos = new Set(hab.dias);
                const pct = Math.round((hechos.size * 100) / Math.max(1, Math.min(nDias, hoy.startsWith(mes) ? diaDelMes(hoy) : nDias)));
                return h('tr', null,
                    h('th', { scope: 'row', class: 'fija' }, h('button', { type: 'button', class: 'habito-nombre enlace', onclick: () => formularioHabito(hab, recargar), title: 'Editar' },
                        h('span', { class: 'habito-emoji', style: { background: `${hab.color}22` } }, hab.emoji ?? '⭐'), h('span', null, hab.nombre,
                            h('small', null, hab.racha ? `🔥 racha de ${hab.racha} día${hab.racha > 1 ? 's' : ''}` : `meta: ${hab.meta_semanal} días/sem`)))),
                    dias.map((d) => {
                        const hecho = hechos.has(d);
                        const futuro = d > hoy;
                        return h('td', null, h('button', {
                            type: 'button', class: `casilla${hecho ? ' hecha' : ''}${d === hoy ? ' hoy' : ''}`, style: { '--c': hab.color }, disabled: futuro, 'aria-pressed': String(hecho),
                            'aria-label': `${hab.nombre}, ${fechaLarga(d)}: ${hecho ? 'cumplido' : 'sin marcar'}`, onclick: (e) => alternar(hab, d, hecho, e.currentTarget),
                        }, hecho ? '✓' : ''));
                    }),
                    h('td', { class: 'habito-total' }, h('strong', null, `${hechos.size}`), barraProgreso(Math.min(100, pct), { color: hab.color, etiqueta: `Cumplimiento de ${hab.nombre}` })));
            }))));

        return h('div', { class: 'habitos' }, cabecera, tabla,
            h('p', { class: 'ayuda' }, 'Toca una casilla para marcar el día. La barra muestra qué tanto cumpliste del tiempo transcurrido del mes.'));
    });
}

export { hoyLocal };
