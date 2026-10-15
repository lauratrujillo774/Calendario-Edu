// Asistente para activar "Iniciar sesión / Registrarse con Google".
//   npm run configurar-google
// Te explica cómo sacar el ID de cliente en Google Cloud, lo valida y lo guarda en backend/.env (GOOGLE_CLIENT_ID).
import { leer, ponerValor, leerEnv, guardarEnv } from './_env.mjs';

const FORMATO = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i;

try {
    console.log('\n=== Activar el acceso con Google ===\n');
    console.log('Si todavía no tienes el ID de cliente, sácalo así (una sola vez, es gratis):');
    console.log('  1) Entra a https://console.cloud.google.com e inicia sesión con tu cuenta de Google.');
    console.log('  2) Arriba, crea un proyecto nuevo (por ejemplo "EduCal").');
    console.log('  3) Menú ☰ → "APIs y servicios" → "Pantalla de consentimiento de OAuth":');
    console.log('       tipo "Externo", nombre de la app "EduCal", tu correo de contacto → Guardar.');
    console.log('       (Mientras esté en "Prueba", agrega en "Usuarios de prueba" los correos que podrán entrar.)');
    console.log('  4) "Credenciales" → "Crear credenciales" → "ID de cliente de OAuth" → tipo "Aplicación web".');
    console.log('  5) En "Orígenes de JavaScript autorizados" agrega:  http://localhost:3000');
    console.log('       (y cuando publiques la página, también  https://tudominio.com )');
    console.log('  6) Crear → copia el "ID de cliente" (termina en .apps.googleusercontent.com).\n');

    const id = await leer('Pega aquí el ID de cliente (o deja vacío para cancelar)');
    if (!id) { console.log('No se cambió nada.'); process.exit(0); }
    if (!FORMATO.test(id)) {
        throw new Error('Ese texto no parece un ID de cliente de Google. Debe verse así: 1234567890-abc123def456.apps.googleusercontent.com (no uses el "secreto de cliente").');
    }
    guardarEnv(ponerValor(leerEnv(), 'GOOGLE_CLIENT_ID', id));
    console.log('\n✔ Guardado en backend/.env (GOOGLE_CLIENT_ID).');
    console.log('Ahora reinicia el servidor (Ctrl+C y npm run dev) y abre http://localhost:3000/pages/inicio-sesion.html : verás el botón de Google funcionando.');
    console.log('Si Google dice "origin_mismatch", revisa que http://localhost:3000 esté en los orígenes autorizados (paso 5).');
} catch (e) {
    console.error(`\n✖ ${e.message}`);
    process.exitCode = 1;
}
process.exit();
