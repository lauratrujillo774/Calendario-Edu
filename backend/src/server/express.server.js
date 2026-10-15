import express from 'express';
import cors from 'cors';
import router from '../routes/index.js';
import { fileURLToPath } from 'node:url';
import { cargarSesion, verificarCsrf } from '../middleware/sesion.js';
import { cabecerasSeguras } from '../middleware/seguridad.js';
import { ErrorHttp } from '../utils/validar.js';
import { ARCHIVOS_APP } from '../../../frontend/js/app/paginas.js';

// Carpeta del proyecto (donde está frontend/)
const raizProyecto = fileURLToPath(new URL('../../../', import.meta.url));

// Rutas que se pueden usar sin token CSRF (todavía no hay sesión de la que sacarlo)
const SIN_CSRF = new Set(['/auth/login', '/auth/registro', '/auth/google']);

class Server {
    constructor() {
        this.app = express();
        // En internet (Render, etc.) hay un proxy delante: así req.ip y el protocolo reales llegan bien
        this.app.set('trust proxy', 1);
        this.port = process.env.PORT || 3000;
        this.middleware();
        this.routes();
        this.handleErrors();
    }

    middleware() {
        this.app.disable('x-powered-by');
        // La aplicación y la API se sirven desde el mismo origen. CORS solo se abre para los orígenes de CORS_ORIGENES
        // y, mientras desarrollas (fuera de producción), para localhost (p. ej. Live Server en el puerto 5500).
        const origenes = (process.env.CORS_ORIGENES ?? '').split(',').map((o) => o.trim()).filter(Boolean);
        const esLocal = (o) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
        this.app.use('/api', cors({
            origin: (origen, devolver) => devolver(null, !origen || origenes.includes(origen) || (process.env.NODE_ENV !== 'production' && esLocal(origen))),
            credentials: true,
        }));

        this.app.use(express.json({ limit: '200kb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '200kb' }));

        // Cabeceras de seguridad (CSP estricta) para la API y la aplicación nueva
        this.app.use('/api', cabecerasSeguras);
        // Las páginas que contienen la aplicación (una por pantalla) llevan la misma CSP estricta
        this.app.use('/pages', (req, res, next) => (ARCHIVOS_APP.has(req.path.slice(1)) ? cabecerasSeguras(req, res, next) : next()));
        // Las respuestas de la API nunca se guardan en el navegador: siempre se ven los datos actuales
        this.app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
        // La aplicación vivía en /app/: se conserva esa dirección redirigiendo a la nueva (pages/app.html)
        this.app.get(['/app', '/app/', '/app/index.html'], (req, res) => res.redirect(301, '/pages/app.html'));

        // Sesión y protección CSRF para toda la API
        this.app.use('/api', cargarSesion);
        this.app.use('/api', (req, res, next) => (SIN_CSRF.has(req.path) ? next() : verificarCsrf(req, res, next)));

        // La página web (así funciona en internet con una sola dirección).
        // Solo se publica la carpeta frontend/: nunca backend/ (ahí están el .env y los archivos subidos)
        // Los archivos de la interfaz (html/js/css) se revalidan siempre, para que tras una actualización el navegador no use una copia vieja
        this.app.use(express.static(raizProyecto + 'frontend', {
            setHeaders: (res, ruta) => { if (/\.(html|js|mjs|css)$/i.test(ruta)) res.setHeader('Cache-Control', 'no-store'); },
        }));
    }

    routes() {
        // Carga automática de las rutas que estén en src/routes/<carpeta>/<archivo>.js  →  /<carpeta>/<archivo>
        this.app.use('/', router);
        this.app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta no encontrada.' }));
    }

    start() {
        return new Promise((resolve) => {
            this.servidor = this.app.listen(this.port, () => {
                console.log(`Conectado al puerto ${this.port}`);
                resolve();
            });
        });
    }

    handleErrors() {
        this.app.use((err, req, res, next) => {
            if (res.headersSent) return next(err);
            if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
                return res.status(400).json({ message: 'JSON inválido en la petición' });
            }
            if (err instanceof ErrorHttp) return res.status(err.estado).json({ message: err.message });
            // Errores de la base de datos con significado para el usuario
            if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ese registro ya existe.' });
            if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(409).json({ message: 'La operación afecta a otros registros relacionados.' });
            }
            if (err.errno === 1644) return res.status(400).json({ message: err.sqlMessage });
            if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 4025) {
                return res.status(400).json({ message: 'Alguno de los valores no es válido.' });
            }
            console.error(err);
            res.status(500).json({ message: 'Error del servidor. Inténtalo de nuevo.' });
        });
    }
}

export default Server;
