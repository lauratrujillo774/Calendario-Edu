// Genera backend/database/nube/esquema.sql: la estructura ACTUAL de la base de datos (tablas, vistas y triggers) más los datos de referencia
// (roles, grados, materias y plan de estudios), en un formato que acepta MySQL 8 (Aiven, etc.), sin datos de personas.
// Se ejecuta contra tu base local:   npm run exportar-esquema
// Luego se carga en la nube con:     npm run importar-bd   (con el .env apuntando a la base de la nube)
import '../src/config/env.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connection as db } from '../src/config/mysql/dbmysql.js';

const SEP = '\n-- @@\n';
const sinDefiner = (sql) => sql.replace(/\sDEFINER\s*=\s*`[^`]*`@`[^`]*`/gi, '').replace(/SQL SECURITY DEFINER/gi, 'SQL SECURITY INVOKER');
const sentencias = [];

const [filas] = await db.query("SELECT table_name AS n, table_type AS t FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name");
const tablas = filas.filter((f) => f.t === 'BASE TABLE').map((f) => f.n);
const vistas = filas.filter((f) => f.t === 'VIEW').map((f) => f.n);

for (const t of tablas) {
    const [[r]] = await db.query(`SHOW CREATE TABLE \`${t}\``);
    // MySQL no admite un CHECK sobre columnas que también están en una llave foránea con acción (ON DELETE...): esa regla
    // (recordatorio con tarea o pendiente o texto) la valida la API, así que en la nube se omite.
    const ddl = r['Create Table'].replace(/ AUTO_INCREMENT=\d+/, '').replace(/,\n\s*CONSTRAINT `ck_record_origen` CHECK [^\n]*/, '');
    sentencias.push(`DROP TABLE IF EXISTS \`${t}\``, ddl);
}

// Datos de referencia (no personales): lo mínimo para que la app funcione y para que cada estudiante elija su grado
const referencia = {
    roles: '1=1', grados: '1=1', migraciones: '1=1',
    materias: "nombre NOT LIKE 'zz\\_%'",
    grado_materias: 'materia_id IN (SELECT id FROM materias WHERE nombre NOT LIKE \'zz\\_%\')',
};
for (const [t, donde] of Object.entries(referencia)) {
    if (!tablas.includes(t)) continue;
    const [datos] = await db.query(`SELECT * FROM \`${t}\` WHERE ${donde}`);
    for (const fila of datos) {
        const cols = Object.keys(fila);
        sentencias.push(db.format(`INSERT INTO \`${t}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map((c) => fila[c])));
    }
}

const [triggers] = await db.query('SHOW TRIGGERS');
for (const tr of triggers) {
    const [[r]] = await db.query(`SHOW CREATE TRIGGER \`${tr.Trigger}\``);
    sentencias.push(`DROP TRIGGER IF EXISTS \`${tr.Trigger}\``, sinDefiner(r['SQL Original Statement']));
}
// Las vistas se crean en orden: primero las que no dependen de otras vistas
const defs = new Map();
for (const v of vistas) {
    const [[r]] = await db.query(`SHOW CREATE VIEW \`${v}\``);
    defs.set(v, sinDefiner(r['Create View']));
}
const hechas = new Set();
while (hechas.size < vistas.length) {
    const listas = vistas.filter((v) => !hechas.has(v) && vistas.every((o) => o === v || hechas.has(o) || !defs.get(v).includes(`\`${o}\``)));
    if (!listas.length) throw new Error('Las vistas dependen unas de otras en círculo.');
    for (const v of listas) { hechas.add(v); sentencias.push(`DROP VIEW IF EXISTS \`${v}\``, defs.get(v)); }
}

const salida = fileURLToPath(new URL('../database/nube/esquema.sql', import.meta.url));
fs.mkdirSync(fileURLToPath(new URL('../database/nube/', import.meta.url)), { recursive: true });
fs.writeFileSync(salida, `-- EduCal: esquema + datos de referencia para MySQL 8 (generado con npm run exportar-esquema). No contiene datos de personas.${SEP}${sentencias.join(SEP)}\n`);
console.log(`Listo: ${tablas.length} tablas, ${vistas.length} vistas, ${triggers.length} triggers → database/nube/esquema.sql`);
await db.end();
