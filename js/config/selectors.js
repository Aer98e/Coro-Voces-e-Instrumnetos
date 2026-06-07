/**
 * Selectores de elementos del DOM
 * Define todas las referencias a elementos HTML del página
 */

export const selectors = {
  inputBusqueda: document.getElementById("search-input"),
  selectCategoria: document.getElementById("category-select"),
  selectOrden: document.getElementById("order-select"),
  panelResultados: document.querySelector(".results-panel")
};

export const { inputBusqueda, selectCategoria, selectOrden, panelResultados } = selectors;
