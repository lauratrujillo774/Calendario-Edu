# Esquema de la base de datos (calendario_edu) — parte académica

Todos los cambios se hacen con migraciones (`npm run migrar`). Este documento resume cómo se relacionan las tablas que maneja el administrador.

```
roles ──< usuarios >── grados ──< grado_materias >── materias        (pensum: materias de cada grado)
             │             │
             │             └──< grupos ──< matriculas >── usuarios (estudiante)
             │
             ├──< docente_grados >── grados                          (grados que dicta el docente)
             ├──< docente_materias >── materias                      (materias que dicta el docente)
             └──< asignaciones (docente + materia + grupo) ──< tareas ──< entregas
```

## usuarios (estudiantes, docentes y administradores)
| Columna | Detalle |
|---|---|
| `id` | Llave primaria interna (número). Las demás tablas apuntan a ella. |
| `correo` | **Único** (sin distinguir mayúsculas). Es la identidad de inicio de sesión y no se puede repetir. |
| `identificacion` | **Única**. Obligatoria para estudiantes y docentes. |
| `nombres`, `apellidos` | Por separado; `nombre` guarda el nombre completo armado con ambos. |
| `contrasena_hash` | Contraseña con bcrypt (nunca en texto). |
| `fecha_nacimiento` | De ahí se calcula la edad. |
| `grado_id` | Grado que cursa (estudiantes). |
| `foto` | Ruta del archivo (fuera de la carpeta pública). |
| `rol_id`, `activo` | Rol y si puede entrar. |

## Pensum: materias por grado
`grado_materias (grado_id, materia_id)` — clave primaria compuesta, sin repetidos.
Al elegir el grado de un estudiante, sus materias salen de aquí y aparecen en su perfil.

## Qué dicta cada docente
`docente_clases (usuario_id, grado_id, materia_id, grupo_id)`: una fila por cada materia que el docente enseña en un grado (por ejemplo 10° Matemáticas, 11° Física).
Si `grupo_id` está vacío dicta todos los grupos del grado; si no, solo ese grupo. La materia debe estar en el plan de estudios (`grado_materias`) de ese grado.
Con eso el sistema genera las `asignaciones` (docente + materia + grupo) y los estudiantes del grupo reciben lo que publique.
`docente_grados` y `docente_materias` son listas resumen que se llenan solas.

## Al eliminar a una persona
Se borra la cuenta y lo que depende de ella (`ON DELETE CASCADE`): de un docente, sus asignaciones y actividades (con las entregas y notas
de los estudiantes); de un estudiante, sus entregas, matrícula, diario, pendientes, notas y hábitos. Por eso la pantalla avisa antes de confirmar.

## Limpieza (migración 024, 2026-10-15)
EduCal es solo para estudiantes, así que se eliminaron las tablas de docente (`docente_clases`, `docente_grados`, `docente_materias`, vista `v_tareas_profesor`), de IA (`consultas_ia`) y de pantallas quitadas (`perfil_aprendizaje`, `usuario_tecnica`, `sesiones_enfoque`, `guias_estudio`, `planes_clase`, `asistencias`, `bullets`, `colecciones`, `coleccion_items`).
Las secciones de arriba sobre docentes describen el diseño anterior. Respaldo previo: `database/respaldos/` (no se sube a git). Revertir (`npm run migrar:revertir`) recrea las tablas vacías.
Queda `estudiante_materias` (materias que registra cada estudiante).
