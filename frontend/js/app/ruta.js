// Navegación por "hash" (#/agenda, #/tarea/3, …)
export const ir = (ruta) => { location.hash = '#' + ruta; };

export function rutaActual() {
    const crudo = location.hash.replace(/^#/, '') || '/inicio';
    const [ruta, consulta = ''] = crudo.split('?');
    return { ruta, consulta: new URLSearchParams(consulta) };
}
