import './src/config/env.js';
import { dbConnectMysql } from './src/config/mysql/dbmysql.js';
import { iniciarNotificaciones } from './src/servicios/notificaciones.js';
import { configuracionCorreo, correoConfigurado } from './src/servicios/correo.js';
import { googleConfigurado } from './src/servicios/google.js';

async function main() {
    try {
        // Conexión a la base de datos (el esquema se actualiza con: npm run migrar)
        await dbConnectMysql();

        // Se carga después de conectar: las rutas consultan la base de datos
        const { default: Server } = await import('./src/server/express.server.js');
        await new Server().start();
        // Alertas (campanita y correo): vencimientos, exámenes, recordatorios y calificaciones
        iniciarNotificaciones();
        // Resumen de lo que está activo (para saber de un vistazo qué falta configurar en backend/.env)
        const c = configuracionCorreo();
        console.log(correoConfigurado()
            ? `✔ Correo: listo para enviar alertas a cualquier dirección (desde ${c.remitente} por ${c.host})`
            : '✖ Correo: SIN configurar → las alertas solo llegan a la campanita. Para activarlo: npm run configurar-correo');
        console.log(googleConfigurado()
            ? '✔ Google: acceso con Google activado'
            : '✖ Google: SIN configurar → el botón de Google solo muestra un aviso. Para activarlo: npm run configurar-google');
    } catch (error) {
        console.error('Error al iniciar la aplicación:', error.message);
        process.exit(1);
    }
}

main();
