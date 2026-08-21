/**
 * Controlador de la Vista de Listas de Reproducción (Playlists)
 * Maneja las pestañas "Mis Playlists" y "Comunidad", la creación/edición,
 * el reordenamiento Drag & Drop, ajuste de repeticiones y reproducción.
 */

import {
  obtenerMisPlaylists,
  obtenerPlaylistsComunidad,
  crearPlaylist,
  actualizarPlaylist,
  eliminarPlaylist,
  obtenerDetallePlaylist,
  agregarHimnoAPlaylist,
  eliminarHimnoDePlaylist,
  guardarOrdenYRepeticiones,
  duplicarPlaylist
} from "../services/playlistService.js";

import { cargarHimnos, cargarVoces } from "../services/hymnService.js";
import { iniciarReproduccionPlaylist } from "./components/playlistPlayer.js";

let currentDetailPlaylist = null;
let cachedCatalogHimnos = [];
let cachedCatalogVoces = [];
let isOwnerView = true;

/**
 * Inicializa la vista de playlists llamada desde router.js
 */
export async function initPlaylistsView() {
  configurarEventosPestañas();
  configurarEventosModales();

  // Cargar catálogo de voces e himnos en segundo plano para modales
  cargarVoces().then(voces => { cachedCatalogVoces = voces || []; }).catch(console.error);
  cargarHimnos().then(himnos => { cachedCatalogHimnos = himnos || []; }).catch(console.error);

  await cargarTabMisPlaylists();
}

function configurarEventosPestañas() {
  const btnMy = document.getElementById("tab-btn-my-playlists");
  const btnCommunity = document.getElementById("tab-btn-community");
  const secMy = document.getElementById("section-my-playlists");
  const secCommunity = document.getElementById("section-community-playlists");
  const secDetail = document.getElementById("section-playlist-detail");

  btnMy?.addEventListener("click", async () => {
    btnMy.classList.add("active");
    btnCommunity?.classList.remove("active");
    secMy?.classList.remove("hidden");
    secCommunity?.classList.add("hidden");
    secDetail?.classList.add("hidden");
    await cargarTabMisPlaylists();
  });

  btnCommunity?.addEventListener("click", async () => {
    btnCommunity.classList.add("active");
    btnMy?.classList.remove("active");
    secCommunity?.classList.remove("hidden");
    secMy?.classList.add("hidden");
    secDetail?.classList.add("hidden");
    await cargarTabComunidad();
  });

  const searchCommunityInput = document.getElementById("community-search-input");
  if (searchCommunityInput) {
    let timeout = null;
    searchCommunityInput.addEventListener("input", (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        cargarTabComunidad(e.target.value);
      }, 300);
    });
  }

  document.getElementById("btn-back-to-playlists")?.addEventListener("click", () => {
    secDetail?.classList.add("hidden");
    const isCommunityActive = btnCommunity?.classList.contains("active");
    if (isCommunityActive) {
      secCommunity?.classList.remove("hidden");
    } else {
      secMy?.classList.remove("hidden");
    }
  });
}

async function cargarTabMisPlaylists() {
  const container = document.getElementById("my-playlists-grid");
  if (!container) return;

  container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem 0;">Cargando tus listas de reproducción...</p>`;

  try {
    const playlists = await obtenerMisPlaylists();

    if (!playlists || playlists.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 3rem 1rem; background: #f8fafc; border-radius: 0.75rem; border: 1px dashed #cbd5e1;">
          <h4 style="margin: 0 0 0.5rem; color: #334155; font-size: 1.1rem;">Aún no tienes listas creadas</h4>
          <p style="margin: 0 0 1.25rem; font-size: 0.9rem;">Crea tu primera lista personalizada para ensayar los himnos del coro.</p>
          <button type="button" class="btn btn-primary btn-open-create-inline" style="font-weight: 600;">➕ Crear Mi Primera Lista</button>
        </div>
      `;
      container.querySelector(".btn-open-create-inline")?.addEventListener("click", abrirModalCrearPlaylist);
      return;
    }

    container.innerHTML = playlists.map(p => {
      const isPublic = p.access_level === 'public';
      const badgeClass = isPublic ? 'badge-global' : 'badge-voice-p';
      const badgeText = isPublic ? '🌐 Pública' : '🔒 Privada';

      return `
        <div class="playlist-card" data-id="${p.id}">
          <div>
            <div class="playlist-card-header">
              <h4 class="playlist-card-title">${p.name}</h4>
              <span class="badge ${badgeClass}" style="font-size: 0.7rem; color:initial;">${badgeText}</span>
            </div>
            <p class="playlist-card-desc">${p.description || 'Sin descripción'}</p>
          </div>
          <div>
            <div class="playlist-card-meta">
              🎵 ${p.total_hymns} ${p.total_hymns === 1 ? 'Himno' : 'Himnos'}
            </div>
            <div class="playlist-card-actions">
              <button type="button" class="btn btn-primary btn-sm btn-play-playlist" data-id="${p.id}" style="flex: 1; justify-content: center; font-weight:600;">
                ▶️ Escuchar
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-edit-playlist" data-id="${p.id}" title="Ver/Editar Himnos">
                ✏️ Editar
              </button>
              <button type="button" class="btn-icon btn-delete-playlist" data-id="${p.id}" title="Eliminar Lista" style="font-size: 1.1rem; padding: 0.3rem;">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Asignar Eventos a las Tarjetas
    container.querySelectorAll(".btn-play-playlist").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        const detalle = await obtenerDetallePlaylist(id);
        iniciarReproduccionPlaylist(detalle, 0);
      });
    });

    container.querySelectorAll(".btn-edit-playlist").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        abrirDetallePlaylist(id);
      });
    });

    container.querySelectorAll(".btn-delete-playlist").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        if (confirm("¿Estás seguro de eliminar esta lista de reproducción?")) {
          await eliminarPlaylist(id);
          await cargarTabMisPlaylists();
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Error al cargar listas: ${err.message}</p>`;
  }
}

async function cargarTabComunidad(searchQuery = "") {
  const container = document.getElementById("community-playlists-grid");
  if (!container) return;

  container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem 0;">Cargando listas de la comunidad...</p>`;

  try {
    const playlists = await obtenerPlaylistsComunidad(searchQuery);

    if (!playlists || playlists.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 2rem 0;">No se encontraron listas públicas de la comunidad.</p>`;
      return;
    }

    container.innerHTML = playlists.map(p => {
      return `
        <div class="playlist-card" data-id="${p.id}">
          <div>
            <div class="playlist-card-header">
              <h4 class="playlist-card-title">${p.name}</h4>
              <span class="badge badge-global" style="font-size: 0.7rem; color:initial;">🌐 Pública</span>
            </div>
            <p class="playlist-card-desc">${p.description || 'Sin descripción'}</p>
          </div>
          <div>
            <div class="playlist-card-meta">
              👤 ${p.creator_name} • 🎵 ${p.total_hymns} ${p.total_hymns === 1 ? 'Himno' : 'Himnos'}
            </div>
            <div class="playlist-card-actions">
              <button type="button" class="btn btn-primary btn-sm btn-play-community" data-id="${p.id}" style="flex: 1; justify-content: center; font-weight:600;">
                ▶️ Escuchar
              </button>
              <button type="button" class="btn btn-secondary btn-sm btn-view-community" data-id="${p.id}" style="font-weight:600;">
                👁️ Ver Himnos
              </button>
              <button type="button" class="btn btn-ghost btn-sm btn-copy-community" data-id="${p.id}" title="Guardar una copia editable en tus listas">
                📋 Copiar
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".btn-play-community").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        const detalle = await obtenerDetallePlaylist(id);
        iniciarReproduccionPlaylist(detalle, 0);
      });
    });

    container.querySelectorAll(".btn-view-community").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        abrirDetallePlaylist(id);
      });
    });

    container.querySelectorAll(".btn-copy-community").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = parseInt(e.currentTarget.getAttribute("data-id"));
        const button = e.currentTarget;
        button.disabled = true;
        button.textContent = "⏳ Copiando...";
        try {
          const nuevaPlaylist = await duplicarPlaylist(id);
          alert(`✅ ¡Copia creada exitosamente como "${nuevaPlaylist.name}"!`);
          document.getElementById("tab-btn-my-playlists")?.click();
        } catch (err) {
          alert(`Error al copiar lista: ${err.message}`);
        } finally {
          button.disabled = false;
          button.textContent = "📋 Copiar";
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: #ef4444;">Error al cargar comunidad: ${err.message}</p>`;
  }
}

async function abrirDetallePlaylist(playlistId) {
  const secMy = document.getElementById("section-my-playlists");
  const secCommunity = document.getElementById("section-community-playlists");
  const secDetail = document.getElementById("section-playlist-detail");

  secMy?.classList.add("hidden");
  secCommunity?.classList.add("hidden");
  secDetail?.classList.remove("hidden");

  try {
    currentDetailPlaylist = await obtenerDetallePlaylist(playlistId);
    isOwnerView = currentDetailPlaylist.is_own;
    renderizarDetallePlaylist();
  } catch (err) {
    alert(`Error al abrir detalle: ${err.message}`);
  }
}

function renderizarDetallePlaylist() {
  if (!currentDetailPlaylist) return;

  const titleEl = document.getElementById("detail-playlist-name");
  const descEl = document.getElementById("detail-playlist-desc");
  const authorEl = document.getElementById("detail-playlist-author");
  const badgeEl = document.getElementById("detail-playlist-badge");
  const countEl = document.getElementById("detail-playlist-count");
  const ownerActions = document.getElementById("owner-playlist-actions");
  const btnCopy = document.getElementById("btn-copy-community-playlist");
  const btnPlayFull = document.getElementById("btn-play-full-playlist");

  if (titleEl) titleEl.textContent = currentDetailPlaylist.name;
  if (descEl) descEl.textContent = currentDetailPlaylist.description || "Sin descripción";
  if (authorEl) authorEl.textContent = `Creado por: ${currentDetailPlaylist.creator_name}`;

  const isPublic = currentDetailPlaylist.access_level === 'public';
  if (badgeEl) {
    badgeEl.className = `badge ${isPublic ? 'badge-global' : 'badge-voice-p'}`;
    badgeEl.textContent = isPublic ? '🌐 Pública' : '🔒 Privada';
  }

  const items = currentDetailPlaylist.items || [];
  if (countEl) countEl.textContent = `${items.length} ${items.length === 1 ? 'Himno' : 'Himnos'}`;

  const quickEditBtn = document.getElementById("btn-quick-edit-playlist-title");
  const openEditBtn = document.getElementById("btn-open-edit-playlist-modal");

  if (isOwnerView) {
    ownerActions?.classList.remove("hidden");
    quickEditBtn?.classList.remove("hidden");
    btnCopy?.classList.add("hidden");
  } else {
    ownerActions?.classList.add("hidden");
    quickEditBtn?.classList.add("hidden");
    btnCopy?.classList.remove("hidden");
  }

  if (quickEditBtn) quickEditBtn.onclick = () => abrirModalEditarPlaylist(currentDetailPlaylist);
  if (openEditBtn) openEditBtn.onclick = () => abrirModalEditarPlaylist(currentDetailPlaylist);

  if (btnPlayFull) {
    btnPlayFull.onclick = () => iniciarReproduccionPlaylist(currentDetailPlaylist, 0);
  }

  if (btnCopy) {
    btnCopy.onclick = async () => {
      btnCopy.disabled = true;
      btnCopy.textContent = "⏳ Copiando...";
      try {
        const copia = await duplicarPlaylist(currentDetailPlaylist.id);
        alert(`✅ Copia guardada como "${copia.name}" en tu biblioteca.`);
        abrirDetallePlaylist(copia.id);
      } catch (err) {
        alert(`Error al copiar: ${err.message}`);
      } finally {
        btnCopy.disabled = false;
        btnCopy.textContent = "📋 Guardar una Copia Editable";
      }
    };
  }

  const togglePrivacyBtn = document.getElementById("btn-toggle-playlist-privacy");
  if (togglePrivacyBtn && isOwnerView) {
    togglePrivacyBtn.onclick = async () => {
      const nuevoAcceso = currentDetailPlaylist.access_level === 'public' ? 'private' : 'public';
      await actualizarPlaylist(currentDetailPlaylist.id, { access_level: nuevoAcceso });
      currentDetailPlaylist.access_level = nuevoAcceso;
      renderizarDetallePlaylist();
    };
  }

  renderizarItemsLista(items);
}

function renderizarItemsLista(items) {
  const container = document.getElementById("playlist-items-container");
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: #64748b; padding: 2rem 0;">Esta lista no tiene himnos agregados aún. ${isOwnerView ? '¡Haz clic en "➕ Agregar Himno" para comenzar!' : ''}</p>`;
    return;
  }

  container.innerHTML = items.map((item, index) => {
    const voiceOptionsHtml = cachedCatalogVoces.map(v => 
      `<option value="${v.id}" ${item.voice_id === v.id ? 'selected' : ''}>${v.voice_name}</option>`
    ).join("");

    return `
      <div class="playlist-item-row" data-index="${index}" data-item-id="${item.id}" ${isOwnerView ? 'draggable="true"' : ''}>
        
        <!-- Fila Superior: Arrastre, Posición, Título y Botón Play -->
        <div class="playlist-item-top-row">
          ${isOwnerView ? `<span class="playlist-drag-handle" title="Arrastrar para reordenar">⋮⋮</span>` : ''}
          <span class="playlist-item-pos">${index + 1}</span>

          <div class="playlist-item-info">
            <span class="playlist-item-title">${item.title}</span>
            <span class="playlist-item-meta">Tono: ${item.hymn_key} • Versión: ${item.version_name}</span>
          </div>

          <button type="button" class="btn-icon btn-play-single-item" data-index="${index}" title="Reproducir desde este himno" style="font-size: 1.1rem; padding: 0.3rem;">
            ▶️
          </button>
        </div>

        <!-- Fila Inferior: Selección de Voz, Repeticiones y Controles (En móvil se adapta como sub-barra) -->
        <div class="playlist-item-bottom-row">
          <!-- Selector de Voz -->
          <div class="playlist-item-voice-wrap">
            <select class="select-input select-voice-item" data-index="${index}" ${!isOwnerView ? 'disabled' : ''} style="margin: 0; padding: 0.3rem 0.5rem; font-size: 0.85rem; width: 100%;">
              <option value="">Voz por Defecto</option>
              ${voiceOptionsHtml}
            </select>
          </div>

          <!-- Contador de Repeticiones -->
          <div class="playlist-item-repeat" title="Número de repeticiones de este himno">
            <span style="font-size:0.8rem; white-space: nowrap;">Repetir:</span>
            <input type="number" class="input-repeat-count" data-index="${index}" min="1" max="99" value="${item.repeat_count}" ${!isOwnerView ? 'disabled' : ''}>
          </div>

          <!-- Controles Reordenar / Borrar -->
          ${isOwnerView ? `
            <div class="playlist-item-actions">
              <button type="button" class="btn-icon btn-move-up" data-index="${index}" title="Mover arriba ⬆️" style="font-size: 0.9rem; padding: 0.2rem;" ${index === 0 ? 'disabled' : ''}>⬆️</button>
              <button type="button" class="btn-icon btn-move-down" data-index="${index}" title="Mover abajo ⬇️" style="font-size: 0.9rem; padding: 0.2rem;" ${index === items.length - 1 ? 'disabled' : ''}>⬇️</button>
              <button type="button" class="btn-icon btn-remove-item" data-item-id="${item.id}" title="Quitar de la lista" style="font-size: 1.1rem; padding: 0.3rem;">🗑️</button>
            </div>
          ` : ''}
        </div>

      </div>
    `;
  }).join("");

  // Asignar Eventos a las filas
  container.querySelectorAll(".btn-play-single-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.getAttribute("data-index"));
      iniciarReproduccionPlaylist(currentDetailPlaylist, idx);
    });
  });

  if (isOwnerView) {
    // Eventos de Repeticiones e Inputs de Voz
    container.querySelectorAll(".input-repeat-count").forEach(inp => {
      inp.addEventListener("change", async (e) => {
        const idx = parseInt(e.target.getAttribute("data-index"));
        const newReps = Math.max(1, parseInt(e.target.value) || 1);
        currentDetailPlaylist.items[idx].repeat_count = newReps;
        await guardarCambiosOrdenYRepeticiones();
      });
    });

    container.querySelectorAll(".select-voice-item").forEach(sel => {
      sel.addEventListener("change", async (e) => {
        const idx = parseInt(e.target.getAttribute("data-index"));
        const val = e.target.value ? parseInt(e.target.value) : null;
        const voiceObj = cachedCatalogVoces.find(v => v.id === val);
        currentDetailPlaylist.items[idx].voice_id = val;
        currentDetailPlaylist.items[idx].voice_name = voiceObj ? voiceObj.voice_name : "Voz por Defecto";
        await guardarCambiosOrdenYRepeticiones();
      });
    });

    // Mover Arriba / Abajo
    container.querySelectorAll(".btn-move-up").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-index"));
        if (idx > 0) {
          const temp = currentDetailPlaylist.items[idx];
          currentDetailPlaylist.items[idx] = currentDetailPlaylist.items[idx - 1];
          currentDetailPlaylist.items[idx - 1] = temp;
          reindexarItems();
          renderizarItemsLista(currentDetailPlaylist.items);
          await guardarCambiosOrdenYRepeticiones();
        }
      });
    });

    container.querySelectorAll(".btn-move-down").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const idx = parseInt(e.currentTarget.getAttribute("data-index"));
        if (idx < currentDetailPlaylist.items.length - 1) {
          const temp = currentDetailPlaylist.items[idx];
          currentDetailPlaylist.items[idx] = currentDetailPlaylist.items[idx + 1];
          currentDetailPlaylist.items[idx + 1] = temp;
          reindexarItems();
          renderizarItemsLista(currentDetailPlaylist.items);
          await guardarCambiosOrdenYRepeticiones();
        }
      });
    });

    container.querySelectorAll(".btn-remove-item").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const itemId = parseInt(e.currentTarget.getAttribute("data-item-id"));
        await eliminarHimnoDePlaylist(itemId);
        currentDetailPlaylist.items = currentDetailPlaylist.items.filter(i => i.id !== itemId);
        reindexarItems();
        renderizarItemsLista(currentDetailPlaylist.items);
        await guardarCambiosOrdenYRepeticiones();
      });
    });

    // Eventos Drag & Drop Nativo
    configurarDragAndDrop(container);
  }
}

function reindexarItems() {
  if (!currentDetailPlaylist || !currentDetailPlaylist.items) return;
  currentDetailPlaylist.items.forEach((item, i) => {
    item.position = i + 1;
  });
}

async function guardarCambiosOrdenYRepeticiones() {
  if (!currentDetailPlaylist || !isOwnerView) return;
  reindexarItems();
  try {
    await guardarOrdenYRepeticiones(currentDetailPlaylist.id, currentDetailPlaylist.items);
  } catch (err) {
    console.error("Error guardando orden:", err);
  }
}

function configurarDragAndDrop(container) {
  let draggedRowIndex = null;

  container.querySelectorAll(".playlist-item-row").forEach(row => {
    row.addEventListener("dragstart", (e) => {
      draggedRowIndex = parseInt(row.getAttribute("data-index"));
      row.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
    });

    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });

    row.addEventListener("drop", async (e) => {
      e.preventDefault();
      const targetRow = e.currentTarget;
      const targetIndex = parseInt(targetRow.getAttribute("data-index"));

      if (draggedRowIndex !== null && draggedRowIndex !== targetIndex) {
        const itemArrastrado = currentDetailPlaylist.items.splice(draggedRowIndex, 1)[0];
        currentDetailPlaylist.items.splice(targetIndex, 0, itemArrastrado);
        reindexarItems();
        renderizarItemsLista(currentDetailPlaylist.items);
        await guardarCambiosOrdenYRepeticiones();
      }
    });
  });
}

function configurarEventosModales() {
  // Modal Crear/Editar Playlist
  const modal = document.getElementById("playlist-modal");
  const form = document.getElementById("playlist-form");
  const btnOpen = document.getElementById("btn-open-create-playlist");
  const btnClose = document.getElementById("btn-close-playlist-modal");
  const btnCancel = document.getElementById("btn-cancel-playlist-modal");

  btnOpen?.addEventListener("click", abrirModalCrearPlaylist);
  btnClose?.addEventListener("click", () => modal?.classList.add("hidden"));
  btnCancel?.addEventListener("click", () => modal?.classList.add("hidden"));

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const playlistId = document.getElementById("playlist-modal-id")?.value;
    const nameInput = document.getElementById("playlist-input-name");
    const descInput = document.getElementById("playlist-input-desc");
    const accessSelect = document.getElementById("playlist-input-access");

    const name = nameInput.value.trim();
    if (!name) return;

    try {
      if (playlistId) {
        const updated = await actualizarPlaylist(parseInt(playlistId), {
          name: name,
          description: descInput.value,
          access_level: accessSelect.value
        });
        if (currentDetailPlaylist && currentDetailPlaylist.id === parseInt(playlistId)) {
          currentDetailPlaylist.name = updated.name;
          currentDetailPlaylist.description = updated.description;
          currentDetailPlaylist.access_level = updated.access_level;
          renderizarDetallePlaylist();
        }
      } else {
        await crearPlaylist(name, descInput.value, accessSelect.value);
      }

      modal?.classList.add("hidden");
      form.reset();
      await cargarTabMisPlaylists();
    } catch (err) {
      alert(`Error al guardar lista: ${err.message}`);
    }
  });

  // Modal Agregar/Gestionar Himnos (2 Columnas Continuas)
  const addModal = document.getElementById("add-hymn-to-playlist-modal");
  const btnOpenAdd = document.getElementById("btn-open-add-hymn-modal");
  const btnCloseAdd = document.getElementById("btn-close-add-hymn-modal");
  const btnDoneAdd = document.getElementById("btn-done-add-hymn-modal");
  const searchLinkingInput = document.getElementById("playlist-linking-search-input");

  // Pestañas Móviles para el Modal (< 768px)
  const mobileTabBtns = document.querySelectorAll("#playlist-linking-mobile-tabs .linking-tab-btn");
  const colAdded = document.getElementById("playlist-col-added-wrapper");
  const colAvailable = document.getElementById("playlist-col-available-wrapper");

  btnOpenAdd?.addEventListener("click", () => {
    if (!currentDetailPlaylist) return;
    if (searchLinkingInput) searchLinkingInput.value = "";
    
    // Resetear pestañas móviles a la primera ("En la Playlist")
    mobileTabBtns.forEach(b => b.classList.remove("active"));
    if (mobileTabBtns[0]) mobileTabBtns[0].classList.add("active");
    colAdded?.classList.add("active-mobile-col");
    colAvailable?.classList.remove("active-mobile-col");

    addModal?.classList.remove("hidden");
    renderizarListadoAgregarHimno();
  });

  btnCloseAdd?.addEventListener("click", () => addModal?.classList.add("hidden"));
  btnDoneAdd?.addEventListener("click", () => addModal?.classList.add("hidden"));

  if (searchLinkingInput) {
    searchLinkingInput.addEventListener("input", (e) => {
      renderizarListadoAgregarHimno(e.target.value);
    });
  }
  mobileTabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      mobileTabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const targetTab = btn.getAttribute("data-tab");
      if (targetTab === "added") {
        colAdded?.classList.add("active-mobile-col");
        colAvailable?.classList.remove("active-mobile-col");
      } else {
        colAvailable?.classList.add("active-mobile-col");
        colAdded?.classList.remove("active-mobile-col");
      }
    });
  });
}

function abrirModalCrearPlaylist() {
  const modal = document.getElementById("playlist-modal");
  const form = document.getElementById("playlist-form");
  const titleEl = document.getElementById("playlist-modal-title");
  const idInput = document.getElementById("playlist-modal-id");
  
  if (form) form.reset();
  if (idInput) idInput.value = "";
  if (titleEl) titleEl.textContent = "Crear Nueva Lista";
  modal?.classList.remove("hidden");
}

function abrirModalEditarPlaylist(playlist) {
  if (!playlist) return;
  const modal = document.getElementById("playlist-modal");
  const titleEl = document.getElementById("playlist-modal-title");
  const idInput = document.getElementById("playlist-modal-id");
  const nameInput = document.getElementById("playlist-input-name");
  const descInput = document.getElementById("playlist-input-desc");
  const accessSelect = document.getElementById("playlist-input-access");

  if (idInput) idInput.value = playlist.id;
  if (nameInput) nameInput.value = playlist.name;
  if (descInput) descInput.value = playlist.description || "";
  if (accessSelect) accessSelect.value = playlist.access_level || "private";
  if (titleEl) titleEl.textContent = "Editar Lista de Reproducción";
  modal?.classList.remove("hidden");
}

function renderizarListadoAgregarHimno(query = "") {
  const addedListContainer = document.getElementById("playlist-added-hymns-list");
  const availableListContainer = document.getElementById("playlist-available-hymns-list");
  if (!addedListContainer || !availableListContainer || !currentDetailPlaylist) return;

  const normQuery = query.toLowerCase().trim();
  const addedHymnIds = new Set((currentDetailPlaylist.items || []).map(i => i.hymn_id));

  // 1. Himnos en la playlist
  let addedHymns = (currentDetailPlaylist.items || []);
  
  // 2. Himnos disponibles en el catálogo que no están en la playlist
  let availableHymns = cachedCatalogHimnos.filter(h => !addedHymnIds.has(h.id));

  // Filtrar por texto si hay búsqueda
  if (normQuery) {
    addedHymns = addedHymns.filter(item => 
      item.title.toLowerCase().includes(normQuery) || String(item.hymn_id).includes(normQuery)
    );
    availableHymns = availableHymns.filter(h => 
      h.titulo.toLowerCase().includes(normQuery) || String(h.id).includes(normQuery)
    );
  }

  // Actualizar contadores
  const countAdded = (currentDetailPlaylist.items || []).length;
  const countAvailable = availableHymns.length;

  const badgeAdded = document.getElementById("playlist-badge-count-added");
  const badgeAvailable = document.getElementById("playlist-badge-count-available");
  const mobAdded = document.getElementById("playlist-mobile-count-added");
  const mobAvailable = document.getElementById("playlist-mobile-count-available");

  if (badgeAdded) badgeAdded.textContent = `${countAdded} Himnos`;
  if (badgeAvailable) badgeAvailable.textContent = `${countAvailable} Himnos`;
  if (mobAdded) mobAdded.textContent = countAdded;
  if (mobAvailable) mobAvailable.textContent = countAvailable;

  // Render Columna 1: En la Playlist
  if (addedHymns.length === 0) {
    addedListContainer.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1.5rem 0;">No hay himnos agregados a esta lista aún.</p>`;
  } else {
    addedListContainer.innerHTML = addedHymns.map(item => `
      <div class="hymn-linking-item">
        <div class="hymn-linking-info">
          <span class="hymn-linking-title" title="${item.title}">${item.hymn_id}. ${item.title}</span>
          <span style="font-size: 0.75rem; color: #64748b;">Tono: ${item.hymn_key}</span>
        </div>
        <button type="button" class="btn-action-icon btn-action-remove btn-remove-hymn-linking" data-item-id="${item.id}" title="Quitar de la lista">
          ✖
        </button>
      </div>
    `).join('');
  }

  // Render Columna 2: Disponibles
  if (availableHymns.length === 0) {
    availableListContainer.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1.5rem 0;">No hay más himnos disponibles ${normQuery ? 'que coincidan' : 'para agregar'}.</p>`;
  } else {
    availableListContainer.innerHTML = availableHymns.map(h => `
      <div class="hymn-linking-item">
        <div class="hymn-linking-info">
          <span class="hymn-linking-title" title="${h.titulo}">${h.id}. ${h.titulo}</span>
          <span style="font-size: 0.75rem; color: #64748b;">Tono: ${h.tono}</span>
        </div>
        <button type="button" class="btn-action-icon btn-action-add btn-add-hymn-linking" data-hymn-id="${h.id}" title="Agregar a la lista">
          ➕
        </button>
      </div>
    `).join('');
  }

  // Asignar Eventos sin cerrar el modal
  addedListContainer.querySelectorAll(".btn-remove-hymn-linking").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const itemId = parseInt(e.currentTarget.getAttribute("data-item-id"));
      const button = e.currentTarget;
      button.disabled = true;

      try {
        await eliminarHimnoDePlaylist(itemId);
        currentDetailPlaylist = await obtenerDetallePlaylist(currentDetailPlaylist.id);
        renderizarDetallePlaylist();
        renderizarListadoAgregarHimno(document.getElementById("playlist-linking-search-input")?.value || "");
      } catch (err) {
        console.error("Error quitando himno:", err);
      }
    });
  });

  availableListContainer.querySelectorAll(".btn-add-hymn-linking").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const hymnId = parseInt(e.currentTarget.getAttribute("data-hymn-id"));
      const button = e.currentTarget;
      button.disabled = true;

      try {
        await agregarHimnoAPlaylist(currentDetailPlaylist.id, hymnId);
        currentDetailPlaylist = await obtenerDetallePlaylist(currentDetailPlaylist.id);
        renderizarDetallePlaylist();
        renderizarListadoAgregarHimno(document.getElementById("playlist-linking-search-input")?.value || "");
      } catch (err) {
        console.error("Error agregando himno:", err);
      }
    });
  });
}

export default {
  initPlaylistsView
};
