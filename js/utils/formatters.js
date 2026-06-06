/**
 * Funciones de formateo de datos
 */

import CONSTANTS from "../config/constants.js";

/**
 * Capitaliza la primera letra de un texto
 * @param {string} texto - Texto a capitalizar
 * @returns {string} Texto capitalizado
 */
export function capitalizar(texto) {
  return String(texto).charAt(0).toUpperCase() + String(texto).slice(1);
}

/**
 * Formatea una fecha al formato español: "dia de mes de año"
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatDate(fecha) {
  if (!fecha) {
    return "Fecha desconocida";
  }

  const fechaObj = new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) {
    return String(fecha);
  }

  return fechaObj.toLocaleDateString("es-ES", CONSTANTS.DATE_FORMAT_OPTIONS);
}

export default {
  capitalizar,
  formatDate
};
