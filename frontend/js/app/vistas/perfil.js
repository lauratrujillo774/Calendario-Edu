// Configuración del estudiante: foto de perfil, datos personales, grado y grupo, avisos por correo y contraseña.
import { api } from '../api.js';
import { estado } from '../estado.js';
import { h, icono, vaciar, cargarEn, formulario, aviso, confirmar } from '../ui.js';
import { encabezadoPagina, avatar } from '../comp.js';

export async function perfil(cont, _p, _q, { cerrarSesion, pintarUsuario }) {
    await cargarEn(cont, 'Cargando tu perfil…', async () => {
        const { perfil: p } = await api.get('/auth/perfil');
        const recargar = () => { vaciar(cont); perfil(cont, _p, _q, { cerrarSesion, pintarUsuario }); };
        const refrescarSesion = (foto) => {
            estado.usuario = { ...estado.usuario, nombre: p.nombre, foto, versionFoto: Date.now() };
            pintarUsuario?.();
            window.dispatchEvent(new Event('educal:perfil'));
        };

        // ----- Foto -----
        const entradaFoto = h('input', { type: 'file', accept: 'image/*,.jfif,.jpe,.avif', hidden: true, 'aria-label': 'Elegir foto de perfil', onchange: async () => {
            const archivo = entradaFoto.files[0];
            if (!archivo) return;
            if (archivo.size > 5 * 1024 * 1024) { aviso('La imagen debe pesar máximo 5 MB.', 'error'); entradaFoto.value = ''; return; }
            const form = new FormData(); form.append('foto', archivo);
            try { await api.subir('/auth/perfil/foto', form); aviso('Foto actualizada.'); refrescarSesion(true); recargar(); } catch (e) { aviso(e.message, 'error'); }
        } });
        const bloqueFoto = h('div', { class: 'foto-perfil' },
            avatar({ ...p, foto: p.tiene_foto, versionFoto: estado.usuario.versionFoto }, 96),
            h('div', null, h('strong', null, p.nombre), h('small', null, `Estudiante · ${p.correo}`),
                h('div', { class: 'acciones inicio' }, entradaFoto,
                    h('button', { class: 'btn btn-chico', type: 'button', onclick: () => entradaFoto.click() }, icono('camara', 14), p.tiene_foto ? 'Cambiar foto' : 'Subir foto'),
                    p.tiene_foto ? h('button', { class: 'btn btn-texto-peligro btn-chico', type: 'button', onclick: async () => {
                        if (!(await confirmar({ mensaje: '¿Quitar tu foto de perfil?', textoOk: 'Quitar', peligro: true }))) return;
                        try { await api.del('/auth/perfil/foto'); aviso('Foto quitada.'); refrescarSesion(false); recargar(); } catch (e) { aviso(e.message, 'error'); }
                    } }, 'Quitar') : null),
                h('small', { class: 'ayuda' }, 'Cualquier imagen (PNG, JPG, JFIF, GIF, WebP, BMP, AVIF, ICO o SVG), máximo 5 MB.')));

        // ----- Datos personales, grado y grupo (se escriben como número) -----
        const datos = formulario({
            enviar: 'Guardar cambios', cancelar: false,
            campos: [
                { nombre: 'nombres', etiqueta: 'Nombres', requerido: true, max: 60, valor: p.nombres ?? p.nombre, ancho: 'mitad' },
                { nombre: 'apellidos', etiqueta: 'Apellidos', requerido: true, max: 60, valor: p.apellidos ?? '', ancho: 'mitad' },
                { nombre: 'correo', etiqueta: 'Correo', valor: p.correo },
                { nombre: 'identificacion', etiqueta: 'Número de identificación', max: 20, valor: p.identificacion ?? '', ancho: 'mitad' },
                { nombre: 'fecha_nacimiento', etiqueta: `Fecha de nacimiento${p.edad != null ? ` (${p.edad} años)` : ''}`, tipo: 'date', valor: p.fecha_nacimiento ?? '', ancho: 'mitad' },
                { nombre: 'grado_numero', etiqueta: 'Grado que cursas (0 = Transición, 1 a 11)', tipo: 'number', min: 0, maxValor: 11, valor: p.grado_numero ?? '', ancho: 'mitad', placeholder: 'Ej.: 11',
                    ayuda: 'Al guardarlo aparecen las materias de tu grado.' },
                { nombre: 'grupo_numero', etiqueta: 'Grupo (1, 2, 3…)', tipo: 'number', min: 1, maxValor: 30, valor: p.grupo_numero ?? '', ancho: 'mitad', placeholder: 'Ej.: 1',
                    ayuda: 'Si tu grupo no existe todavía, se crea solo (por ejemplo 11-1).' },
                { nombre: 'notif_correo', etiqueta: 'Enviarme también las alertas por correo (además de la campanita)', tipo: 'checkbox', valor: p.notif_correo },
            ],
            alEnviar: async (v) => {
                const cuerpo = { nombres: v.nombres, apellidos: v.apellidos, identificacion: v.identificacion, fecha_nacimiento: v.fecha_nacimiento || null, notif_correo: v.notif_correo };
                if (v.grado_numero !== '') { cuerpo.grado_numero = v.grado_numero; cuerpo.grupo_numero = v.grupo_numero; }
                await api.put('/auth/perfil', cuerpo);
                aviso('Perfil actualizado.');
                refrescarSesion(p.tiene_foto);
                window.dispatchEvent(new Event('educal:materias'));
                recargar();
            },
        });
        datos.campo('correo').disabled = true;

        // ----- Contraseña (quien entró con Google puede crear una sin escribir la actual) -----
        const campos = [
            ...(p.solo_google ? [] : [{ nombre: 'actual', etiqueta: 'Contraseña actual', tipo: 'password', requerido: true, autocompletar: 'current-password' }]),
            { nombre: 'nueva', etiqueta: 'Nueva contraseña (mínimo 8 caracteres)', tipo: 'password', requerido: true, autocompletar: 'new-password' },
            { nombre: 'confirmar', etiqueta: 'Repite la nueva contraseña', tipo: 'password', requerido: true, autocompletar: 'new-password' },
        ];
        const clave = formulario({
            enviar: p.solo_google ? 'Crear contraseña' : 'Cambiar contraseña', cancelar: false, campos,
            alEnviar: async (v) => {
                if (v.nueva.length < 8) throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
                if (v.nueva !== v.confirmar) throw new Error('Las contraseñas no coinciden.');
                await api.put('/auth/password', { actual: v.actual, nueva: v.nueva });
                clave.el.reset();
                aviso(p.solo_google ? 'Contraseña creada: ya puedes entrar también con tu correo.' : 'Contraseña actualizada. Se cerraron tus otras sesiones.');
                if (p.solo_google) recargar();
            },
        });

        // ----- Materias del grado -----
        return h('div', null,
            encabezadoPagina('Configuración', `Estudiante · ${p.correo}`),
            h('section', { class: 'tarjeta' }, bloqueFoto),
            h('div', { class: 'rejilla dos' },
                h('section', { class: 'tarjeta' }, h('h3', null, icono('usuario', 18), 'Mis datos'), datos.el),
                h('div', { class: 'col-apilada' },
                    h('section', { class: 'tarjeta' }, h('h3', null, icono('candado', 18), 'Seguridad'),
                        p.solo_google ? h('p', { class: 'ayuda' }, 'Entraste con Google. Si quieres, crea también una contraseña para entrar con tu correo.') : null, clave.el))),
            h('div', { class: 'acciones inicio' }, h('button', { class: 'btn btn-salir', type: 'button', onclick: cerrarSesion }, icono('salir', 16), 'Cerrar sesión')));
    });
}
