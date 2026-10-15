// EduCal es una aplicación para ESTUDIANTES: no hay cuentas de docente ni de administrador.
// (Las pruebas automáticas desactivan esta regla con SOLO_ESTUDIANTES=false para poder probar el resto del sistema.)
export const soloEstudiantes = () => process.env.SOLO_ESTUDIANTES !== 'false';
