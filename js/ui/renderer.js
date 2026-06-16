/**
 * Motor de Renderización
 * Gestiona la renderización de categorías y resultados de búsqueda
 */

import CONSTANTS from "../config/constants.js";
import { capitalizar } from "../utils/formatters.js";
import { crearTarjetaHimno } from "./components/hymnCard.js";
import { mostrarError } from "./errorHandler.js";

/**
 * Renderiza las opciones de categoría en el selector
 * @param {Array} categorias - Lista de categorías a renderizar
 */
export function renderizarCategorias(categorias) {
  const selectCategoria = document.getElementById("category-select");
  if (!selectCategoria) return;

  const opciones = categorias
    .map(categoria => `<option value="${categoria}">${capitalizar(categoria)}</option>`)
    .join("");

  selectCategoria.innerHTML = `<option value="">Todas</option>${opciones}`;
}

/**
 * Renderiza los resultados de búsqueda
 * @param {Array} lista - Lista de himnos a renderizar
 * @param {string} defaultVoice - Voz por defecto del usuario
 */
export function renderizarResultados(lista, defaultVoice) {
  const panelResultados = document.querySelector(".results-panel");
  if (!panelResultados) return;

  panelResultados.innerHTML = `<h2 class="${CONSTANTS.CSS_CLASSES.SECTION_TITLE}">Resultados</h2>`;

  const fragmento = document.createDocumentFragment();

  if (lista.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.textContent = "No se encontraron himnos.";
    fragmento.appendChild(mensaje);
    panelResultados.appendChild(fragmento);
    return;
  }

  lista.forEach(himno => {
    const tarjeta = crearTarjetaHimno(himno, defaultVoice);
    fragmento.appendChild(tarjeta);
  });

  panelResultados.appendChild(fragmento);
}

export default {
  renderizarCategorias,
  renderizarResultados,
  mostrarError
};
