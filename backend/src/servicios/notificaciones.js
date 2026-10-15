// Notificaciones: campanita + correo. Cada aviso tiene una "clave" única por usuario para no repetirse nunca.
import { connection } from '../config/mysql/dbmysql.js';
import { correoConfigurado, enviarCorreo, plantillaCorreo } from './correo.js';

const corto = (s, n) => String(s ?? '').slice(0, n);

// Crea la notificación si no existía. correo=false → solo campanita (correo_enviado = 2 "no aplica")
export async function notificar(usuarioId, { tipo, clave, titulo, mensaje = null, ruta = null, correo = true }) {
    const [r] = await connection.query(
        `INSERT IGNORE INTO notificaciones (usuario_id, tipo, clave, titulo, mensaje, ruta, correo_enviado) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [usuarioId, corto(tipo, 30), corto(clave, 120), corto(titulo, 160), mensaje ? corto(mensaje, 400) : null, ruta, correo ? 0 : 2]);
    return r.affectedRows === 1;
}

export async function notificarVarios(usuarioIds, datos) {
    let n = 0;
    for (const id of usuarioIds) if (await notificar(id, { ...datos, clave: datos.clave })) n++;
    return n;
}

// ---------- Correos ----------
let enCurso = null;
async function pasadaDeCorreos(limite) {
    let enviados = 0;
    let fallidos = 0;
    const [filas] = await connection.query(
        `SELECT n.id, n.titulo, n.mensaje, n.ruta, u.correo, u.nombre, u.notif_correo
         FROM notificaciones n JOIN usuarios u ON u.id = n.usuario_id AND u.activo = 1
         WHERE n.correo_enviado = 0 AND n.intentos < 3 AND n.creada_en > DATE_SUB(NOW(), INTERVAL 3 DAY)
         ORDER BY n.id LIMIT ?`, [limite]);
    for (const n of filas) {
        if (!n.notif_correo) { await connection.query('UPDATE notificaciones SET correo_enviado = 2 WHERE id = ?', [n.id]); continue; }
        try {
            const { texto, html } = plantillaCorreo({ nombre: n.nombre.split(' ')[0], titulo: n.titulo, mensaje: n.mensaje, ruta: n.ruta });
            await enviarCorreo({ para: n.correo, asunto: `EduCal · ${n.titulo}`, texto, html });
            await connection.query('UPDATE notificaciones SET correo_enviado = 1 WHERE id = ?', [n.id]);
            enviados++;
        } catch (e) {
            fallidos++;
            await connection.query('UPDATE notificaciones SET intentos = intentos + 1 WHERE id = ?', [n.id]);
            console.error('No se pudo enviar un correo:', e.message);
        }
    }
    return { enviados, fallidos };
}

// Envía los correos pendientes. Si ya hay un envío en marcha, espera a que termine y hace otra pasada (así nada se pierde ni se duplica).
export function enviarCorreosPendientes(limite = 40) {
    if (!correoConfigurado()) return Promise.resolve({ enviados: 0, fallidos: 0 });
    if (enCurso) return enCurso.then(() => enviarCorreosPendientes(limite));
    enCurso = pasadaDeCorreos(limite).finally(() => { enCurso = null; });
    return enCurso;
}

// ---------- Eventos de la app ----------
const NOMBRE_TIPO = { tarea: 'tarea', trabajo: 'trabajo', examen: 'examen', proyecto: 'proyecto' };

async function datosTarea(tareaId) {
    const [[t]] = await connection.query(
        `SELECT t.id, t.titulo, t.tipo, t.fecha_limite, t.hora_limite, t.publicada, a.grupo_id, m.nombre AS materia, p.nombre AS profesor
         FROM tareas t JOIN asignaciones a ON a.id = t.asignacion_id JOIN materias m ON m.id = a.materia_id JOIN usuarios p ON p.id = a.profesor_id WHERE t.id = ?`, [tareaId]);
    return t;
}
const estudiantesDelGrupo = async (grupoId) =>
    (await connection.query(`SELECT mt.estudiante_id AS id FROM matriculas mt JOIN usuarios u ON u.id = mt.estudiante_id AND u.activo = 1 WHERE mt.grupo_id = ?`, [grupoId]))[0].map((x) => x.id);

// Una actividad se publicó (o se publicó un cambio de fecha): avisa a los estudiantes del grupo
export async function tareaPublicada(tareaId, { cambioFecha = false } = {}) {
    const t = await datosTarea(tareaId);
    if (!t?.publicada) return 0;
    const tipo = NOMBRE_TIPO[t.tipo] ?? 'actividad';
    const cuando = `${t.fecha_limite} ${String(t.hora_limite).slice(0, 5)}`;
    const datos = cambioFecha
        ? { tipo: 'cambio_fecha', clave: `tarea:${t.id}:fecha:${cuando}`, titulo: `Cambió la fecha: ${t.titulo}`, mensaje: `${t.materia} · ahora vence ${cuando} (prof. ${t.profesor})`, ruta: `/tarea/${t.id}` }
        : { tipo: 'nueva_tarea', clave: `tarea:${t.id}:publicada`, titulo: `Nuevo ${tipo}: ${t.titulo}`, mensaje: `${t.materia} · vence ${cuando} · asignado por ${t.profesor}`, ruta: `/tarea/${t.id}` };
    const n = await notificarVarios(await estudiantesDelGrupo(t.grupo_id), datos);
    enviarCorreosPendientes().catch(() => {});
    return n;
}

export async function calificacionPublicada(entregaId) {
    const [[e]] = await connection.query(
        `SELECT e.id, e.estudiante_id, e.calificacion, t.id AS tarea_id, t.titulo, m.nombre AS materia FROM entregas e
         JOIN tareas t ON t.id = e.tarea_id JOIN asignaciones a ON a.id = t.asignacion_id JOIN materias m ON m.id = a.materia_id WHERE e.id = ?`, [entregaId]);
    if (!e) return;
    await notificar(e.estudiante_id, {
        tipo: 'calificacion', clave: `entrega:${e.id}:calificada:${e.calificacion}`, titulo: `Nueva calificación: ${e.titulo}`,
        mensaje: `${e.materia} · tu nota es ${Number(e.calificacion).toFixed(1)}`, ruta: `/tarea/${e.tarea_id}`,
    });
    enviarCorreosPendientes().catch(() => {});
}

export async function entregaRecibida(entregaId) {
    const [[e]] = await connection.query(
        `SELECT e.id, e.fecha_entrega, u.nombre AS estudiante, t.id AS tarea_id, t.titulo, a.profesor_id FROM entregas e
         JOIN usuarios u ON u.id = e.estudiante_id JOIN tareas t ON t.id = e.tarea_id JOIN asignaciones a ON a.id = t.asignacion_id WHERE e.id = ?`, [entregaId]);
    if (!e) return;
    await notificar(e.profesor_id, {
        tipo: 'entrega', clave: `entrega:${e.id}:${e.fecha_entrega}`, titulo: `${e.estudiante} entregó: ${e.titulo}`, ruta: `/tarea/${e.tarea_id}/entregas`, correo: false,
    });
}

// ---------- Alertas programadas (se ejecuta cada rato) ----------
export async function generarAlertasProgramadas() {
    let creadas = 0;
    const cuenta = async (usuarioId, datos) => { if (await notificar(usuarioId, datos)) creadas++; };

    // 1) Actividades y exámenes que vencen pronto (48 h; exámenes 72 h) y vencidas hace menos de una semana
    const [pendientes] = await connection.query(
        `SELECT e.estudiante_id, t.id AS tarea_id, t.titulo, t.tipo, t.fecha_limite, t.hora_limite, m.nombre AS materia,
                TIMESTAMPDIFF(HOUR, NOW(), TIMESTAMP(t.fecha_limite, t.hora_limite)) AS horas
         FROM entregas e JOIN tareas t ON t.id = e.tarea_id AND t.publicada = 1
         JOIN asignaciones a ON a.id = t.asignacion_id
         JOIN matriculas mt ON mt.estudiante_id = e.estudiante_id AND mt.grupo_id = a.grupo_id
         JOIN usuarios u ON u.id = e.estudiante_id AND u.activo = 1 JOIN materias m ON m.id = a.materia_id
         WHERE e.estado = 'pendiente' AND TIMESTAMP(t.fecha_limite, t.hora_limite) BETWEEN DATE_SUB(NOW(), INTERVAL 7 DAY) AND DATE_ADD(NOW(), INTERVAL 72 HOUR)`);
    for (const p of pendientes) {
        const cuando = `${p.fecha_limite} ${String(p.hora_limite).slice(0, 5)}`;
        if (p.horas < 0) {
            await cuenta(p.estudiante_id, { tipo: 'vencida', clave: `vencida:${p.tarea_id}`, titulo: `Venció: ${p.titulo}`, mensaje: `${p.materia} · era para ${cuando}. Aún puedes entregarla.`, ruta: `/tarea/${p.tarea_id}` });
        } else if (p.tipo === 'examen' ? p.horas <= 72 : p.horas <= 48) {
            await cuenta(p.estudiante_id, {
                tipo: 'proxima', clave: `pronto:${p.tarea_id}`, titulo: `${p.tipo === 'examen' ? 'Examen próximo' : 'Vence pronto'}: ${p.titulo}`,
                mensaje: `${p.materia} · ${cuando} (en ${p.horas} h)`, ruta: `/tarea/${p.tarea_id}`,
            });
        }
    }

    // 2) Pendientes y exámenes propios para hoy o mañana
    const [propios] = await connection.query(
        `SELECT id, usuario_id, titulo, tipo, fecha_limite, hora FROM pendientes_personales
         WHERE completado = 0 AND fecha_limite BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 1 DAY)`);
    for (const p of propios) {
        await cuenta(p.usuario_id, {
            tipo: 'pendiente', clave: `pend:${p.id}:${p.fecha_limite}`, titulo: `${p.tipo === 'examen' ? 'Examen' : p.tipo === 'evento' ? 'Evento' : 'Tarea'} propio: ${p.titulo}`,
            mensaje: `${p.fecha_limite}${p.hora ? ` ${String(p.hora).slice(0, 5)}` : ''}`, ruta: '/agenda?seccion=pendientes',
        });
    }

    // 3) Recordatorios cuya hora ya llegó
    const [recs] = await connection.query(
        `SELECT r.id, r.usuario_id, r.avisar_en, COALESCE(t.titulo, p.titulo, r.texto) AS titulo FROM recordatorios r
         LEFT JOIN tareas t ON t.id = r.tarea_id LEFT JOIN pendientes_personales p ON p.id = r.pendiente_id
         WHERE r.enviado = 0 AND r.avisar_en <= NOW() AND r.avisar_en > DATE_SUB(NOW(), INTERVAL 2 DAY)`);
    for (const r of recs) await cuenta(r.usuario_id, { tipo: 'recordatorio', clave: `rec:${r.id}`, titulo: `Recordatorio: ${r.titulo}`, mensaje: r.avisar_en, ruta: '/inicio' });

    // 4) Resumen diario para docentes con entregas por calificar
    const [docentes] = await connection.query(
        `SELECT a.profesor_id AS id, COUNT(*) AS n, CURDATE() AS hoy FROM entregas e JOIN tareas t ON t.id = e.tarea_id AND t.publicada = 1
         JOIN asignaciones a ON a.id = t.asignacion_id JOIN matriculas mt ON mt.estudiante_id = e.estudiante_id AND mt.grupo_id = a.grupo_id
         JOIN usuarios u ON u.id = a.profesor_id AND u.activo = 1 WHERE e.estado = 'entregada' GROUP BY a.profesor_id`);
    for (const d of docentes) {
        await cuenta(d.id, { tipo: 'por_calificar', clave: `calificar:${d.hoy}`, titulo: `Tienes ${d.n} entrega${d.n > 1 ? 's' : ''} por calificar`, ruta: '/por-calificar' });
    }
    const correos = await enviarCorreosPendientes();
    return { creadas, ...correos };
}

let temporizadores = [];
export function iniciarNotificaciones() {
    detenerNotificaciones();
    const ciclo = () => generarAlertasProgramadas().catch((e) => console.error('Error generando alertas:', e.message));
    setTimeout(ciclo, 15000);
    temporizadores = [setInterval(ciclo, 15 * 60 * 1000), setInterval(() => enviarCorreosPendientes().catch(() => {}), 60 * 1000)];
    for (const t of temporizadores) t.unref?.();
    console.log(correoConfigurado() ? 'Alertas por correo: activadas.' : 'Alertas por correo: sin configurar (solo campanita). Ver sección CORREO de backend/.env');
}
export function detenerNotificaciones() { temporizadores.forEach(clearInterval); temporizadores = []; }
