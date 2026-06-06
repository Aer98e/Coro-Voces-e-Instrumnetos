/**
 * Componente Tarjeta de Himno
 * Ensambla todos los componentes en una tarjeta completa
 */

import CONSTANTS from "../../config/constants.js";
import { obtenerCategorias, obtenerVersionPorVoz } from "../../domain/hymn.js";
import { crearInfoHimno } from "./hymnInfo.js";
import { crearSelectorVoces } from "./voiceSelector.js";
import { crearReproductor } from "./audioPlayer.js";

/**
 * Crea una tarjeta de himno completa
 * @param {Object} himno - Objeto himno
 * @returns {HTMLElement} Elemento tarjeta de himno
 */
export function crearTarjetaHimno(himno) {
  const categorias = obtenerCategorias(himno);
  const versionInicial = obtenerVersionPorVoz(himno);

  const tarjeta = document.createElement("article");
  tarjeta.className = CONSTANTS.CSS_CLASSES.HYMN_CARD;

  // Crear información y acciones
  const { container: hymnMain, verPdf, descargarPdf } = crearInfoHimno(
    himno,
    categorias,
    versionInicial
  );

  // Crear selector de voces
  const { wrapper: voiceSelectorWrapper, select: voiceSelect, indicator: voiceIndicator } = crearSelectorVoces(
    himno,
    versionInicial
  );

  // Crear reproductor
  const { container: hymnAudio, audio, source } = crearReproductor(versionInicial);

  // Agregar evento de cambio de voz
  voiceSelect.addEventListener("change", () => {
    const versionSeleccionada = obtenerVersionPorVoz(himno, voiceSelect.value);
    voiceIndicator.textContent = versionSeleccionada.voz || voiceSelect.value;
    verPdf.href = versionSeleccionada.pdf || "#";
    descargarPdf.href = versionSeleccionada.pdf || "#";
    source.src = versionSeleccionada.audio || "";
    audio.load();
  });

  // Armar la tarjeta
  tarjeta.appendChild(hymnMain);
  tarjeta.appendChild(voiceSelectorWrapper);
  tarjeta.appendChild(hymnAudio);

  return tarjeta;
}

export default {
  crearTarjetaHimno
};
