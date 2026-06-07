/**
 * Componente Reproductor de Audio
 * Renderiza el reproductor de audio para un himno
 */

import CONSTANTS from "../../config/constants.js";

/**
 * Crea el componente reproductor de audio
 * @param {Object} versionInicial - Versión inicial del himno
 * @returns {Object} Objeto con elementos DOM y referencias
 */
export function crearReproductor(versionInicial) {
  const hymnAudio = document.createElement("div");
  hymnAudio.className = CONSTANTS.CSS_CLASSES.HYMN_AUDIO;

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.preload = "none";
  audio.className = CONSTANTS.CSS_CLASSES.AUDIO_PLAYER;

  const source = document.createElement("source");
  source.src = versionInicial.audio || "";
  source.type = CONSTANTS.AUDIO_TYPE;
  audio.appendChild(source);
  audio.appendChild(
    document.createTextNode("Tu navegador no soporta el elemento de audio.")
  );

  hymnAudio.appendChild(audio);

  return {
    container: hymnAudio,
    audio,
    source
  };
}

export default {
  crearReproductor
};
