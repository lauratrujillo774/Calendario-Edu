const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre"
];

let fechaActual = new Date();

const diasCalendario =
    document.getElementById("diasCalendario");

const mesActual =
    document.getElementById("mesActual");


function crearCalendario(){

    diasCalendario.innerHTML = "";

    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();

    mesActual.textContent =
        `${meses[mes]} ${año}`;

    const primerDia =
        new Date(año, mes, 1).getDay();

    const cantidadDias =
        new Date(año, mes + 1, 0).getDate();

    let inicio = primerDia === 0 ? 6 : primerDia - 1;


    // Espacios antes del primer día

    for(let i = 0; i < inicio; i++){

        const espacio = document.createElement("div");

        espacio.className = "dia";

        espacio.style.visibility = "hidden";

        diasCalendario.appendChild(espacio);
    }


    // Crear días

    for(let dia = 1; dia <= cantidadDias; dia++){

        const elemento = document.createElement("div");

        elemento.className = "dia";

        elemento.innerHTML = `<strong>${dia}</strong>`;

        const hoy = new Date();

        if(
            dia === hoy.getDate() &&
            mes === hoy.getMonth() &&
            año === hoy.getFullYear()
        ){

            elemento.classList.add("hoy");

        }

        diasCalendario.appendChild(elemento);

    }

}


document.getElementById("anterior").onclick = function(){

    fechaActual.setMonth(fechaActual.getMonth() - 1);

    crearCalendario();

};


document.getElementById("siguiente").onclick = function(){

    fechaActual.setMonth(fechaActual.getMonth() + 1);

    crearCalendario();

};


// Modal

const modal = document.getElementById("modal");

document.getElementById("abrirModal").onclick = function(){

    modal.style.display = "flex";

};


document.getElementById("cerrarModal").onclick = function(){

    modal.style.display = "none";

};


// Guardar trabajo

document.getElementById("guardarTrabajo").onclick = function(){

    const nombre =
        document.getElementById("nombreTrabajo").value;

    const materia =
        document.getElementById("materia").value;

    const fecha =
        document.getElementById("fechaTrabajo").value;

    const hora =
        document.getElementById("horaTrabajo").value;

    const descripcion =
        document.getElementById("descripcion").value;


    if(nombre === "" || fecha === "" || hora === ""){

        alert("Completa el nombre, fecha y hora.");

        return;

    }


    const trabajo = {
        nombre,
        materia,
        fecha,
        hora,
        descripcion
    };


    let trabajos =
        JSON.parse(localStorage.getItem("trabajos")) || [];


    trabajos.push(trabajo);


    localStorage.setItem(
        "trabajos",
        JSON.stringify(trabajos)
    );


    mostrarTrabajo(trabajo);


    document.getElementById("nombreTrabajo").value = "";
    document.getElementById("materia").value = "";
    document.getElementById("fechaTrabajo").value = "";
    document.getElementById("horaTrabajo").value = "";
    document.getElementById("descripcion").value = "";


    modal.style.display = "none";

};


function mostrarTrabajo(trabajo){

    const lista =
        document.getElementById("listaTareas");


    const sinTareas =
        lista.querySelector(".sin-tareas");

    if(sinTareas){
        sinTareas.remove();
    }


    const tarjeta =
        document.createElement("div");

    tarjeta.className = "tarea-card";


    tarjeta.innerHTML = `
        <h3>📚 ${trabajo.nombre}</h3>

        <p>📖 Materia: ${trabajo.materia || "Sin especificar"}</p>

        <p>📅 Fecha: ${trabajo.fecha}</p>

        <p>🕒 Hora: ${trabajo.hora}</p>

        <p>📝 ${trabajo.descripcion || "Sin descripción"}</p>
    `;


    lista.appendChild(tarjeta);

}


function cargarTrabajos(){

    const trabajos =
        JSON.parse(localStorage.getItem("trabajos")) || [];


    trabajos.forEach(trabajo => {

        mostrarTrabajo(trabajo);

    });


    if(trabajos.length === 0){

        document.getElementById("listaTareas").innerHTML = `
            <p class="sin-tareas">
                📋 No hay trabajos pendientes.
            </p>
        `;

    }

}


crearCalendario();

cargarTrabajos();