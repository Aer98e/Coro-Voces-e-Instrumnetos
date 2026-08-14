/**
 * Componente Información del Himno
 * Renderiza la información principal y acciones de un himno
 */

import CONSTANTS from "../../config/constants.js";
import { capitalizar, formatDate } from "../../utils/formatters.js";

/**
 * Muestra una ventana modal con las categorías del himno
 * @param {string} titulo - Título del himno
 * @param {Array} categorias - Lista de categorías
 */
function abrirModalCategorias(titulo, categorias) {
  const modalPrevia = document.getElementById("hymn-categories-modal");
  if (modalPrevia) modalPrevia.remove();

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "hymn-categories-modal";
  modalOverlay.className = "categories-modal-overlay fade-in";

  const modalCard = document.createElement("div");
  modalCard.className = "categories-modal-card";

  const header = document.createElement("div");
  header.className = "categories-modal-header";

  const headerText = document.createElement("div");
  const titleEl = document.createElement("h4");
  titleEl.className = "categories-modal-title";
  titleEl.textContent = "Categorías";

  const subtitleEl = document.createElement("p");
  subtitleEl.className = "categories-modal-subtitle";
  subtitleEl.textContent = titulo || "Himno";

  headerText.appendChild(titleEl);
  headerText.appendChild(subtitleEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "categories-modal-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Cerrar modal de categorías");

  header.appendChild(headerText);
  header.appendChild(closeBtn);

  const body = document.createElement("div");
  body.className = "categories-modal-body";

  if (Array.isArray(categorias) && categorias.length > 0) {
    const list = document.createElement("div");
    list.className = "categories-badge-list";

    categorias.forEach(cat => {
      const catBadge = document.createElement("span");
      catBadge.className = `${CONSTANTS.CSS_CLASSES.BADGE} ${CONSTANTS.CSS_CLASSES.BADGE_CATEGORY} categories-modal-badge`;
      catBadge.textContent = capitalizar(cat);
      list.appendChild(catBadge);
    });

    body.appendChild(list);
  } else {
    const emptyText = document.createElement("p");
    emptyText.className = "categories-modal-empty";
    emptyText.textContent = "Sin categorías asignadas";
    body.appendChild(emptyText);
  }

  modalCard.appendChild(header);
  modalCard.appendChild(body);
  modalOverlay.appendChild(modalCard);

  const cerrarModal = () => {
    modalOverlay.remove();
    document.removeEventListener("keydown", onKeyDown);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") cerrarModal();
  };

  closeBtn.addEventListener("click", cerrarModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) cerrarModal();
  });
  document.addEventListener("keydown", onKeyDown);

  document.body.appendChild(modalOverlay);
}

/**
 * Crea el componente de información del himno
 * @param {Object} himno - Objeto himno
 * @param {Array} categorias - Categorías del himno
 * @param {Object} versionInicial - Versión inicial del himno
 * @returns {Object} Objeto con elementos DOM y referencias
 */
export function crearInfoHimno(himno, categorias, versionInicial) {
  const hymnMain = document.createElement("div");
  hymnMain.className = CONSTANTS.CSS_CLASSES.HYMN_MAIN;

  const info = document.createElement("div");
  const titulo = document.createElement("h3");
  titulo.className = CONSTANTS.CSS_CLASSES.HYMN_TITLE;
  titulo.textContent = himno.titulo || "Himno sin título";

  const meta = document.createElement("p");
  meta.className = CONSTANTS.CSS_CLASSES.HYMN_META;

  const count = Array.isArray(categorias) ? categorias.length : 0;
  const btnCategorias = document.createElement("button");
  btnCategorias.type = "button";
  btnCategorias.className = "btn-categories-trigger";
  btnCategorias.innerHTML = `🏷️ Categorías (${count})`;
  btnCategorias.setAttribute(
    "aria-label",
    `Ver ${count} categoría(s) de ${himno.titulo || "himno"}`
  );

  btnCategorias.addEventListener("click", (e) => {
    e.stopPropagation();
    abrirModalCategorias(himno.titulo, categorias);
  });

  const extra = document.createElement("span");
  extra.className = CONSTANTS.CSS_CLASSES.HYMN_EXTRA;
  extra.textContent = `Tono: ${himno.tono || "-"} · Registrado: ${formatDate(himno.fecha_registro)}`;

  meta.appendChild(btnCategorias);
  meta.appendChild(extra);
  info.appendChild(titulo);
  info.appendChild(meta);

  const acciones = document.createElement("div");
  acciones.className = CONSTANTS.CSS_CLASSES.HYMN_ACTIONS;

  const verPdf = document.createElement("a");
  verPdf.className = `${CONSTANTS.CSS_CLASSES.BTN} ${CONSTANTS.CSS_CLASSES.BTN_SECONDARY}`;
  verPdf.href = versionInicial.pdf || "#";
  verPdf.target = "_blank";
  verPdf.rel = "noopener noreferrer";
  verPdf.textContent = "Ver partitura (PDF)";

  const descargarPdf = document.createElement("a");
  descargarPdf.className = `${CONSTANTS.CSS_CLASSES.BTN} ${CONSTANTS.CSS_CLASSES.BTN_GHOST}`;
  descargarPdf.href = versionInicial.pdf || "#";
  descargarPdf.download = "";
  descargarPdf.textContent = "Descargar PDF";

  acciones.appendChild(verPdf);
  acciones.appendChild(descargarPdf);

  hymnMain.appendChild(info);
  hymnMain.appendChild(acciones);

  return {
    container: hymnMain,
    verPdf,
    descargarPdf
  };
}

export default {
  crearInfoHimno
};
