import { cargarHimnos, cargarCategoriasUnicas } from "../services/hymnService.js";
import { filtrarHimnos, ordenarHimnos } from "../domain/hymn.js";
import { renderizarCategorias, renderCategoryModalOptions, renderizarResultados } from "./renderer.js";
import { mostrarError } from "./errorHandler.js";
import { getDefaultVoice } from "../main.js";
import { iniciarReproduccionPlaylist } from "./components/playlistPlayer.js";

// Estado local de la vista
let himnos = [];
let categoriasCargadas = [];
let ultimoFiltrado = [];

export async function initHomeView(session = null) {
  const inputBusqueda = document.getElementById("search-input");
  const selectCategoria = document.getElementById("category-select");
  const selectOrden = document.getElementById("order-select");
  const btnPlayFiltered = document.getElementById("btn-play-filtered-results");

  if (!inputBusqueda || !selectCategoria || !selectOrden) return;

  const esUsuarioRegistrado = !!(session && session.user);

  const actualizar = () => {
    const texto = inputBusqueda.value.trim().toLowerCase();
    const categoria = selectCategoria.value;
    const orden = selectOrden.value;

    let filtrados = filtrarHimnos(himnos, texto, categoria);
    filtrados = ordenarHimnos(filtrados, orden);

    ultimoFiltrado = filtrados;

    const defaultVoice = getDefaultVoice();
    renderizarResultados(filtrados, defaultVoice);

    // Actualizar estado y visibilidad del botón de reproducción para usuarios registrados
    const btnPlay = document.getElementById("btn-play-filtered-results");
    if (btnPlay) {
      if (esUsuarioRegistrado && ultimoFiltrado.length > 0) {
        btnPlay.classList.remove("hidden");
        const nombreCat = categoria ? (categoria.length > 25 ? categoria.substring(0, 22) + "..." : categoria) : "";
        btnPlay.innerHTML = nombreCat ? `▶️ Reproducir "${nombreCat}"` : "▶️ Reproducir lista";
      } else {
        btnPlay.classList.add("hidden");
      }
    }
  };

  inputBusqueda.addEventListener("input", actualizar);
  selectCategoria.addEventListener("change", actualizar);
  selectOrden.addEventListener("change", actualizar);

  // Acción de clic para reproducir todos los resultados filtrados
  const btnPlay = document.getElementById("btn-play-filtered-results");
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      if (!ultimoFiltrado || ultimoFiltrado.length === 0) return;

      const catVal = selectCategoria.value;
      const textoBusqueda = inputBusqueda.value.trim();

      let nombrePlaylist = "Resultados de búsqueda";
      if (catVal) {
        nombrePlaylist = `Categoría: ${catVal}`;
      } else if (textoBusqueda) {
        nombrePlaylist = `Búsqueda: "${textoBusqueda}"`;
      }

      const defaultVoice = getDefaultVoice();

      const items = ultimoFiltrado.map((h, idx) => ({
        hymn_id: h.id,
        title: h.titulo,
        position: idx + 1,
        repeat_count: 1,
        voice_id: null,
        voice_name: defaultVoice || "Voz por defecto"
      }));

      const playlistTemporal = {
        id: "temp-home-playlist",
        name: nombrePlaylist,
        items
      };

      iniciarReproduccionPlaylist(playlistTemporal, 0);
    });
  }

  // Configurar Modal de Filtro por Categoría
  const btnOpenModal = document.getElementById("btn-open-category-filter");
  const btnCloseModal = document.getElementById("btn-close-category-filter");
  const categoryModal = document.getElementById("category-filter-modal");
  const categoryModalSearch = document.getElementById("category-modal-search");

  if (btnOpenModal && categoryModal) {
    btnOpenModal.addEventListener("click", () => {
      if (categoryModalSearch) categoryModalSearch.value = "";
      renderCategoryModalOptions(categoriasCargadas);
      categoryModal.classList.remove("hidden");
    });
  }

  if (categoryModal) {
    if (btnCloseModal) {
      btnCloseModal.addEventListener("click", () => {
        categoryModal.classList.add("hidden");
      });
    }

    categoryModal.addEventListener("click", (e) => {
      if (e.target === categoryModal) {
        categoryModal.classList.add("hidden");
      }
    });
  }

  if (categoryModalSearch) {
    categoryModalSearch.addEventListener("input", (e) => {
      renderCategoryModalOptions(categoriasCargadas, e.target.value);
    });
  }

  // Ocultar el teclado móvil al presionar Enter/Buscar
  inputBusqueda.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      inputBusqueda.blur();
    }
  });

  // Ocultar el teclado móvil del buscador al tocar la zona de resultados
  const panelResultados = document.querySelector(".results-panel");
  if (panelResultados) {
    const desmarcarBuscador = () => {
      if (document.activeElement === inputBusqueda) {
        inputBusqueda.blur();
      }
    };
    panelResultados.addEventListener("touchstart", desmarcarBuscador, { passive: true });
    panelResultados.addEventListener("click", desmarcarBuscador);
  }

  // Cargar datos
  try {
    himnos = await cargarHimnos();
    categoriasCargadas = await cargarCategoriasUnicas();

    renderizarCategorias(categoriasCargadas);
    actualizar();
  } catch (error) {
    mostrarError(`No se pudieron cargar los datos. ${error.message}`);
  }
}

