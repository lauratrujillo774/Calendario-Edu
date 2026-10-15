const formularioLogin = document.getElementById("formLogin");
const mensajeLogin = document.getElementById("mensaje");

function mostrar(texto, tipo) {
    mensajeLogin.textContent = texto;
    mensajeLogin.className = "mensaje " + tipo;
}

// Si el servidor cerró la sesión por inactividad, la aplicación nos trae aquí con ?expirada=1
if (new URLSearchParams(location.search).get("expirada") === "1") {
    mostrar("Tu sesión expiró. Inicia sesión de nuevo.", "error");
}

formularioLogin.addEventListener("submit", async function (e) {
    e.preventDefault();

    const correo = document.getElementById("correo").value.trim();
    const password = document.getElementById("password").value;
    const boton = formularioLogin.querySelector("button[type=submit]");

    boton.disabled = true;
    try {
        await api("/auth/login", { correo, password });
        window.location.href = URL_APP;
    } catch (error) {
        mostrar(error.message, "error");
        boton.disabled = false;
    }
});
