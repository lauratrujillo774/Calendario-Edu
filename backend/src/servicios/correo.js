// Envío de correos (alertas de tareas, exámenes y calificaciones). La configuración sale de backend/.env (sección CORREO).
// Si no hay servidor SMTP configurado, la app funciona igual: las alertas llegan solo a la campanita.
import nodemailer from 'nodemailer';

let transporteManual = null;
let cache = { firma: '', transporte: null };

// Permite a las pruebas usar un transporte falso sin enviar nada de verdad
export function usarTransporte(t) { transporteManual = t; }

export function configuracionCorreo() {
    const e = process.env;
    const puerto = Number(e.SMTP_PORT) || 587;
    return {
        activo: String(e.CORREO_ACTIVO ?? 'true').toLowerCase() !== 'false',
        host: (e.SMTP_HOST ?? '').trim(),
        puerto,
        seguro: String(e.SMTP_SEGURO ?? (puerto === 465 ? 'true' : 'false')).toLowerCase() === 'true',
        usuario: (e.SMTP_USUARIO ?? '').trim(),
        clave: e.SMTP_CLAVE ?? '',
        remitente: (e.CORREO_REMITENTE ?? '').trim() || (e.SMTP_USUARIO ?? '').trim(),
        urlApp: (e.URL_APP ?? 'http://localhost:3000').trim().replace(/\/+$/, ''),
    };
}

export function correoConfigurado() {
    if (transporteManual) return true;
    const c = configuracionCorreo();
    return c.activo && Boolean(c.host) && Boolean(c.remitente);
}

function obtenerTransporte() {
    if (transporteManual) return transporteManual;
    const c = configuracionCorreo();
    const firma = JSON.stringify([c.host, c.puerto, c.seguro, c.usuario, c.clave]);
    if (cache.firma !== firma) {
        cache = {
            firma,
            transporte: nodemailer.createTransport({
                host: c.host, port: c.puerto, secure: c.seguro,
                auth: c.usuario ? { user: c.usuario, pass: c.clave } : undefined,
                connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
            }),
        };
    }
    return cache.transporte;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function plantillaCorreo({ nombre, titulo, mensaje, ruta }) {
    const { urlApp } = configuracionCorreo();
    const enlace = `${urlApp}/pages/app.html${ruta ? `#${ruta}` : ''}`;
    const texto = `Hola ${nombre},\n\n${titulo}\n${mensaje ?? ''}\n\nAbre EduCal: ${enlace}\n\nPuedes desactivar estos correos en Configuración → Notificaciones.`;
    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #dbeafe;border-radius:14px;overflow:hidden">
<div style="background:linear-gradient(120deg,#1e3a8a,#2563eb);color:#fff;padding:16px 20px;font-size:20px;font-weight:700">EduCal</div>
<div style="padding:20px;color:#1e2b4d"><p>Hola ${esc(nombre)},</p><h2 style="margin:0 0 8px;font-size:18px;color:#1e3a8a">${esc(titulo)}</h2>
<p style="margin:0 0 16px;color:#5a6a8c">${esc(mensaje ?? '')}</p>
<a href="${esc(enlace)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Abrir EduCal</a>
<p style="margin:20px 0 0;font-size:12px;color:#8090b0">Puedes desactivar estos correos en Configuración → Notificaciones.</p></div></div>`;
    return { texto, html };
}

export async function enviarCorreo({ para, asunto, texto, html }) {
    if (!correoConfigurado()) throw new Error('El correo no está configurado (revisa la sección CORREO de backend/.env).');
    const c = configuracionCorreo();
    return obtenerTransporte().sendMail({ from: c.remitente, to: para, subject: asunto, text: texto, html });
}

// Comprueba la conexión con el servidor SMTP (para el script npm run probar-correo)
export async function verificarCorreo() {
    if (!correoConfigurado()) throw new Error('Falta SMTP_HOST o el remitente en backend/.env.');
    const t = obtenerTransporte();
    if (typeof t.verify === 'function') await t.verify();
    return true;
}
