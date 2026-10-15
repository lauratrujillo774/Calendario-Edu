// Seleccionar el formulario
const formulario = document.getElementById("formRegistro");
const mensaje = document.getElementById("mensaje");
const campoPassword = document.getElementById("password");
const campoConfirmar = document.getElementById("confirmar");

const MINIMO_CARACTERES = 8;
const expresionCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Muestra un mensaje en el formulario (tipo: "error" u "ok") y marca los campos con problema
function mostrarMensaje(texto, tipo, campos = []) {
    mensaje.textContent = texto;
    mensaje.className = "mensaje " + tipo;
    campoPassword.classList.remove("invalido");
    campoConfirmar.classList.remove("invalido");
    campos.forEach(campo => campo.classList.add("invalido"));
}

function limpiarMensaje() {
    mensaje.textContent = "";
    mensaje.className = "mensaje";
    campoPassword.classList.remove("invalido");
    campoConfirmar.classList.remove("invalido");
}

// Devuelve el texto del problema con las contraseñas, o "" si están bien
function errorContraseñas(contraseña, confirmar) {
    if (contraseña.length < MINIMO_CARACTERES) {
        return `La contraseña debe tener al menos ${MINIMO_CARACTERES} caracteres (tiene ${contraseña.length}).`;
    }
    if (confirmar !== "" && contraseña !== confirmar) {
        return "Las contraseñas no coinciden.";
    }
    return "";
}

// Aviso mientras se escribe
function validarEnVivo() {
    const contraseña = campoPassword.value;
    if (contraseña === "") {
        limpiarMensaje();
        return;
    }
    const texto = errorContraseñas(contraseña, campoConfirmar.value);
    if (texto) {
        const campos = contraseña.length < MINIMO_CARACTERES ? [campoPassword] : [campoConfirmar];
        mostrarMensaje(texto, "error", campos);
    } else {
        limpiarMensaje();
    }
}

campoPassword.addEventListener("input", validarEnVivo);
campoConfirmar.addEventListener("input", validarEnVivo);

formulario.addEventListener("submit", async function (e) {
    e.preventDefault();

    const nombres = document.getElementById("nombres").value.trim();
    const apellidos = document.getElementById("apellidos").value.trim();
    const grado = document.getElementById("grado").value.trim();
    const grupo = document.getElementById("grupo").value.trim();
    const correo = document.getElementById("correo").value.trim();
    const contraseña = campoPassword.value;
    const confirmar = campoConfirmar.value;

    if (nombres === "" || apellidos === "" || correo === "" || contraseña === "" || confirmar === "") {
        mostrarMensaje("Completa todos los campos.", "error");
        return;
    }

    if (!expresionCorreo.test(correo)) {
        mostrarMensaje("Ingresa un correo válido.", "error");
        return;
    }

    if (contraseña.length < MINIMO_CARACTERES) {
        mostrarMensaje(errorContraseñas(contraseña, confirmar), "error", [campoPassword]);
        return;
    }

    if (contraseña !== confirmar) {
        mostrarMensaje("Las contraseñas no coinciden.", "error", [campoConfirmar]);
        return;
    }

    // Guardar en la base de datos (backend)
    try {
        await api("/auth/registro", { nombres, apellidos, correo, password: contraseña, grado_numero: grado, grupo_numero: grupo });
        // La cuenta ya quedó con la sesión iniciada: se entra directo a la aplicación
        mostrarMensaje("¡Cuenta creada! Entrando a tu agenda...", "ok");
        if (!(await sesionActiva())) {
            mostrarMensaje("Tu cuenta se creó, pero el navegador no guardó la sesión. Inicia sesión con tu correo y contraseña.", "error");
            setTimeout(() => { window.location.href = "inicio-sesion.html"; }, 2500);
            return;
        }
        window.location.href = URL_APP;
    } catch (error) {
        mostrarMensaje(error.message, "error");
    }
});

// Ir a la ventana de registro
function irRegistro() {
    window.location.href = "registrarse.html";
}

// Volver al inicio de sesión
function irLogin() {
    window.location.href = "inicio-sesion.html";
}

// Aviso para docentes: sus materias y grupos los asigna un administrador
document.querySelectorAll("input[name=rol]").forEach(function (opcion) {
    opcion.addEventListener("change", function () {
        document.getElementById("notaRol").hidden = document.querySelector("input[name=rol]:checked").value !== "docente";
    });
});
