// Aplica (o revierte) las migraciones de database/migraciones/*.sql en orden.
//   npm run migrar            → aplica las pendientes
//   npm run migrar:revertir   → revierte la última aplicada
//   npm run migrar:estado     → lista el estado de cada una
import '../src/config/env.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connection } from '../src/config/mysql/dbmysql.js';

const carpeta = fileURLToPath(new URL('./migraciones/', import.meta.url));
const orden = process.argv[2] ?? 'aplicar';

function leer(archivo) {
    const texto = fs.readFileSync(carpeta + archivo, 'utf8').replace(/\r\n/g, '\n');
    const [, resto] = texto.split('-- @@UP\n');
    const [up, down] = resto.split('-- @@DOWN\n');
    const separar = (bloque) => (bloque ?? '').split('\n--//\n').map((s) => s.trim()).filter(Boolean);
    return { up: separar(up), down: separar(down) };
}

async function ejecutar(sentencias) {
    for (const sql of sentencias) await connection.query(sql);
}

try {
    await connection.query(`CREATE TABLE IF NOT EXISTS migraciones (
        nombre VARCHAR(150) NOT NULL PRIMARY KEY,
        aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    const archivos = fs.readdirSync(carpeta).filter((f) => f.endsWith('.sql')).sort();
    const [filas] = await connection.query('SELECT nombre FROM migraciones');
    const hechas = new Set(filas.map((f) => f.nombre));

    if (orden === 'estado') {
        for (const a of archivos) console.log(hechas.has(a) ? '[aplicada]  ' : '[pendiente] ', a);
    } else if (orden === 'revertir') {
        const ultima = [...archivos].reverse().find((a) => hechas.has(a));
        if (!ultima) console.log('No hay migraciones para revertir.');
        else {
            await ejecutar(leer(ultima).down);
            await connection.query('DELETE FROM migraciones WHERE nombre = ?', [ultima]);
            console.log('Revertida:', ultima);
        }
    } else {
        let n = 0;
        for (const a of archivos.filter((f) => !hechas.has(f))) {
            await ejecutar(leer(a).up);
            await connection.query('INSERT INTO migraciones (nombre) VALUES (?)', [a]);
            console.log('Aplicada:', a);
            n++;
        }
        if (!n) console.log('No hay migraciones pendientes.');
    }
} catch (error) {
    console.error('Error en la migración:', error.message);
    process.exitCode = 1;
}
process.exit();
