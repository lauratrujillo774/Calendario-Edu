// Genera una página HTML por pantalla en frontend/pages/ (todas cargan la misma aplicación y abren su pantalla).
//   npm run generar-paginas
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PAGINAS } from '../../frontend/js/app/paginas.js';

const carpeta = fileURLToPath(new URL('../../frontend/pages/', import.meta.url));
const plantilla = (titulo, ruta) => `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#dbeafe">
    <title>${titulo} · EduCal</title>
    <link rel="stylesheet" href="../css/app.css">
    <link rel="stylesheet" href="../css/cuaderno.css">
    <link rel="stylesheet" href="../css/nuevas.css">
</head>
<body${ruta ? ` data-pantalla="${ruta}"` : ''}>
    <noscript><p style="padding:2rem;font-family:sans-serif">Esta aplicación necesita JavaScript para funcionar.</p></noscript>
    <script type="module" src="../js/app/main.js"></script>
</body>
</html>
`;
fs.writeFileSync(carpeta + 'app.html', plantilla('EduCal', null));
for (const [ruta, { archivo, titulo }] of Object.entries(PAGINAS)) fs.writeFileSync(carpeta + archivo, plantilla(titulo, ruta));
console.log(`Páginas generadas en frontend/pages/: app.html + ${Object.keys(PAGINAS).length} pantallas.`);
