/**
 * Manejador de Errores
 * Gestiona la visualización de mensajes de error
 */

import CONSTANTS from "../config/constants.js";

/**
 * Muestra un mensaje de error en el panel de resultados
 * @param {string} mensaje - Mensaje de error a mostrar
 */
export function mostrarError(mensaje) {
  const panelResultados = document.querySelector(".results-panel");
  if (!panelResultados) {
    console.error(mensaje);
    return;
  }
  panelResultados.innerHTML = `
    <h2 class="${CONSTANTS.CSS_CLASSES.SECTION_TITLE}">Resultados</h2>
    <p>${mensaje}</p>
  `;
}

export default {
  mostrarError
};
