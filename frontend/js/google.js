// Botón "Continuar con Google" para las páginas de inicio de sesión y de registro.
// Usa Google Identity Services: Google entrega un "ID token" y el SERVIDOR lo verifica (POST /api/auth/google).
// El ID de cliente viene de la configuración del servidor (GOOGLE_CLIENT_ID en backend/.env).
// Si todavía no está configurado, el botón SE MUESTRA igual y, al pulsarlo, explica qué falta.
const LOGO_GOOGLE = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

function mostrarMensajeGoogle(texto) {
    const mensaje = document.getElementById("mensaje");
    if (mensaje) { mensaje.textContent = texto; mensaje.className = "mensaje error"; }
}

// Botón de reserva (mismo aspecto): se usa cuando Google todavía no está configurado o no se pudo cargar
function botonDeReserva(contenedor, textoBoton, explicacion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "boton-google-reserva";
    boton.innerHTML = LOGO_GOOGLE + "<span>" + (textoBoton === "signup_with" ? "Registrarse con Google" : "Iniciar sesión con Google") + "</span>";
    boton.addEventListener("click", function () { mostrarMensajeGoogle(explicacion); });
    contenedor.replaceChildren(boton);
}

async function iniciarGoogle(idContenedor, textoBoton, idSeparador) {
    const contenedor = document.getElementById(idContenedor);
    if (!contenedor) return;
    contenedor.hidden = false;
    const separador = document.getElementById(idSeparador);
    if (separador) separador.hidden = false;

    const configuracion = await configuracionPublica();
    if (!configuracion.google_client_id) {
        botonDeReserva(contenedor, textoBoton, "El acceso con Google todavía no está activado en este servidor. Quien administra EduCal debe agregar el ID de cliente de Google (GOOGLE_CLIENT_ID) en backend/.env y reiniciar el servidor. Mientras tanto usa tu correo y contraseña.");
        return;
    }

    await new Promise((resolver, rechazar) => {
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.onload = resolver;
        s.onerror = rechazar;
        document.head.append(s);
    }).catch(() => null);
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        botonDeReserva(contenedor, textoBoton, "No se pudo cargar Google. Revisa tu conexión a internet e inténtalo de nuevo.");
        return;
    }

    window.google.accounts.id.initialize({
        client_id: configuracion.google_client_id,
        callback: async function (respuesta) {
            const mensaje = document.getElementById("mensaje");
            try {
                await api("/auth/google", { credential: respuesta.credential });
                if (mensaje) { mensaje.textContent = "¡Listo! Abriendo tu agenda..."; mensaje.className = "mensaje ok"; }
                window.location.href = URL_APP;
            } catch (error) {
                mostrarMensajeGoogle(error.message);
            }
        },
    });
    contenedor.replaceChildren();
    window.google.accounts.id.renderButton(contenedor, { theme: "outline", size: "large", text: textoBoton, shape: "pill", locale: "es", width: 300 });
}
