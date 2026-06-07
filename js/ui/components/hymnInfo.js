/**
 * Componente Información del Himno
 * Renderiza la información principal y acciones de un himno
 */

import CONSTANTS from "../../config/constants.js";
import { capitalizar, formatDate } from "../../utils/formatters.js";

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

  const badge = document.createElement("span");
  badge.className = `${CONSTANTS.CSS_CLASSES.BADGE} ${CONSTANTS.CSS_CLASSES.BADGE_CATEGORY}`;
  badge.textContent =
    categorias.map(capitalizar).join(", ") || "Categoría desconocida";

  const extra = document.createElement("span");
  extra.className = CONSTANTS.CSS_CLASSES.HYMN_EXTRA;
  extra.textContent = `Tono: ${himno.tono || "-"} · Registrado: ${formatDate(himno.fecha_registro)}`;

  meta.appendChild(badge);
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
