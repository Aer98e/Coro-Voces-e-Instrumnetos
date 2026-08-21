/**
 * Componente Reproductor de Playlist (Sticky Footer Player)
 * Gestiona la reproducción secuencial de una lista con repeticiones por pista,
 * barra de progreso interactiva (seeking), retroceso/avance de 10s y
 * dos modos de bucle: Toda la Lista (🔁) y Pista Actual (🔂).
 */

import { obtenerRutaAudioHimno } from "../../services/hymnService.js";

let state = {
  playlist: null,
  currentIndex: 0,
  currentRepetition: 1,
  loopMode: 'off', // 'off' | 'all' | 'one'
  isPlaying: false,
  isLoading: false,
  isDraggingProgress: false
};

let audioElement = null;
let playerBarContainer = null;

function formatearTiempo(segundos) {
  if (isNaN(segundos) || segundos < 0) return "0:00";
  const mins = Math.floor(segundos / 60);
  const secs = Math.floor(segundos % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function getOrCreateAudioElement() {
  if (!audioElement) {
    audioElement = document.createElement("audio");
    audioElement.preload = "auto";

    audioElement.addEventListener("play", () => {
      state.isPlaying = true;
      actualizarBotonPlayPausaUI();
    });

    audioElement.addEventListener("pause", () => {
      state.isPlaying = false;
      actualizarBotonPlayPausaUI();
    });

    audioElement.addEventListener("timeupdate", () => {
      actualizarProgresoUI();
    });

    audioElement.addEventListener("loadedmetadata", () => {
      actualizarProgresoUI();
    });

    audioElement.addEventListener("ended", () => {
      mananejarFinDePista();
    });

    audioElement.addEventListener("error", (e) => {
      console.error("❌ Error en la fuente de audio:", e);
      state.isLoading = false;
      actualizarEstadoTexto("Error al cargar audio.");
    });
  }
  return audioElement;
}

function getOrCreatePlayerBar() {
  playerBarContainer = document.getElementById("playlist-sticky-player");
  if (!playerBarContainer) {
    playerBarContainer = document.createElement("div");
    playerBarContainer.id = "playlist-sticky-player";
    playerBarContainer.className = "playlist-player-bar hidden";

    playerBarContainer.innerHTML = `
      <!-- Barra de progreso superior -->
      <div class="player-progress-wrapper">
        <span id="player-current-time" class="player-time-text">0:00</span>
        <input type="range" id="player-progress-bar" class="player-progress-slider" min="0" max="100" value="0" step="0.1" title="Desliza para mover la reproducción">
        <span id="player-duration-time" class="player-time-text">0:00</span>
      </div>

      <div class="player-bar-flex">
        <!-- Info del Himno Actual -->
        <div class="player-track-info">
          <div id="player-track-title" class="player-track-title">--</div>
          <div id="player-status-text" class="player-track-meta">Cargando...</div>
        </div>

        <!-- Botones de Control Multimedia -->
        <div class="player-controls-group">
          <button id="btn-player-loop" class="player-btn" title="Modo Bucle">🔁</button>
          <button id="btn-player-prev" class="player-btn" title="Anterior pista (o inicio de pista)">⏮️</button>
          <button id="btn-player-rewind" class="player-btn" title="Retroceder 10 segundos">⏪</button>
          <button id="btn-player-toggle" class="player-btn btn-play-main" title="Reproducir / Pausar">▶️</button>
          <button id="btn-player-forward" class="player-btn" title="Adelantar 10 segundos">⏩</button>
          <button id="btn-player-next" class="player-btn" title="Siguiente pista">⏭️</button>
        </div>

        <!-- Botón de Cerrar -->
        <button id="btn-player-close" class="player-btn-close" title="Cerrar Reproductor">&times;</button>
      </div>
    `;

    document.body.appendChild(playerBarContainer);

    // Asignar Eventos Permanentes
    const progressBar = playerBarContainer.querySelector("#player-progress-bar");
    
    progressBar?.addEventListener("mousedown", () => { state.isDraggingProgress = true; });
    progressBar?.addEventListener("touchstart", () => { state.isDraggingProgress = true; });
    
    progressBar?.addEventListener("input", (e) => {
      const audio = getOrCreateAudioElement();
      if (audio.duration) {
        const targetTime = (parseFloat(e.target.value) / 100) * audio.duration;
        const curTimeEl = playerBarContainer.querySelector("#player-current-time");
        if (curTimeEl) curTimeEl.textContent = formatearTiempo(targetTime);
      }
    });

    progressBar?.addEventListener("change", (e) => {
      const audio = getOrCreateAudioElement();
      if (audio.duration) {
        audio.currentTime = (parseFloat(e.target.value) / 100) * audio.duration;
      }
      state.isDraggingProgress = false;
    });

    progressBar?.addEventListener("mouseup", () => { state.isDraggingProgress = false; });
    progressBar?.addEventListener("touchend", () => { state.isDraggingProgress = false; });

    playerBarContainer.querySelector("#btn-player-loop")?.addEventListener("click", toggleBucle);
    playerBarContainer.querySelector("#btn-player-prev")?.addEventListener("click", anteriorPista);
    playerBarContainer.querySelector("#btn-player-rewind")?.addEventListener("click", retroceder10Segundos);
    playerBarContainer.querySelector("#btn-player-toggle")?.addEventListener("click", alternarPlayPausa);
    playerBarContainer.querySelector("#btn-player-forward")?.addEventListener("click", adelantar10Segundos);
    playerBarContainer.querySelector("#btn-player-next")?.addEventListener("click", siguientePista);
    playerBarContainer.querySelector("#btn-player-close")?.addEventListener("click", cerrarReproductor);
  }
  return playerBarContainer;
}

export async function iniciarReproduccionPlaylist(playlist, startIndex = 0) {
  if (!playlist || !playlist.items || playlist.items.length === 0) {
    alert("La lista de reproducción no contiene himnos con audio.");
    return;
  }

  state.playlist = playlist;
  state.currentIndex = Math.max(0, Math.min(startIndex, playlist.items.length - 1));
  state.currentRepetition = 1;

  getOrCreatePlayerBar();
  playerBarContainer.classList.remove("hidden");

  await reproducirPistaActual();
}

async function reproducirPistaActual() {
  const itemActual = state.playlist.items[state.currentIndex];
  if (!itemActual) return;

  const audio = getOrCreateAudioElement();
  state.isLoading = true;
  actualizarInfoUI();
  actualizarEstadoTexto(`Cargando "${itemActual.title}"...`);

  try {
    const signedUrl = await obtenerRutaAudioHimno(itemActual.hymn_id, itemActual.voice_id);
    if (!signedUrl) {
      actualizarEstadoTexto(`⚠️ Sin audio para "${itemActual.title}"`);
      state.isLoading = false;
      setTimeout(() => siguientePista(), 2000);
      return;
    }

    audio.src = signedUrl;
    state.isLoading = false;

    await audio.play();
    actualizarMediaSession(itemActual);
    actualizarInfoUI();
  } catch (err) {
    console.error("Error reproduciendo pista:", err);
    state.isLoading = false;
    actualizarEstadoTexto("Error de reproducción.");
  }
}

async function mananejarFinDePista() {
  const itemActual = state.playlist.items[state.currentIndex];
  if (!itemActual) return;

  // 1. Modo Bucle 1 Canción (🔂) -> Repite la canción actual indefinidamente
  if (state.loopMode === 'one') {
    const audio = getOrCreateAudioElement();
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (e) {
      console.error("Error al repetir canción:", e);
    }
    return;
  }

  // 2. ¿Faltan repeticiones programadas para este himno?
  if (state.currentRepetition < itemActual.repeat_count) {
    state.currentRepetition++;
    actualizarInfoUI();
    const audio = getOrCreateAudioElement();
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch (e) {
      console.error("Error al repetir pista:", e);
    }
    return;
  }

  // 3. Repeticiones de la canción actual cumplidas -> Pasar al siguiente himno
  state.currentRepetition = 1;
  if (state.currentIndex < state.playlist.items.length - 1) {
    state.currentIndex++;
    await reproducirPistaActual();
  } else {
    // 4. Final de la playlist alcanzado
    if (state.loopMode === 'all') {
      // Modo Bucle Toda la Lista (🔁) -> Reiniciar en la primera canción
      state.currentIndex = 0;
      await reproducirPistaActual();
    } else {
      // Bucle Desactivado ('off') -> Terminar reproducción
      state.isPlaying = false;
      actualizarInfoUI();
      actualizarEstadoTexto("✅ Reproducción de lista finalizada.");
    }
  }
}

export function alternarPlayPausa() {
  const audio = getOrCreateAudioElement();
  if (!state.playlist) return;

  if (state.isPlaying) {
    audio.pause();
  } else {
    if (!audio.src) {
      reproducirPistaActual();
    } else {
      audio.play().catch(console.error);
    }
  }
}

export function retroceder10Segundos() {
  const audio = getOrCreateAudioElement();
  audio.currentTime = Math.max(0, audio.currentTime - 10);
}

export function adelantar10Segundos() {
  const audio = getOrCreateAudioElement();
  if (audio.duration) {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
  }
}

export async function siguientePista() {
  if (!state.playlist || !state.playlist.items) return;
  state.currentRepetition = 1;

  if (state.currentIndex < state.playlist.items.length - 1) {
    state.currentIndex++;
  } else {
    state.currentIndex = 0;
  }
  await reproducirPistaActual();
}

export async function anteriorPista() {
  if (!state.playlist || !state.playlist.items) return;
  
  const audio = getOrCreateAudioElement();
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  state.currentRepetition = 1;
  if (state.currentIndex > 0) {
    state.currentIndex--;
  } else {
    state.currentIndex = state.playlist.items.length - 1;
  }
  await reproducirPistaActual();
}

export function toggleBucle() {
  if (state.loopMode === 'off') {
    state.loopMode = 'all';
  } else if (state.loopMode === 'all') {
    state.loopMode = 'one';
  } else {
    state.loopMode = 'off';
  }
  actualizarBotonBucleUI();
}

export function cerrarReproductor() {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = "";
  }
  state.playlist = null;
  state.isPlaying = false;
  if (playerBarContainer) {
    playerBarContainer.classList.add("hidden");
  }
}

function actualizarMediaSession(item) {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: item.title,
      artist: `Voz: ${item.voice_name}`,
      album: state.playlist?.name || "Coro - Playlist"
    });

    navigator.mediaSession.setActionHandler("play", () => alternarPlayPausa());
    navigator.mediaSession.setActionHandler("pause", () => alternarPlayPausa());
    navigator.mediaSession.setActionHandler("previoustrack", () => anteriorPista());
    navigator.mediaSession.setActionHandler("nexttrack", () => siguientePista());
    navigator.mediaSession.setActionHandler("seekbackward", () => retroceder10Segundos());
    navigator.mediaSession.setActionHandler("seekforward", () => adelantar10Segundos());
  }
}

function actualizarEstadoTexto(texto) {
  const infoEl = document.getElementById("player-status-text");
  if (infoEl) infoEl.textContent = texto;
}

function actualizarBotonPlayPausaUI() {
  const toggleBtn = playerBarContainer?.querySelector("#btn-player-toggle");
  if (toggleBtn) {
    toggleBtn.innerHTML = state.isLoading ? "⏳" : (state.isPlaying ? "⏸️" : "▶️");
    toggleBtn.title = state.isPlaying ? "Pausar" : "Reproducir";
  }
}

function actualizarBotonBucleUI() {
  const loopBtn = playerBarContainer?.querySelector("#btn-player-loop");
  if (!loopBtn) return;

  loopBtn.classList.remove("active-loop-all", "active-loop-one");

  if (state.loopMode === 'all') {
    loopBtn.classList.add("active-loop-all");
    loopBtn.innerHTML = "🔁";
    loopBtn.style.opacity = "1";
    loopBtn.title = "Bucle: Toda la Playlist (Repite la lista completa al terminar) 🔁";
  } else if (state.loopMode === 'one') {
    loopBtn.classList.add("active-loop-one");
    loopBtn.innerHTML = "🔂";
    loopBtn.style.opacity = "1";
    loopBtn.title = "Bucle: Pista Actual (Repite esta canción indefinidamente) 🔂";
  } else {
    loopBtn.innerHTML = "🔁";
    loopBtn.style.opacity = "0.45";
    loopBtn.title = "Bucle: Desactivado (Cumple repeticiones y avanza; se detiene al final)";
  }
}

function actualizarInfoUI() {
  const container = getOrCreatePlayerBar();
  if (!state.playlist) {
    container.classList.add("hidden");
    return;
  }

  const item = state.playlist.items[state.currentIndex];
  if (!item) return;

  const totalItems = state.playlist.items.length;
  
  const titleEl = container.querySelector("#player-track-title");
  if (titleEl) titleEl.textContent = item.title;

  actualizarEstadoTexto(`Pista ${state.currentIndex + 1} de ${totalItems} • Repetición ${state.currentRepetition} de ${item.repeat_count} (${item.voice_name})`);
  actualizarBotonPlayPausaUI();
  actualizarBotonBucleUI();
}

function actualizarProgresoUI() {
  if (!playerBarContainer || state.isDraggingProgress) return;

  const audio = getOrCreateAudioElement();
  const currentTimeEl = playerBarContainer.querySelector("#player-current-time");
  const durationTimeEl = playerBarContainer.querySelector("#player-duration-time");
  const progressBar = playerBarContainer.querySelector("#player-progress-bar");

  const curTime = audio.currentTime || 0;
  const durTime = audio.duration || 0;

  if (currentTimeEl) currentTimeEl.textContent = formatearTiempo(curTime);
  if (durationTimeEl) durationTimeEl.textContent = formatearTiempo(durTime);

  if (progressBar && durTime > 0) {
    progressBar.value = (curTime / durTime) * 100;
  } else if (progressBar) {
    progressBar.value = 0;
  }
}

export default {
  iniciarReproduccionPlaylist,
  alternarPlayPausa,
  retroceder10Segundos,
  adelantar10Segundos,
  siguientePista,
  anteriorPista,
  toggleBucle,
  cerrarReproductor
};
