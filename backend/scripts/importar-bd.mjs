// Carga backend/database/nube/esquema.sql en la base de datos a la que apunte tu .env (por ejemplo la de Aiven).   npm run importar-bd
// ¡Ojo!: BORRA y vuelve a crear las tablas de EduCal en esa base. Si ya tiene datos de verdad, el script se detiene (usa --forzar para continuar).
import '../src/config/env.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connection as db } from '../src/config/mysql/dbmysql.js';

const forzar = process.argv.includes('--forzar');
const archivo = fileURLToPath(new URL('../database/nube/esquema.sql', import.meta.url));
const sentencias = fs.readFileSync(archivo, 'utf8').replace(/\r\n/g, '\n').split('\n-- @@\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('--'));

console.log(`Destino: ${process.env.MYSQL_USER}@${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT}/${process.env.MYSQL_DATABASE} (SSL: ${process.env.MYSQL_SSL === 'true' ? 'sí' : 'no'})`);
try {
    await db.query('SELECT 1');
    const [[hay]] = await db.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'usuarios'").catch(() => [[{ n: 0 }]]);
    if (hay.n) {
        const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM usuarios');
        if (n > 0 && !forzar) { console.error(`✖ La base de destino ya tiene ${n} usuario(s). No se toca nada. Si de verdad quieres borrarla, ejecuta: npm run importar-bd -- --forzar`); process.exit(1); }
    }
    const c = await db.getConnection();
    await c.query('SET FOREIGN_KEY_CHECKS = 0');
    let i = 0;
    for (const sql of sentencias) {
        i++;
        try { await c.query(sql); } catch (e) {
            console.error(`✖ Falló la sentencia ${i} de ${sentencias.length}: ${e.message}\n   ${sql.slice(0, 200).replace(/\s+/g, ' ')}`);
            process.exit(1);
        }
    }
    await c.query('SET FOREIGN_KEY_CHECKS = 1');
    c.release();
    const [t] = await db.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'");
    console.log(`✔ Importado: ${sentencias.length} sentencias, ${t[0].n} tablas en la base.`);
} catch (e) {
    console.error(`✖ No se pudo importar: ${e.message}`);
    process.exitCode = 1;
}
await db.end();
