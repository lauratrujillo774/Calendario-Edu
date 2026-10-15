// Crea un usuario o, si el correo ya existe, le cambia el rol/nombre y le asigna una contraseña nueva.
// Sirve para crear el primer administrador y para dar contraseña a los usuarios de ejemplo
// (que traen el marcador REEMPLAZAR_CON_HASH).
//
//   npm run crear-usuario -- <correo> "<Nombre>" <admin|profesor|estudiante> <contraseña>
//   (o la contraseña en la variable de entorno USUARIO_PASSWORD)
import '../src/config/env.js';
import { connection } from '../src/config/mysql/dbmysql.js';
import { hashear } from '../src/servicios/contrasenas.js';
import { correo as validarCorreo, contrasena } from '../src/utils/validar.js';

const [, , correoArg, nombre, rolNombre, passArg] = process.argv;
try {
    if (!correoArg || !nombre || !rolNombre) {
        throw new Error('Uso: npm run crear-usuario -- <correo> "<Nombre>" <admin|profesor|estudiante> <contraseña>');
    }
    const correo = validarCorreo(correoArg);
    const password = contrasena(passArg ?? process.env.USUARIO_PASSWORD);
    const [[rol]] = await connection.query('SELECT id FROM roles WHERE nombre = ?', [rolNombre]);
    if (!rol) throw new Error('El rol debe ser admin, profesor o estudiante.');
    const hash = await hashear(password);
    const [[existe]] = await connection.query('SELECT id FROM usuarios WHERE correo = ?', [correo]);
    if (existe) {
        await connection.query(
            'UPDATE usuarios SET rol_id = ?, nombre = ?, contrasena_hash = ?, activo = 1 WHERE id = ?', [rol.id, nombre, hash, existe.id]);
        console.log(`Usuario actualizado: ${correo} (${rolNombre})`);
    } else {
        await connection.query(
            'INSERT INTO usuarios (rol_id, nombre, correo, contrasena_hash) VALUES (?, ?, ?, ?)', [rol.id, nombre, correo, hash]);
        console.log(`Usuario creado: ${correo} (${rolNombre})`);
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
process.exit();
