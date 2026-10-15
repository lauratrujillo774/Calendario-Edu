// Agrega un "ojito" a cada campo de contraseña para mostrarla u ocultarla
const ICONO_OJO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICONO_OJO_TACHADO = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

document.querySelectorAll('.input-box input[type="password"]').forEach(function (campo) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "ojo-password";
    boton.setAttribute("aria-label", "Mostrar contraseña");
    boton.innerHTML = ICONO_OJO;

    boton.addEventListener("click", function () {
        const visible = campo.type === "text";
        campo.type = visible ? "password" : "text";
        boton.innerHTML = visible ? ICONO_OJO : ICONO_OJO_TACHADO;
        boton.setAttribute("aria-label", visible ? "Mostrar contraseña" : "Ocultar contraseña");
    });

    campo.parentElement.classList.add("con-ojo");
    campo.parentElement.appendChild(boton);
});
