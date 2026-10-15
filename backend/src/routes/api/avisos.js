import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion, requiereRol } from '../../middleware/sesion.js';
import { filtroVisibilidadGrupo, puedeGestionarGrupo, esAdmin } from '../../servicios/permisos.js';
import { ErrorHttp, texto, entero } from '../../utils/validar.js';

const router = Router();
router.use(requiereSesion);

router.get('/', async (req, res) => {
    const vis = filtroVisibilidadGrupo(req.usuario, 'a', 'autor_id');
    const limite = Math.min(100, entero(req.query.limite, 'El límite', { requerido: false }) ?? 30);
    const [filas] = await connection.query(
        `SELECT a.id, a.titulo, a.contenido, a.creado_en, a.grupo_id, g.nombre AS grupo, a.autor_id, u.nombre AS autor
         FROM avisos a LEFT JOIN grupos g ON g.id = a.grupo_id JOIN usuarios u ON u.id = a.autor_id
         WHERE ${vis.sql} ORDER BY a.creado_en DESC, a.id DESC LIMIT ?`, [...vis.params, limite]);
    res.json({ items: filas.map((a) => ({ ...a, puede_borrar: esAdmin(req.usuario) || a.autor_id === req.usuario.id })) });
});

router.post('/', requiereRol('profesor', 'admin'), async (req, res) => {
    const b = req.body ?? {};
    const grupoId = entero(b.grupo_id, 'El grupo', { requerido: false });
    if (!grupoId && !esAdmin(req.usuario)) throw new ErrorHttp(403, 'Elige el grupo al que va dirigido el aviso.');
    if (grupoId && !(await puedeGestionarGrupo(req.usuario, grupoId))) throw new ErrorHttp(403, 'No puedes publicar avisos para ese grupo.');
    const [r] = await connection.query(
        'INSERT INTO avisos (autor_id, grupo_id, titulo, contenido) VALUES (?, ?, ?, ?)',
        [req.usuario.id, grupoId, texto(b.titulo, 'El título', { max: 150 }), texto(b.contenido, 'El mensaje', { max: 3000 })]);
    res.status(201).json({ id: r.insertId });
});

router.delete('/:id', requiereRol('profesor', 'admin'), async (req, res) => {
    const id = entero(req.params.id, 'El aviso');
    const [[a]] = await connection.query('SELECT autor_id FROM avisos WHERE id = ?', [id]);
    if (!a) throw new ErrorHttp(404, 'El aviso no existe.');
    if (!esAdmin(req.usuario) && a.autor_id !== req.usuario.id) throw new ErrorHttp(403, 'Solo puedes borrar tus avisos.');
    await connection.query('DELETE FROM avisos WHERE id = ?', [id]);
    res.json({ ok: true });
});

export default router;
