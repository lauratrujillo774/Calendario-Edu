// Estado compartido de la aplicación (usuario con sesión, token CSRF, catálogo de materias y grupos)
export const estado = {
    usuario: null,
    csrf: null,
    catalogo: null,
    alExpirar: null,
};

export const esAdmin = () => estado.usuario?.rol === 'admin';
export const esProfesor = () => estado.usuario?.rol === 'profesor';
export const esEstudiante = () => estado.usuario?.rol === 'estudiante';
export const puedeGestionar = () => esAdmin() || esProfesor();
