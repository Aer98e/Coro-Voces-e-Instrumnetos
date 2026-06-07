/**
 * Componente Tarjeta de Himno
 * Ensambla todos los componentes en una tarjeta completa
 */

import CONSTANTS from "../../config/constants.js";
import { obtenerCategorias, obtenerVersionPorVoz } from "../../domain/hymn.js";
import { crearInfoHimno } from "./hymnInfo.js";
import { crearSelectorVoces } from "./voiceSelector.js";
import { crearReproductor } from "./audioPlayer.js";
import { generarURLFirmada } from "../../services/hymnService.js";

/**
 * Crea una tarjeta de himno completa
 * @param {Object} himno - Objeto himno
 * @returns {HTMLElement} Elemento tarjeta de himno
 */
export function crearTarjetaHimno(himno) {
  const categorias = obtenerCategorias(himno);
  let versionSeleccionada = obtenerVersionPorVoz(himno);

  const tarjeta = document.createElement("article");
  tarjeta.className = CONSTANTS.CSS_CLASSES.HYMN_CARD;

  // Crear información y acciones
  const { container: hymnMain, verPdf, descargarPdf } = crearInfoHimno(
    himno,
    categorias,
    versionSeleccionada
  );

  // Crear selector de voces
  const { wrapper: voiceSelectorWrapper, select: voiceSelect, indicator: voiceIndicator } = crearSelectorVoces(
    himno,
    versionSeleccionada
  );

  // Crear reproductor
  const { container: hymnAudio, audio, source } = crearReproductor(versionSeleccionada);

  let audioCargado = false;

  // Audio silencioso corto en formato base64 para mantener los controles del navegador habilitados
  const SILENT_AUDIO = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA";

  const resetLinks = () => {
    verPdf.href = "#";
    descargarPdf.href = "#";
    source.src = SILENT_AUDIO;
    audio.load();
    audioCargado = false;
  };

  // Inicializar en '#' ya que se firmarán bajo demanda
  resetLinks();

  // Ver PDF bajo demanda
  verPdf.addEventListener("click", async (e) => {
    if (verPdf.getAttribute("href") === "#") {
      e.preventDefault();
      if (!versionSeleccionada.pdfPath) return;
      
      verPdf.style.opacity = "0.5";
      verPdf.style.pointerEvents = "none";
      try {
        const url = await generarURLFirmada(versionSeleccionada.pdfPath, 1800);
        if (url) {
          verPdf.href = url;
          window.open(url, "_blank");
        }
      } catch (err) {
        console.error("Error al obtener partitura:", err);
      } finally {
        verPdf.style.opacity = "";
        verPdf.style.pointerEvents = "";
      }
    }
  });

  // Descargar PDF bajo demanda
  descargarPdf.addEventListener("click", async (e) => {
    if (descargarPdf.getAttribute("href") === "#") {
      e.preventDefault();
      if (!versionSeleccionada.pdfPath) return;
      
      descargarPdf.style.opacity = "0.5";
      descargarPdf.style.pointerEvents = "none";
      try {
        const url = await generarURLFirmada(versionSeleccionada.pdfPath, 1800);
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = "";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error("Error al descargar partitura:", err);
      } finally {
        descargarPdf.style.opacity = "";
        descargarPdf.style.pointerEvents = "";
      }
    }
  });

  // Reproducir Audio bajo demanda
  audio.addEventListener("play", async () => {
    if (!audioCargado && versionSeleccionada.audioPath) {
      audio.pause();
      audio.style.opacity = "0.5";
      try {
        const url = await generarURLFirmada(versionSeleccionada.audioPath, 1800);
        if (url) {
          source.src = url;
          audio.load();
          audioCargado = true;
          audio.play().catch(err => console.error("Error al reproducir audio:", err));
        }
      } catch (err) {
        console.error("Error al cargar audio:", err);
      } finally {
        audio.style.opacity = "";
      }
    }
  });

  // Agregar evento de cambio de voz
  voiceSelect.addEventListener("change", () => {
    versionSeleccionada = obtenerVersionPorVoz(himno, voiceSelect.value);
    voiceIndicator.textContent = versionSeleccionada.voz || voiceSelect.value;
    resetLinks();
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
