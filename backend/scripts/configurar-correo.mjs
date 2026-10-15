// Asistente para que EduCal envíe las alertas por correo a CUALQUIER dirección (del colegio, Gmail, Yahoo, Hotmail, Outlook…).
//   npm run configurar-correo
// Guarda los datos del servidor de correo en backend/.env (la clave no se muestra al escribirla) y prueba la conexión.
//
// Cómo funciona: EduCal envía desde UNA cuenta de correo (la que configures aquí) hacia el correo que cada estudiante registró.
// El dominio de quien recibe no importa. Lo que sí importa es la cuenta desde la que se envía (ver las opciones).
import { leer, ponerValor, leerEnv, guardarEnv } from './_env.mjs';

const PROVEEDORES = {
    1: {
        nombre: 'Gmail (la forma más fácil para probar)', host: 'smtp.gmail.com', puerto: '587', seguro: 'false',
        ayuda: [
            'Necesitas una "contraseña de aplicación" (no tu clave normal):',
            '  1) Entra a https://myaccount.google.com/security y activa la "Verificación en 2 pasos".',
            '  2) Entra a https://myaccount.google.com/apppasswords , escribe "EduCal" y pulsa Crear.',
            '  3) Copia las 16 letras que te muestra (sin espacios).',
            'Límite aproximado: unos 500 correos por día.',
        ],
    },
    2: {
        nombre: 'Outlook / Hotmail', host: 'smtp-mail.outlook.com', puerto: '587', seguro: 'false',
        ayuda: [
            'Usa tu correo de Outlook/Hotmail y una contraseña de aplicación (cuenta Microsoft → Seguridad → Opciones de seguridad avanzadas).',
            'Aviso: Microsoft ha ido restringiendo el envío SMTP con contraseña en cuentas personales; si falla, usa Gmail o Brevo.',
        ],
    },
    3: {
        nombre: 'Yahoo', host: 'smtp.mail.yahoo.com', puerto: '465', seguro: 'true',
        ayuda: [
            'Necesitas una "contraseña de aplicación": Cuenta de Yahoo → Seguridad → "Generar contraseña de aplicación".',
        ],
    },
    4: {
        nombre: 'Brevo (recomendado para uso real: llega mejor a Gmail, Yahoo y Hotmail)', host: 'smtp-relay.brevo.com', puerto: '587', seguro: 'false',
        ayuda: [
            'Crea una cuenta gratis en https://www.brevo.com (cientos de correos al día sin costo).',
            'Entra a "SMTP y API" → "SMTP": ahí están tu LOGIN SMTP (usuario) y la CLAVE SMTP (la clave que debes pegar aquí).',
            'En "Remitentes y dominios" verifica el correo (o el dominio) desde el que enviarás.',
            'Si usas el dominio de tu colegio, agrega los registros SPF y DKIM que Brevo te indica: así los correos no caen en spam.',
        ],
    },
    5: { nombre: 'Otro servidor SMTP (Resend, SendGrid, el de tu hosting…)', host: '', puerto: '587', seguro: 'false', ayuda: ['Pide a tu proveedor: servidor SMTP, puerto, usuario y clave.'] },
};

try {
    console.log('\n=== Configurar el envío de alertas por correo ===\n');
    console.log('¿Desde qué servicio se enviarán los correos?');
    for (const [n, p] of Object.entries(PROVEEDORES)) console.log(`  ${n}) ${p.nombre}`);
    const opcion = await leer('\nElige un número', { porDefecto: '1' });
    const p = PROVEEDORES[opcion];
    if (!p) throw new Error('Opción no válida. No se cambió nada.');
    console.log(`\n--- ${p.nombre} ---`);
    p.ayuda.forEach((l) => console.log(l));
    console.log('');

    const host = p.host || await leer('Servidor SMTP (SMTP_HOST)');
    if (!host) throw new Error('Falta el servidor SMTP.');
    const puerto = p.host ? p.puerto : await leer('Puerto (SMTP_PORT)', { porDefecto: '587' });
    const seguro = p.host ? p.seguro : (puerto === '465' ? 'true' : 'false');
    const usuario = await leer('Usuario (normalmente tu correo completo)');
    if (!usuario) throw new Error('Falta el usuario. No se cambió nada.');
    let clave = await leer('Clave o contraseña de aplicación (no se verá al escribir)', { oculto: true });
    if (!clave) throw new Error('Falta la clave. No se cambió nada.');
    if (opcion === '1') clave = clave.replace(/\s+/g, ''); // Gmail muestra la clave en bloques con espacios: se quitan
    const remitente = await leer('Correo desde el que se envía (CORREO_REMITENTE)', { porDefecto: usuario.includes('@') ? usuario : '' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remitente.replace(/^.*<(.+)>$/, '$1'))) throw new Error('El remitente no parece un correo válido.');
    const nombre = await leer('Nombre que verán los estudiantes', { porDefecto: 'EduCal' });

    let env = leerEnv();
    env = ponerValor(env, 'CORREO_ACTIVO', 'true');
    env = ponerValor(env, 'SMTP_HOST', host);
    env = ponerValor(env, 'SMTP_PORT', puerto);
    env = ponerValor(env, 'SMTP_SEGURO', seguro);
    env = ponerValor(env, 'SMTP_USUARIO', usuario);
    env = ponerValor(env, 'SMTP_CLAVE', clave);
    env = ponerValor(env, 'CORREO_REMITENTE', remitente.includes('<') ? remitente : `${nombre} <${remitente}>`);
    guardarEnv(env);
    console.log('\n✔ Guardado en backend/.env');

    console.log('Probando la conexión con el servidor de correo…');
    await import('../src/config/env.js');
    const { verificarCorreo, enviarCorreo, plantillaCorreo } = await import('../src/servicios/correo.js');
    await verificarCorreo();
    console.log('✔ El servidor de correo aceptó los datos.');

    const para = await leer('\nEscribe un correo (el tuyo, de cualquier dominio) para enviarle una prueba, o deja vacío para omitir');
    if (para) {
        const { texto, html } = plantillaCorreo({ nombre: 'Prueba', titulo: 'Correo de prueba de EduCal', mensaje: 'Si lo recibes, las alertas por correo funcionan.', ruta: '/alertas' });
        await enviarCorreo({ para, asunto: 'EduCal · correo de prueba', texto, html });
        console.log(`✔ Correo de prueba enviado a ${para}. Revisa también la carpeta de spam.`);
    }
    console.log('\nListo. Reinicia el servidor (Ctrl+C y npm run dev). En la aplicación, abre "Alertas" y pulsa "Enviarme una alerta de prueba".');
} catch (e) {
    console.error(`\n✖ ${e.message}`);
    console.error('Si el error habla de autenticación: revisa el usuario y que uses una contraseña de aplicación (no tu clave normal). Puedes repetir con: npm run configurar-correo');
    process.exitCode = 1;
}
process.exit();
