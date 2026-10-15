function consultarIA(){

    const pregunta = document.getElementById("pregunta").value;
    const respuesta = document.getElementById("respuesta");

    if(pregunta.trim() === ""){
        respuesta.innerHTML = "Escribe una pregunta.";
        return;
    }

    respuesta.innerHTML =
        "Analizando tu consulta...<br><br>" +
        "La IA recomienda organizar tus tareas por prioridad, revisar las fechas de entrega y dedicar tiempo de estudio cada día.";
}