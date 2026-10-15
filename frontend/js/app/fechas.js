// Utilidades de fechas en español, formato de 24 horas. Las fechas viajan como texto "AAAA-MM-DD".
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const pad = (n) => String(n).padStart(2, '0');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const aISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const deISO = (s) => {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
};
export const hoy = () => aISO(new Date());
export const sumarDias = (iso, n) => {
    const d = deISO(iso);
    d.setDate(d.getDate() + n);
    return aISO(d);
};
export const inicioSemana = (iso) => {
    const d = deISO(iso);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return aISO(d);
};
export const inicioMes = (iso) => iso.slice(0, 8) + '01';
export const sumarMeses = (iso, n) => {
    const d = deISO(inicioMes(iso));
    d.setMonth(d.getMonth() + n);
    return aISO(d);
};
export const diferenciaDias = (a, b) => Math.round((deISO(a) - deISO(b)) / 86400000);

export const nombreDia = (iso) => cap(DIAS[deISO(iso).getDay()]);
export const nombreDiaCorto = (iso) => cap(DIAS[deISO(iso).getDay()].slice(0, 3));
export const nombreMes = (iso) => cap(MESES[deISO(iso).getMonth()]);
export const diaDelMes = (iso) => deISO(iso).getDate();
export const mesYAnio = (iso) => `${nombreMes(iso)} ${deISO(iso).getFullYear()}`;

export const fechaLarga = (iso) => {
    const d = deISO(iso);
    return `${cap(DIAS[d.getDay()])}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};
export const fechaCorta = (iso) => {
    const d = deISO(iso);
    return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
};
export const rangoSemana = (iso) => {
    const a = inicioSemana(iso);
    const b = sumarDias(a, 6);
    return `${fechaCorta(a)} – ${fechaCorta(b)} ${deISO(b).getFullYear()}`;
};

export const horaCorta = (h) => (h ? String(h).slice(0, 5) : '');

// "Hoy", "Mañana", "En 3 días", "Hace 2 días"
export function relativa(iso) {
    const n = diferenciaDias(iso, hoy());
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Mañana';
    if (n === -1) return 'Ayer';
    return n > 0 ? `En ${n} días` : `Hace ${-n} días`;
}

// "2026-10-11 14:30:00" → "11 oct, 14:30"
export function fechaHora(s) {
    if (!s) return '';
    return `${fechaCorta(s.slice(0, 10))}, ${s.slice(11, 16)}`;
}

// Valor para <input type="datetime-local">
export function ahoraParaInput(minutos = 0) {
    const d = new Date(Date.now() + minutos * 60000);
    return `${aISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function saludo() {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
