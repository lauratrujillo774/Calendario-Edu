// Mis materias: el estudiante registra las materias que ve (se suman a las del plan de estudios de su grado).
import { encabezadoPagina } from '../comp.js';
import { tarjetaMaterias } from './materias-panel.js';

export async function materias(cont) {
    cont.append(encabezadoPagina('Mis materias', 'Agrega las materias que ves: las eliges luego en tus tareas, exámenes y calificaciones'), tarjetaMaterias());
}
