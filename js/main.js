/**
 * Punto de entrada de la aplicación
 * Inicializa la aplicación y coordina los módulos
 */

import { inputBusqueda, selectCategoria, selectOrden } from "./config/selectors.js";
import { cargarHimnos, cargarCategoriasUnicas } from "./services/hymnService.js";
import {
  filtrarHimnos,
  ordenarHimnos
} from "./domain/hymn.js";
import { renderizarCategorias, renderizarResultados } from "./ui/renderer.js";
import { mostrarError } from "./ui/errorHandler.js";

// Estado global
let himnos = [];

/**
 * Actualiza los resultados según los filtros y orden actuales
 */
function actualizar() {
  const texto = inputBusqueda.value.trim().toLowerCase();
  const categoria = selectCategoria.value;
  const orden = selectOrden.value;

  let filtrados = filtrarHimnos(himnos, texto, categoria);
  filtrados = ordenarHimnos(filtrados, orden);

  renderizarResultados(filtrados);
}

/**
 * Inicializa la aplicación
 * Carga los datos y configura los event listeners
 */
async function inicializar() {
  try {
    // Cargar himnos y categorías desde Supabase
    himnos = await cargarHimnos();
    const categorias = await cargarCategoriasUnicas();
    
    renderizarCategorias(categorias);
    actualizar();
  } catch (error) {
    mostrarError(`No se pudieron cargar los datos. ${error.message}`);
  }
}

// Configurar event listeners
inputBusqueda.addEventListener("input", actualizar);
selectCategoria.addEventListener("change", actualizar);
selectOrden.addEventListener("change", actualizar);

// Iniciar la aplicación
inicializar();
