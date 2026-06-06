/**
 * Componente Selector de Voces
 * Renderiza el selector de voces para un himno
 */

import CONSTANTS from "../../config/constants.js";

/**
 * Crea el componente selector de voces
 * @param {Object} himno - Objeto himno
 * @param {Object} versionInicial - Versión inicial del himno
 * @returns {Object} Objeto con elementos DOM y referencias
 */
export function crearSelectorVoces(himno, versionInicial) {
  const voiceSelectorWrapper = document.createElement("div");
  voiceSelectorWrapper.className = CONSTANTS.CSS_CLASSES.VOICE_SELECTOR;

  const voiceLabel = document.createElement("label");
  voiceLabel.textContent = "Voz:";
  voiceLabel.setAttribute("for", `voice-select-${himno.id}`);

  const voiceSelect = document.createElement("select");
  voiceSelect.id = `voice-select-${himno.id}`;
  voiceSelect.className = CONSTANTS.CSS_CLASSES.SELECT_INPUT;

  const versiones = himno.versiones ?? himno.voces ?? [];
  versiones.forEach(version => {
    const option = document.createElement("option");
    option.value = version.voz;
    option.textContent = version.voz;
    if (version.voz === versionInicial.voz) {
      option.selected = true;
    }
    voiceSelect.appendChild(option);
  });

  const voiceIndicator = document.createElement("span");
  voiceIndicator.className = `${CONSTANTS.CSS_CLASSES.BADGE} ${CONSTANTS.CSS_CLASSES.BADGE_VOICE}`;
  voiceIndicator.textContent = versionInicial.voz || "Voz";

  voiceSelectorWrapper.appendChild(voiceLabel);
  voiceSelectorWrapper.appendChild(voiceSelect);
  voiceSelectorWrapper.appendChild(voiceIndicator);

  return {
    wrapper: voiceSelectorWrapper,
    select: voiceSelect,
    indicator: voiceIndicator
  };
}

export default {
  crearSelectorVoces
};
