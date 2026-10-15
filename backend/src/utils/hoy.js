import { connection } from '../config/mysql/dbmysql.js';

// "Hoy" según la base de datos (zona horaria de Colombia), para no depender del reloj/zona del servidor web
export async function hoyEnColombia() {
    const [[fila]] = await connection.query('SELECT CURDATE() AS hoy');
    return fila.hoy;
}

export const sumarDiasISO = (iso, n) => {
    const d = new Date(`${iso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};
