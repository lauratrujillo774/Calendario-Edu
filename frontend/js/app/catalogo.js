import { api } from './api.js';
import { estado } from './estado.js';

// Materias, grupos y asignaciones que el usuario puede usar (lo decide el servidor según su rol)
export async function cargarCatalogo() {
    estado.catalogo = await api.get('/catalogo');
    return estado.catalogo;
}
