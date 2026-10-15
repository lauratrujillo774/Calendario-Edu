// Prueba el envío de correos con la configuración de backend/.env (sección CORREO):
//   npm run probar-correo                       → solo verifica la conexión con el servidor SMTP
//   npm run probar-correo -- alguien@correo.com → además envía un correo de prueba a esa dirección
import '../src/config/env.js';
import { configuracionCorreo, correoConfigurado, verificarCorreo, enviarCorreo, plantillaCorreo } from '../src/servicios/correo.js';

const c = configuracionCorreo();
console.log(`Servidor SMTP: ${c.host || '(sin configurar)'}:${c.puerto} · remitente: ${c.remitente || '(sin configurar)'} · activo: ${c.activo}`);
try {
    if (!correoConfigurado()) throw new Error('Faltan datos en backend/.env: SMTP_HOST, SMTP_USUARIO, SMTP_CLAVE y CORREO_REMITENTE.');
    await verificarCorreo();
    console.log('✔ Conexión con el servidor de correo correcta.');
    const para = process.argv[2];
    if (para) {
        const { texto, html } = plantillaCorreo({ nombre: 'Prueba', titulo: 'Correo de prueba de EduCal', mensaje: 'Si lo recibes, las alertas por correo funcionan.', ruta: '/inicio' });
        await enviarCorreo({ para, asunto: 'EduCal · correo de prueba', texto, html });
        console.log(`✔ Correo de prueba enviado a ${para}. Revisa también la carpeta de spam.`);
    }
} catch (e) {
    console.error(`✖ ${e.message}`);
    process.exitCode = 1;
}
process.exit();
