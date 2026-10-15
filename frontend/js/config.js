// Dirección del backend. Si la página se sirve desde el mismo servidor (puerto 3000) queda vacía.
// Si abres las páginas con otro servidor (p. ej. Live Server), se usa http://localhost:3000.
// Las páginas deben abrirse desde el servidor (http://localhost:3000). Si se abren desde otro puerto (por ejemplo Live Server, 5500),
// el navegador NO guarda la sesión que crea el servidor (son sitios distintos) y habría que iniciar sesión dos veces:
// en ese caso se pasa automáticamente a la misma página en el servidor.
if (window.location.port !== "3000" && ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.pathname.includes("/pages/")) {
    window.location.replace("http://localhost:3000/pages/" + window.location.pathname.split("/pages/").pop() + window.location.search + window.location.hash);
}
const API_URL = window.location.port === "3000" ? "" : "http://localhost:3000";

// Llama a la API (JSON). Envía la cookie de sesión y lanza un Error con el mensaje del servidor si algo falla.
async function api(ruta, datos) {
    let respuesta;
    try {
        respuesta = await fetch(API_URL + "/api" + ruta, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(datos)
        });
    } catch {
        throw new Error("No se pudo conectar con el servidor. Verifica que esté encendido (npm run dev en la carpeta backend).");
    }
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(cuerpo.message || "Error del servidor");
    return cuerpo;
}

// ¿El navegador guardó la sesión? (se usa justo después de crear la cuenta o de iniciar sesión)
async function sesionActiva() {
    try {
        const r = await fetch(API_URL + "/api/auth/yo", { credentials: "include" });
        return r.ok;
    } catch { return false; }
}

// La aplicación (agenda) se sirve desde el backend en /pages/app.html
const URL_APP = API_URL + "/pages/app.html";

// Configuración pública del servidor (por ejemplo, el ID de cliente de Google). Devuelve {} si no se puede leer.
async function configuracionPublica() {
    try {
        const r = await fetch(API_URL + "/api/auth/config", { credentials: "include" });
        return r.ok ? await r.json() : {};
    } catch { return {}; }
}
