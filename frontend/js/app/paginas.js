// Cada pantalla de la aplicación tiene su propio archivo HTML en frontend/pages/.
// Esta tabla es la única fuente: la usan el menú (para enlazar a cada página), el servidor (cabeceras de seguridad)
// y el generador de páginas (backend/scripts/generar-paginas.mjs).
export const PAGINAS = {
    '/inicio': { archivo: 'inicio.html', titulo: 'Inicio' },
    '/alertas': { archivo: 'alertas.html', titulo: 'Alertas' },
    '/agenda': { archivo: 'calendario.html', titulo: 'Calendario' },
    '/tareas': { archivo: 'tareas-pendientes.html', titulo: 'Tareas' },
    '/examenes': { archivo: 'examenes.html', titulo: 'Exámenes' },
    '/calificaciones': { archivo: 'calificaciones.html', titulo: 'Calificaciones' },
    '/estadisticas': { archivo: 'estadisticas.html', titulo: 'Estadísticas' },
    '/diario': { archivo: 'mi-diario.html', titulo: 'Mi diario' },
    '/materias': { archivo: 'materias.html', titulo: 'Mis materias' },
    '/habitos': { archivo: 'habitos.html', titulo: 'Hábitos' },
    '/perfil': { archivo: 'configuracion.html', titulo: 'Configuración' },
};

// Enlace a la página de una pantalla (si no tiene página propia, queda como enlace dentro de la misma página)
export const paginaDe = (ruta) => PAGINAS[ruta]?.archivo ?? `#${ruta}`;
// Archivos de página que contienen la aplicación (app.html es la entrada principal tras iniciar sesión)
export const ARCHIVOS_APP = new Set(['app.html', ...Object.values(PAGINAS).map((p) => p.archivo)]);
