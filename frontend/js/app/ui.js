// Piezas de interfaz reutilizables: creación de elementos (segura contra XSS), iconos, modales, avisos y formularios.

// ---------- Elementos ----------
// El `append` nativo convierte arreglos y null en texto ("[object HTMLElement]", "null"). Para evitar esa clase de errores
// en toda la aplicación, `append` acepta arreglos anidados e ignora null/undefined/false.
const appendNativo = Element.prototype.append;
Element.prototype.append = function append(...hijos) {
    for (const hijo of hijos.flat(Infinity)) {
        if (hijo === null || hijo === undefined || hijo === false) continue;
        appendNativo.call(this, hijo instanceof Node ? hijo : String(hijo));
    }
};

// Todo el texto se inserta como nodo de texto, nunca como HTML, así que el contenido de usuarios no puede inyectar código.
export function h(etiqueta, props, ...hijos) {
    const el = document.createElement(etiqueta);
    for (const [k, v] of Object.entries(props ?? {})) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') {
            for (const [p, valor] of Object.entries(v)) {
                if (valor == null) continue;
                if (p.startsWith('--')) el.style.setProperty(p, valor);
                else el.style[p] = valor;
            }
        } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'for') el.setAttribute('for', v);
        else if (['value', 'checked', 'disabled', 'selected', 'readOnly', 'required', 'multiple'].includes(k)) el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
    }
    anadir(el, hijos);
    return el;
}

export function anadir(padre, hijos) {
    for (const hijo of hijos.flat(Infinity)) {
        if (hijo === null || hijo === undefined || hijo === false) continue;
        padre.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
    }
    return padre;
}

export function vaciar(el) {
    el.replaceChildren();
    return el;
}

// ---------- Iconos (trazos simples, estilo línea) ----------
const ICONOS = {
    inicio: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    agenda: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    campana: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    nota: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5z"/><path d="M15 3v6h6"/>',
    usuario: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    usuarios: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
    izquierda: '<path d="m15 18-6-6 6-6"/>',
    derecha: '<path d="m9 18 6-6-6-6"/>',
    buscar: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    editar: '<path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5z"/>',
    borrar: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    archivo: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    aviso: '<path d="m3 11 18-5v12L3 14z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    grafica: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
    libro: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    alerta: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3z"/><path d="M12 9v4M12 17h.01"/>',
    descargar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    subir: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    edificio: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    ojo: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    'ojo-tachado': '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    camara: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    estrella: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3-6.2 3.3L8 14.2 3 9.3l6.9-1z"/>',
    flecha: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    examen: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
    objetivo: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    papelera: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    candado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};

export function icono(nombre, tam = 18) {
    const span = document.createElement('span');
    span.className = 'icono';
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = `<svg viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONOS[nombre] ?? ''}</svg>`;
    return span;
}

// ---------- Avisos breves ----------
export function aviso(mensaje, tipo = 'ok') {
    let zona = document.getElementById('avisos');
    if (!zona) {
        zona = h('div', { id: 'avisos', 'aria-live': 'polite' });
        document.body.append(zona);
    }
    const el = h('div', { class: `aviso aviso-${tipo}`, role: tipo === 'error' ? 'alert' : 'status' },
        icono(tipo === 'error' ? 'alerta' : 'check', 18), h('span', null, mensaje));
    zona.append(el);
    setTimeout(() => el.classList.add('saliendo'), tipo === 'error' ? 6000 : 3200);
    setTimeout(() => el.remove(), tipo === 'error' ? 6400 : 3600);
}

// ---------- Modales ----------
let modalesAbiertos = 0;

export function modal({ titulo, cuerpo, ancho = 'normal', alCerrar }) {
    const previo = document.activeElement;
    const idTitulo = 't' + Math.random().toString(36).slice(2, 8);
    let cerrado = false;
    const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        document.removeEventListener('keydown', teclas);
        fondo.remove();
        if (--modalesAbiertos === 0) document.body.classList.remove('sin-scroll');
        previo?.focus?.();
        alCerrar?.();
    };
    const teclas = (e) => {
        if (e.key === 'Escape' && fondo === [...document.querySelectorAll('.modal-fondo')].pop()) cerrar();
        if (e.key === 'Tab') {
            const foco = [...fondo.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea')]
                .filter((x) => x.offsetParent !== null);
            if (!foco.length) return;
            const primero = foco[0];
            const ultimo = foco[foco.length - 1];
            if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
        }
    };
    const fondo = h('div', { class: 'modal-fondo', onmousedown: (e) => { if (e.target === fondo) cerrar(); } },
        h('div', { class: `modal modal-${ancho}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo },
            h('header', { class: 'modal-cab' },
                h('h2', { id: idTitulo }, titulo),
                h('button', { class: 'btn-icono', type: 'button', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar'))),
            h('div', { class: 'modal-cuerpo' }, cuerpo)));
    document.body.append(fondo);
    modalesAbiertos++;
    document.body.classList.add('sin-scroll');
    document.addEventListener('keydown', teclas);
    (fondo.querySelector('[autofocus], input:not([type=hidden]), textarea, select') ?? fondo.querySelector('.modal-cab button'))?.focus();
    return { cerrar, el: fondo };
}

export function confirmar({ titulo = 'Confirmar', mensaje, textoOk = 'Aceptar', peligro = false }) {
    return new Promise((resolver) => {
        let respondido = false;
        const responder = (v) => { respondido = true; m.cerrar(); resolver(v); };
        const m = modal({
            titulo, ancho: 'chico',
            alCerrar: () => { if (!respondido) resolver(false); },
            cuerpo: [
                h('p', { class: 'texto-confirmar' }, mensaje),
                h('div', { class: 'acciones' },
                    h('button', { class: 'btn', type: 'button', onclick: () => responder(false) }, 'Cancelar'),
                    h('button', { class: `btn ${peligro ? 'btn-peligro' : 'btn-primario'}`, type: 'button', autofocus: true, onclick: () => responder(true) }, textoOk)),
            ],
        });
    });
}

// ---------- Formularios ----------
// campos: [{ nombre, etiqueta, tipo, opciones, valor, requerido, ayuda, max, ancho }]
export function formulario({ campos, enviar = 'Guardar', cancelar, alEnviar, alCancelar, extra }) {
    const refs = {};
    const error = h('p', { class: 'form-error', role: 'alert', hidden: true });
    const filas = campos.map((c) => {
        const id = 'f' + Math.random().toString(36).slice(2, 8);
        let input;
        if (c.tipo === 'textarea') {
            input = h('textarea', { id, name: c.nombre, rows: c.filas ?? 4, maxlength: c.max, required: c.requerido, placeholder: c.placeholder });
            input.value = c.valor ?? '';
        } else if (c.tipo === 'select') {
            input = h('select', { id, name: c.nombre, required: c.requerido },
                (c.opciones ?? []).map((o) => h('option', { value: o.valor }, o.texto)));
            input.value = c.valor ?? '';
        } else if (c.tipo === 'paleta') {
            // Paleta de colores con nombre (el usuario elige un color, no escribe códigos)
            let actual = c.valor ?? c.opciones[0].valor;
            input = h('div', { class: 'paleta', role: 'radiogroup', 'aria-label': c.etiqueta });
            const pintar = () => input.querySelectorAll('button').forEach((b) => { const on = b.dataset.valor === actual; b.classList.toggle('elegido', on); b.setAttribute('aria-checked', String(on)); });
            for (const o of c.opciones) {
                input.append(h('button', { type: 'button', class: 'color-op', role: 'radio', style: { '--c': o.valor }, title: o.nombre, 'aria-label': o.nombre, dataset: { valor: o.valor },
                    onclick: () => { actual = o.valor; pintar(); c.alCambiar?.(actual); } }, icono('check', 14)));
            }
            input.valorActual = () => actual;
            input.fijar = (v) => { actual = v; pintar(); };
            pintar();
        } else if (c.tipo === 'multicheck') {
            // Varias casillas: el valor es la lista de opciones marcadas
            const marcadas = new Set((c.valor ?? []).map(String));
            input = h('div', { class: 'multicheck', role: 'group', 'aria-label': c.etiqueta },
                c.opciones.map((o) => h('label', { class: 'check-chip' }, h('input', { type: 'checkbox', value: o.valor, checked: marcadas.has(String(o.valor)) }), h('span', null, o.texto))));
            input.valorActual = () => [...input.querySelectorAll('input:checked')].map((x) => x.value);
        } else if (c.tipo === 'checkbox') {
            input = h('input', { id, name: c.nombre, type: 'checkbox', checked: Boolean(c.valor) });
        } else {
            input = h('input', {
                id, name: c.nombre, type: c.tipo ?? 'text', maxlength: c.max, required: c.requerido, min: c.min, max: c.maxValor,
                step: c.paso, placeholder: c.placeholder, accept: c.accept, autocomplete: c.autocompletar,
            });
            if (c.tipo !== 'file') input.value = c.valor ?? '';
        }
        refs[c.nombre] = { input, def: c };
        const etiqueta = h(['paleta', 'multicheck'].includes(c.tipo) ? 'span' : 'label', { for: ['paleta', 'multicheck'].includes(c.tipo) ? null : id, class: ['paleta', 'multicheck'].includes(c.tipo) ? 'etiqueta-grupo' : null }, c.etiqueta, c.requerido ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null);
        const ayuda = c.ayuda ? h('small', { class: 'ayuda' }, c.ayuda) : null;
        if (c.tipo === 'checkbox') return h('div', { class: 'campo campo-check' }, input, etiqueta, ayuda);
        // Contraseña: con el "ojito" para verla u ocultarla
        let control = input;
        if (c.tipo === 'password') {
            const ojo = h('button', { type: 'button', class: 'ojo-clave', 'aria-label': 'Mostrar contraseña', title: 'Mostrar contraseña', onclick: () => {
                const visible = input.type === 'text';
                input.type = visible ? 'password' : 'text';
                ojo.replaceChildren(icono(visible ? 'ojo' : 'ojo-tachado', 20));
                ojo.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
                ojo.title = visible ? 'Mostrar contraseña' : 'Ocultar contraseña';
            } }, icono('ojo', 20));
            control = h('div', { class: 'campo-clave' }, input, ojo);
        }
        return h('div', { class: `campo${c.ancho === 'mitad' ? ' mitad' : ''}${c.oculto ? ' oculto' : ''}` }, etiqueta, control, ayuda);
    });

    const valores = () => {
        const v = {};
        for (const [nombre, { input, def }] of Object.entries(refs)) {
            v[nombre] = input.valorActual ? input.valorActual() : def.tipo === 'checkbox' ? input.checked : def.tipo === 'file' ? (input.files[0] ?? null) : input.value;
        }
        return v;
    };

    const boton = h('button', { class: 'btn btn-primario', type: 'submit' }, enviar);
    const el = h('form', {
        class: 'formulario', novalidate: true,
        onsubmit: async (e) => {
            e.preventDefault();
            error.hidden = true;
            if (!el.checkValidity()) {
                el.reportValidity();
                return;
            }
            boton.disabled = true;
            boton.classList.add('cargando');
            try {
                await alEnviar(valores());
            } catch (err) {
                error.textContent = err.message;
                error.hidden = false;
                error.scrollIntoView({ block: 'nearest' });
            } finally {
                boton.disabled = false;
                boton.classList.remove('cargando');
            }
        },
    }, h('div', { class: 'campos' }, filas), extra, error,
    h('div', { class: 'acciones' }, cancelar !== false ? h('button', { class: 'btn', type: 'button', onclick: alCancelar }, cancelar ?? 'Cancelar') : null, boton));

    return {
        el,
        valores,
        campo: (nombre) => refs[nombre].input,
        mostrar: (nombre, visible) => refs[nombre].input.closest('.campo').classList.toggle('oculto', !visible),
    };
}

export const opcionesDe = (lista, valor, texto, vacio) =>
    [...(vacio !== undefined ? [{ valor: '', texto: vacio }] : []), ...lista.map((x) => ({ valor: x[valor], texto: typeof texto === 'function' ? texto(x) : x[texto] }))];

// ---------- Estados de pantalla ----------
export const cargando = (texto = 'Cargando…') =>
    h('div', { class: 'estado-carga', role: 'status' }, h('span', { class: 'giro' }), h('span', null, texto));

export const vacio = (titulo, detalle, accion) =>
    h('div', { class: 'vacio' }, h('div', { class: 'vacio-dibujo', 'aria-hidden': 'true' }, '✿'), h('p', { class: 'vacio-titulo' }, titulo),
        detalle ? h('p', { class: 'vacio-detalle' }, detalle) : null, accion);

export function errorCaja(err, reintentar) {
    return h('div', { class: 'error-caja', role: 'alert' },
        icono('alerta', 22), h('p', null, err.message ?? 'No se pudo cargar la información.'),
        reintentar ? h('button', { class: 'btn', type: 'button', onclick: reintentar }, 'Reintentar') : null);
}

// Muestra "cargando", ejecuta la carga y pinta el resultado (o un error con botón de reintento)
export async function cargarEn(contenedor, texto, tarea) {
    const ejecutar = async () => {
        vaciar(contenedor).append(cargando(texto));
        try {
            const contenido = await tarea();
            vaciar(contenedor);
            if (contenido) anadir(contenedor, [contenido]);
        } catch (err) {
            if (err.codigo === 401) return;
            vaciar(contenedor).append(errorCaja(err, ejecutar));
        }
    };
    await ejecutar();
}

export const insignia = (texto, clase = '') => h('span', { class: `insignia ${clase}` }, texto);

export function retardo(fn, ms = 300) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}
