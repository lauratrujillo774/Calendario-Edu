// Campanita: avisos del usuario (nueva tarea, vence pronto, calificación, recordatorio…)
import { Router } from 'express';
import { connection } from '../../config/mysql/dbmysql.js';
import { requiereSesion } from '../../middleware/sesion.js';
import { ErrorHttp, entero, booleano } from '../../utils/validar.js';
import { correoConfigurado, enviarCorreo, plantillaCorreo } from '../../servicios/correo.js';
import { notificar } from '../../servicios/notificaciones.js';

const router = Router();
router.use(requiereSesion);

router.get('/', async (req, res) => {
    const limite = Math.min(200, entero(req.query.limite, 'El límite', { requerido: false }) ?? 40);
    const [items] = await connection.query(
        'SELECT id, tipo, titulo, mensaje, ruta, leida, creada_en FROM notificaciones WHERE usuario_id = ? ORDER BY id DESC LIMIT ?', [req.usuario.id, limite]);
    const [[{ n }]] = await connection.query('SELECT COUNT(*) AS n FROM notificaciones WHERE usuario_id = ? AND leida = 0', [req.usuario.id]);
    const [[u]] = await connection.query('SELECT notif_correo AS activado, correo FROM usuarios WHERE id = ?', [req.usuario.id]);
    res.json({ items: items.map((x) => ({ ...x, leida: Boolean(x.leida) })), no_leidas: n, correo: { configurado: correoConfigurado(), activado: Boolean(u.activado), direccion: u.correo } });
});

// Activar o desactivar las alertas por correo (las de la campanita siempre llegan)
router.patch('/correo', async (req, res) => {
    const activado = booleano(req.body?.activado) ? 1 : 0;
    await connection.query('UPDATE usuarios SET notif_correo = ? WHERE id = ?', [activado, req.usuario.id]);
    res.json({ ok: true, activado: Boolean(activado) });
});

// Alerta de prueba: aparece en la campanita y, si el correo está configurado y activado, también llega al correo de la persona
router.post('/prueba', async (req, res) => {
    const [[u]] = await connection.query('SELECT correo, nombre, notif_correo FROM usuarios WHERE id = ?', [req.usuario.id]);
    const titulo = 'Alerta de prueba';
    const mensaje = 'Así te llegarán las alertas de tareas, exámenes y calificaciones.';
    // La campanita siempre recibe la alerta; el correo se manda aquí mismo (no queda en la cola)
    await notificar(req.usuario.id, { tipo: 'prueba', clave: `prueba-${Date.now()}`, titulo, mensaje, ruta: '/alertas', correo: false });
    let correo;
    if (!correoConfigurado()) correo = 'no_configurado';
    else if (!u.notif_correo) correo = 'desactivado';
    else {
        try {
            const { texto, html } = plantillaCorreo({ nombre: u.nombre.split(' ')[0], titulo, mensaje, ruta: '/alertas' });
            await enviarCorreo({ para: u.correo, asunto: `EduCal · ${titulo}`, texto, html });
            correo = 'enviado';
        } catch (e) {
            console.error('No se pudo enviar la alerta de prueba:', e.message);
            correo = 'error';
        }
    }
    const mensajes = {
        enviado: `Te enviamos una alerta de prueba a ${u.correo}. Si no la ves, revisa la carpeta de spam.`,
        error: 'La alerta llegó a la campanita, pero el correo no se pudo enviar. Revisa la configuración del correo en el servidor.',
        desactivado: 'La alerta llegó a la campanita. Tus alertas por correo están desactivadas: actívalas para recibirlas también en tu correo.',
        no_configurado: 'La alerta llegó a la campanita. El correo todavía no está configurado en el servidor, por eso no salió ningún correo.',
    };
    res.json({ ok: true, campanita: true, correo, mensaje: mensajes[correo] });
});

router.post('/leer-todas', async (req, res) => {
    await connection.query('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0', [req.usuario.id]);
    res.json({ ok: true });
});

router.post('/:id/leer', async (req, res) => {
    const [r] = await connection.query('UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?', [entero(req.params.id, 'La notificación'), req.usuario.id]);
    if (!r.affectedRows) throw new ErrorHttp(404, 'La notificación no existe.');
    res.json({ ok: true });
});

router.delete('/', async (req, res) => {
    await connection.query('DELETE FROM notificaciones WHERE usuario_id = ? AND leida = 1', [req.usuario.id]);
    res.json({ ok: true });
});

export default router;
