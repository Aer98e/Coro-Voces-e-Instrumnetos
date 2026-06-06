/**
 * Manejador de Errores
 * Gestiona la visualización de mensajes de error
 */

import { panelResultados } from "../config/selectors.js";
import CONSTANTS from "../config/constants.js";

/**
 * Muestra un mensaje de error en el panel de resultados
 * @param {string} mensaje - Mensaje de error a mostrar
 */
export function mostrarError(mensaje) {
  panelResultados.innerHTML = `
    <h2 class="${CONSTANTS.CSS_CLASSES.SECTION_TITLE}">Resultados</h2>
    <p>${mensaje}</p>
  `;
}

export default {
  mostrarError
};
