const tareas = [
    {titulo:"Matemáticas", completada:true},
    {titulo:"Historia", completada:false},
    {titulo:"Inglés", completada:true},
    {titulo:"Programación", completada:false},
    {titulo:"Química", completada:false}
];

function actualizarEstadisticas(){

    const total = tareas.length;
    const completadas = tareas.filter(t => t.completada).length;
    const pendientes = total - completadas;

    const porcentaje = total === 0
        ? 0
        : Math.round((completadas / total) * 100);

    document.getElementById("total").textContent = total;
    document.getElementById("pendientes").textContent = pendientes;
    document.getElementById("completadas").textContent = completadas;
    document.getElementById("progreso").textContent = porcentaje + "%";
}

actualizarEstadisticas();