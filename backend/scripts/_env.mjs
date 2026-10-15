// Ayudas compartidas por los asistentes de configuración (npm run configurar-google, configurar-correo…).
// Todo se guarda solo en backend/.env (que no se sube a git). Las claves se escriben sin mostrarse en pantalla.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const archivoEnv = fileURLToPath(new URL('../.env', import.meta.url));

export function leer(pregunta, { oculto = false, porDefecto = '' } = {}) {
    return new Promise((resolver) => {
        process.stdout.write(`${pregunta}${porDefecto ? ` [${porDefecto}]` : ''}: `);
        const entrada = process.stdin;
        if (!oculto || !entrada.isTTY) {
            entrada.setEncoding('utf8');
            entrada.once('data', (d) => resolver(String(d).trim() || porDefecto));
            entrada.resume();
            return;
        }
        let texto = '';
        entrada.setRawMode(true);
        entrada.resume();
        entrada.setEncoding('utf8');
        const alTeclear = (c) => {
            for (const ch of c) {
                if (ch === '\r' || ch === '\n') {
                    entrada.setRawMode(false);
                    entrada.pause();
                    entrada.removeListener('data', alTeclear);
                    process.stdout.write('\n');
                    resolver(texto.trim());
                    return;
                }
                if (ch === '\u0003') { process.stdout.write('\n'); process.exit(1); }
                if (ch === '\u007f' || ch === '\b') texto = texto.slice(0, -1);
                else texto += ch;
            }
        };
        entrada.on('data', alTeclear);
    });
}

// Cambia (o agrega) CLAVE=valor conservando el resto del archivo y sus comentarios
export function ponerValor(contenido, clave, valor) {
    const linea = `${clave}=${valor}`;
    const re = new RegExp(`^${clave}\\s*=.*$`, 'm');
    return re.test(contenido) ? contenido.replace(re, () => linea) : `${contenido.replace(/\s*$/, '')}\n${linea}\n`;
}

export const leerEnv = () => (fs.existsSync(archivoEnv) ? fs.readFileSync(archivoEnv, 'utf8') : '');
export const guardarEnv = (contenido) => fs.writeFileSync(archivoEnv, contenido);
