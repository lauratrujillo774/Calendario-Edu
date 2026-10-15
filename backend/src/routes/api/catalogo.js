// Datos para llenar listas desplegables y filtros, ya limitados a lo que el usuario puede usar.
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { asignacionesDe, esAdmin, esEstudiante } from '../../servicios/permisos.js';
import { COLORES_NOTA } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

router.get('/', async (req, res) => {
    const u = req.usuario;
    const asignaciones = await asignacionesDe(u);
    const materias = new Map();
    const grupos = new Map();
    const grados = new Map();
    for (const a of asignaciones) {
        materias.set(a.materia_id, { id: a.materia_id, nombre: a.materia, color: a.color });
        grupos.set(a.grupo_id, { id: a.grupo_id, nombre: a.grupo, grado_id: a.grado_id });
        if (a.grado_id) grados.set(a.grado_id, { id: a.grado_id, nombre: a.grado });
    }
    if (esAdmin(u)) {
        // El administrador puede usar cualquier grado, grupo y materia
        for (const g of (await connection.query('SELECT id, nombre, grado_id FROM grupos'))[0]) grupos.set(g.id, g);
        for (const g of (await connection.query('SELECT id, nombre FROM grados ORDER BY orden'))[0]) grados.set(g.id, g);
        for (const m of (await connection.query('SELECT id, nombre, color FROM materias'))[0]) materias.set(m.id, m);
    } else if (esEstudiante(u)) {
        // El estudiante ve todas las materias de su grado (pensum), aunque todavía no tengan actividades
        if (u.grado_id) {
            const [[g]] = await connection.query('SELECT id, nombre FROM grados WHERE id = ?', [u.grado_id]);
            if (g) grados.set(g.id, g);
            for (const m of (await connection.query(
                'SELECT m.id, m.nombre, m.color FROM grado_materias gm JOIN materias m ON m.id = gm.materia_id WHERE gm.grado_id = ?', [u.grado_id]))[0]) materias.set(m.id, m);
        }
        // ...y las que él mismo registró
        for (const m of (await connection.query(
            'SELECT m.id, m.nombre, m.color FROM estudiante_materias em JOIN materias m ON m.id = em.materia_id WHERE em.usuario_id = ?', [u.id]))[0]) materias.set(m.id, m);
    }
    const porNombre = (a, b) => a.nombre.localeCompare(b.nombre);
    res.json({
        asignaciones,
        materias: [...materias.values()].sort(porNombre),
        grupos: [...grupos.values()].sort(porNombre),
        grados: [...grados.values()].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true })),
        colores_nota: COLORES_NOTA,
    });
});

// Todos los grados y materias existentes (para formularios de perfil y registro)
router.get('/todos', async (req, res) => {
    const [grados] = await connection.query('SELECT id, nombre, orden FROM grados ORDER BY orden');
    const [materias] = await connection.query('SELECT id, nombre, color FROM materias ORDER BY nombre');
    const [grupos] = await connection.query('SELECT id, nombre, grado_id FROM grupos ORDER BY nombre');
    res.json({ grados, materias, grupos });
});

export default router;
