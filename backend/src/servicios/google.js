// Inicio de sesión y registro con Google: el navegador obtiene un "ID token" firmado por Google y aquí se VERIFICA
// (firma, vigencia y que sea para esta aplicación) antes de confiar en él. La contraseña de Google nunca llega a EduCal.
import { OAuth2Client } from 'google-auth-library';
import { ErrorHttp } from '../utils/validar.js';

let verificador = null;
/** Solo para pruebas: reemplaza la verificación real contra Google. */
export const usarVerificadorGoogle = (fn) => { verificador = fn; };

export const googleConfigurado = () => Boolean(process.env.GOOGLE_CLIENT_ID?.trim());

/** Devuelve los datos de la cuenta de Google ({ email, email_verified, name, given_name, family_name, picture, sub }). */
export async function verificarCredencialGoogle(credencial) {
    if (verificador) return verificador(credencial);
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) throw new ErrorHttp(503, 'El inicio de sesión con Google todavía no está configurado en el servidor.');
    if (!credencial || typeof credencial !== 'string' || credencial.length > 4096) throw new ErrorHttp(400, 'Falta la credencial de Google.');
    try {
        const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credencial, audience: clientId });
        return ticket.getPayload();
    } catch {
        throw new ErrorHttp(401, 'No se pudo verificar tu cuenta de Google. Inténtalo de nuevo.');
    }
}
