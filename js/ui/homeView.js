import { cargarHimnos, cargarCategoriasUnicas } from "../services/hymnService.js";
import { filtrarHimnos, ordenarHimnos } from "../domain/hymn.js";
import { renderizarCategorias, renderizarResultados } from "./renderer.js";
import { mostrarError } from "./errorHandler.js";
import { getDefaultVoice } from "../main.js";

// Estado local de la vista
let himnos = [];

export async function initHomeView() {
  const inputBusqueda = document.getElementById("search-input");
  const selectCategoria = document.getElementById("category-select");
  const selectOrden = document.getElementById("order-select");

  if (!inputBusqueda || !selectCategoria || !selectOrden) return;

  const actualizar = () => {
    const texto = inputBusqueda.value.trim().toLowerCase();
    const categoria = selectCategoria.value;
    const orden = selectOrden.value;

    let filtrados = filtrarHimnos(himnos, texto, categoria);
    filtrados = ordenarHimnos(filtrados, orden);

    const defaultVoice = getDefaultVoice();
    renderizarResultados(filtrados, defaultVoice);
  };

  inputBusqueda.addEventListener("input", actualizar);
  selectCategoria.addEventListener("change", actualizar);
  selectOrden.addEventListener("change", actualizar);

  // Cargar datos
  try {
    himnos = await cargarHimnos();
    const categorias = await cargarCategoriasUnicas();

    renderizarCategorias(categorias);
    actualizar();
  } catch (error) {
    mostrarError(`No se pudieron cargar los datos. ${error.message}`);
  }
}
