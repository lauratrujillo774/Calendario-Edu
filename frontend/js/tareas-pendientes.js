const modal = document.getElementById("modal");
const abrir = document.getElementById("abrirModal");
const cerrar = document.querySelector(".cerrar");
const guardar = document.getElementById("guardar");
const lista = document.getElementById("listaTareas");

// Cargar tareas al iniciar
window.onload = cargarTareas;

// Abrir ventana
abrir.onclick = () => {
    modal.style.display = "flex";
};

// Cerrar ventana
cerrar.onclick = () => {
    modal.style.display = "none";
};

// Guardar trabajo
guardar.onclick = () => {

    const nombre = document.getElementById("nombre").value;
    const fecha = document.getElementById("fecha").value;
    const hora = document.getElementById("hora").value;
    const descripcion = document.getElementById("descripcion").value;

    if (nombre === "" || fecha === "" || hora === "") {
        alert("Completa todos los campos.");
        return;
    }

    const trabajo = {
        nombre,
        fecha,
        hora,
        descripcion
    };

    // Obtener tareas existentes
    let tareas = JSON.parse(localStorage.getItem("tareas")) || [];

    // Agregar nueva tarea
    tareas.push(trabajo);

    // Guardar en localStorage
    localStorage.setItem("tareas", JSON.stringify(tareas));

    // Mostrar en pantalla
    mostrarTrabajo(trabajo);

    // Limpiar formulario
    document.getElementById("nombre").value = "";
    document.getElementById("fecha").value = "";
    document.getElementById("hora").value = "";
    document.getElementById("descripcion").value = "";

    modal.style.display = "none";
};

// Mostrar una tarea
function mostrarTrabajo(trabajo){

    const tarjeta = document.createElement("div");

    tarjeta.className = "tarea";

    tarjeta.innerHTML = `
        <h3>${trabajo.nombre}</h3>
        <p>${trabajo.descripcion}</p>
        <p>📅 ${trabajo.fecha}</p>
        <p>🕒 ${trabajo.hora}</p>
    `;

    lista.appendChild(tarjeta);
}

// Cargar tareas guardadas
function cargarTareas(){

    let tareas = JSON.parse(localStorage.getItem("tareas")) || [];

    lista.innerHTML = "";

    tareas.forEach(mostrarTrabajo);

}

function eliminarTodo(){

    const confirmar = confirm("¿Estás seguro de que deseas eliminar todas las tareas?");

    if(confirmar){

        localStorage.removeItem("tareas");

        document.getElementById("listaTareas").innerHTML = `
            <p class="sin-tareas">
                📋 No hay tareas pendientes.
            </p>
        `;

    }

}

function verificarLista() {
    const lista = document.getElementById("listaTareas");

    if (lista.children.length === 0) {
        lista.innerHTML = `
            <p class="sin-tareas">
                📋 No hay trabajos pendientes.
            </p>`;
    }
}

// Ejecutar al cargar la página
verificarLista();