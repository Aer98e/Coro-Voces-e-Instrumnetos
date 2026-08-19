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
let currentCategoriesData = [];

/**
 * Renderiza las opciones de categoría en el selector nativo y en el modal personalizado
 * @param {Array} categorias - Lista de categorías a renderizar
 */
export function renderizarCategorias(categorias) {
  currentCategoriesData = categorias || [];

  const selectCategoria = document.getElementById("category-select");
  if (selectCategoria) {
    const opcionesHtml = (categorias || []).map(cat => {
      const val = typeof cat === 'string' ? cat : cat.label;
      const display = typeof cat === 'string' ? cat : cat.label;
      return `<option value="${val}">${display}</option>`;
    }).join("");
    selectCategoria.innerHTML = `<option value="">Todas las categorías</option>${opcionesHtml}`;
  }

  renderCategoryModalOptions(currentCategoriesData);
}

/**
 * Renderiza las opciones dentro del modal personalizado con soporte para 2 líneas (Nombre y Grupo)
 * @param {Array} categorias - Lista de categorías
 * @param {string} searchQuery - Filtro de búsqueda dentro del modal
 */
export function renderCategoryModalOptions(categorias, searchQuery = '') {
  const container = document.getElementById("category-filter-options-list");
  if (!container) return;

  const selectCategoria = document.getElementById("category-select");
  const currentValue = selectCategoria ? selectCategoria.value : '';
  const normQuery = String(searchQuery || '').toLowerCase().trim();

  let filtered = categorias || [];
  if (normQuery !== '') {
    filtered = filtered.filter(c => {
      const name = typeof c === 'string' ? c : c.name;
      const group = typeof c === 'string' ? '' : (c.groupName || '');
      return name.toLowerCase().includes(normQuery) || group.toLowerCase().includes(normQuery);
    });
  }

  let html = `
    <div class="category-option-item ${currentValue === '' ? 'active' : ''}" data-value="">
      <div class="category-option-text">
        <span class="category-option-name">Todas las categorías</span>
        <span class="category-option-group global">Mostrar todos los himnos</span>
      </div>
      <div class="category-option-radio">
        <span class="radio-indicator ${currentValue === '' ? 'selected' : ''}"></span>
      </div>
    </div>
  `;

  filtered.forEach(c => {
    const isString = typeof c === 'string';
    const val = isString ? c : c.label;
    const name = isString ? c : c.name;
    const groupName = isString ? null : c.groupName;
    const isSelected = currentValue === val;

    html += `
      <div class="category-option-item ${isSelected ? 'active' : ''}" data-value="${val}">
        <div class="category-option-text">
          <span class="category-option-name">${name}</span>
          ${groupName 
            ? `<span class="category-option-group">${groupName}</span>` 
            : `<span class="category-option-group global">Categoría Global</span>`}
        </div>
        <div class="category-option-radio">
          <span class="radio-indicator ${isSelected ? 'selected' : ''}"></span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html || '<p style="text-align:center; color:#64748b; padding:1.5rem 0;">No se encontraron categorías.</p>';

  container.querySelectorAll(".category-option-item").forEach(item => {
    item.addEventListener("click", () => {
      const value = item.getAttribute("data-value");
      if (selectCategoria) {
        selectCategoria.value = value;
        selectCategoria.dispatchEvent(new Event("change"));
      }

      const triggerLabel = document.getElementById("selected-category-label");
      if (triggerLabel) {
        if (value === "") {
          triggerLabel.textContent = "Todas las categorías";
        } else {
          const match = (categorias || []).find(cat => (typeof cat === 'string' ? cat : cat.label) === value);
          if (match && typeof match !== 'string' && match.groupName) {
            triggerLabel.innerHTML = `${match.name} <small style="color:#64748b; font-size:0.8rem; font-weight:normal;">(${match.groupName})</small>`;
          } else {
            triggerLabel.textContent = typeof match === 'string' ? match : (match?.name || value);
          }
        }
      }

      const modal = document.getElementById("category-filter-modal");
      if (modal) modal.classList.add("hidden");
    });
  });
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
