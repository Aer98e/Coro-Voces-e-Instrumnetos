/**
 * Servicio de datos para himnos
 * Maneja la carga y gestión de datos desde el servidor
 */

import CONSTANTS from "../config/constants.js";

/**
 * Carga los datos de himnos desde data.json
 * @returns {Promise<Array>} Promesa con la lista de himnos
 * @throws {Error} Si hay error al cargar los datos
 */
export async function cargarHimnos() {
  try {
    const respuesta = await fetch(CONSTANTS.DATA_URL);
    
    if (!respuesta.ok) {
      throw new Error(
        `HTTP ${respuesta.status} ${respuesta.statusText}`
      );
    }

    return await respuesta.json();
  } catch (error) {
    console.error("Error cargando data.json:", error);
    throw error;
  }
}

export default {
  cargarHimnos
};
