// Convierte el texto de la IA (viñetas, listas numeradas, **negrita**) en elementos del DOM de forma segura:
// nunca se usa innerHTML, así que aunque la IA devuelva etiquetas HTML se muestran como texto.
import { h } from './ui.js';

function enLinea(texto) {
    const partes = [];
    const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
    let ultimo = 0;
    let m;
    while ((m = re.exec(texto))) {
        if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index));
        partes.push(m[1] !== undefined ? h('strong', null, m[1]) : h('code', null, m[2]));
        ultimo = re.lastIndex;
    }
    if (ultimo < texto.length) partes.push(texto.slice(ultimo));
    return partes;
}

export function renderTexto(texto) {
    const raiz = h('div', { class: 'texto-ia' });
    let lista = null;
    let tipo = null;
    let parrafo = [];
    const cerrarParrafo = () => { if (parrafo.length) { raiz.append(h('p', null, enLinea(parrafo.join(' ')))); parrafo = []; } };
    const cerrarLista = () => { lista = null; tipo = null; };
    for (const bruta of String(texto).split(/\r?\n/)) {
        const linea = bruta.trimEnd();
        const viñeta = /^\s*(?:[-*•])\s+(.*)$/.exec(linea);
        const numerada = /^\s*\d+[.)]\s+(.*)$/.exec(linea);
        const titulo = /^\s*#{1,4}\s+(.*)$/.exec(linea);
        if (viñeta || numerada) {
            cerrarParrafo();
            const quiere = viñeta ? 'ul' : 'ol';
            if (tipo !== quiere) { lista = h(quiere, null); raiz.append(lista); tipo = quiere; }
            lista.append(h('li', null, enLinea((viñeta ?? numerada)[1])));
        } else if (titulo) {
            cerrarParrafo(); cerrarLista();
            raiz.append(h('h4', null, enLinea(titulo[1])));
        } else if (!linea.trim()) {
            cerrarParrafo(); cerrarLista();
        } else {
            cerrarLista();
            parrafo.push(linea.trim());
        }
    }
    cerrarParrafo();
    return raiz;
}
