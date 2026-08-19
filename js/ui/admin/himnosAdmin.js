import supabase from "../../config/supabase.js";
import { cargarVoces } from "../../services/hymnService.js";
import { showToast } from "../components/toast.js";

let currentUserSession = null;
let currentRole = null;
let cachedVoicesCatalog = [];

// Cache local para búsqueda instantánea en la tabla
let allHymnsCache = [];
let voiceLinksMapCache = {};

const DEFAULT_VOICES_CATALOG = [
  { id: 1, voice_name: "Soprano" },
  { id: 2, voice_name: "Contralto (Alto)" },
  { id: 3, voice_name: "Tenor" },
  { id: 4, voice_name: "Bajo" },
  { id: 5, voice_name: "Piano" },
  { id: 6, voice_name: "Solo" },
  { id: 7, voice_name: "Todos (General)" },
  { id: 8, voice_name: "Soprano 1" },
  { id: 9, voice_name: "Soprano 2" },
  { id: 10, voice_name: "Alto 1" },
  { id: 11, voice_name: "Alto 2" }
];

async function syncVoicesCatalog() {
  try {
    const dbVoices = await cargarVoces();
    const existingIds = new Set((dbVoices || []).map(v => v.id));

    const missing = DEFAULT_VOICES_CATALOG.filter(v => !existingIds.has(v.id));
    if (missing.length > 0) {
      await supabase.from("voices").upsert(missing);
      const fresh = await cargarVoces();
      cachedVoicesCatalog = fresh && fresh.length > 0 ? fresh : DEFAULT_VOICES_CATALOG;
    } else {
      cachedVoicesCatalog = dbVoices && dbVoices.length > 0 ? dbVoices : DEFAULT_VOICES_CATALOG;
    }
  } catch (err) {
    console.warn("Advertencia al sincronizar catálogo de voces:", err.message);
    cachedVoicesCatalog = DEFAULT_VOICES_CATALOG;
  }
  return cachedVoicesCatalog;
}

function getVoiceBadgeInfo(voice) {
  const rawName = voice.voice_name || "";
  const name = rawName.toLowerCase();
  let label = "V";
  let badgeClass = "badge-voice-g";

  if (name.includes("soprano 1") || name.includes("soprano1")) { label = "S1"; badgeClass = "badge-voice-s"; }
  else if (name.includes("soprano 2") || name.includes("soprano2")) { label = "S2"; badgeClass = "badge-voice-s"; }
  else if (name.includes("soprano")) { label = "S"; badgeClass = "badge-voice-s"; }
  else if (name.includes("alto 1") || name.includes("alto1")) { label = "A1"; badgeClass = "badge-voice-a"; }
  else if (name.includes("alto 2") || name.includes("alto2")) { label = "A2"; badgeClass = "badge-voice-a"; }
  else if (name.includes("alto") || name.includes("contralto")) { label = "A"; badgeClass = "badge-voice-a"; }
  else if (name.includes("tenor 1") || name.includes("tenor1")) { label = "T1"; badgeClass = "badge-voice-t"; }
  else if (name.includes("tenor 2") || name.includes("tenor2")) { label = "T2"; badgeClass = "badge-voice-t"; }
  else if (name.includes("tenor")) { label = "T"; badgeClass = "badge-voice-t"; }
  else if (name.includes("bajo 1") || name.includes("bajo1")) { label = "B1"; badgeClass = "badge-voice-b"; }
  else if (name.includes("bajo 2") || name.includes("bajo2")) { label = "B2"; badgeClass = "badge-voice-b"; }
  else if (name.includes("bajo")) { label = "B"; badgeClass = "badge-voice-b"; }
  else if (name.includes("piano")) { label = "P"; badgeClass = "badge-voice-p"; }
  else if (name.includes("solo")) { label = "O"; badgeClass = "badge-voice-o"; }
  else if (name.includes("todos") || name.includes("general")) { label = "G"; badgeClass = "badge-voice-g"; }
  else { label = rawName.charAt(0).toUpperCase() || "G"; badgeClass = "badge-voice-g"; }

  return { label, badgeClass, name: rawName };
}

function getVoiceNameById(id) {
  const v = cachedVoicesCatalog.find(x => x.id === id);
  return v ? v.voice_name : `voice_${id}`;
}

function renderCreateVoiceGrid(voices) {
  const container = document.getElementById("create-voice-files-container");
  if (!container) return;

  container.innerHTML = voices.map(v => `
    <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0;">
      <span style="font-weight: 600; font-size: 0.85rem; color: #1e293b; display: block; margin-bottom: 0.25rem;">${v.voice_name}</span>
      <div class="file-upload-row">
        <div class="file-upload-col">
          <label class="file-upload-btn" for="audio-voice-${v.id}" title="Subir audio de ${v.voice_name}">
            <span>🎵 +</span>
          </label>
          <input type="file" id="audio-voice-${v.id}" class="voice-audio-input hidden" data-voice="${v.id}" accept="audio/mpeg,audio/mp3">
          <span class="file-name-text" id="name-audio-voice-${v.id}">Sin archivo</span>
        </div>
        <div class="file-upload-col">
          <label class="file-upload-btn" for="pdf-voice-${v.id}" title="Subir partitura de ${v.voice_name}">
            <span>📄 +</span>
          </label>
          <input type="file" id="pdf-voice-${v.id}" class="voice-pdf-input hidden" data-voice="${v.id}" accept="application/pdf">
          <span class="file-name-text" id="name-pdf-voice-${v.id}">Sin archivo</span>
        </div>
      </div>
    </div>
  `).join("");
}

export async function initHimnosAdmin(session, role) {
  currentUserSession = session;
  currentRole = role;

  if (role !== 'admin') {
    const container = document.getElementById("tab-himnos");
    if (container) container.innerHTML = `<p style="color: red; padding: 2rem; text-align: center;">Acceso denegado. Solo administradores pueden gestionar la biblioteca de himnos.</p>`;
    return;
  }

  await syncVoicesCatalog();
  renderCreateVoiceGrid(cachedVoicesCatalog);

  // Subvista: Transición entre tabla y formulario de agregar himno
  document.getElementById("btn-open-add-hymn-subview")?.addEventListener("click", openAddHymnSubView);
  document.getElementById("btn-back-to-hymns-list")?.addEventListener("click", closeAddHymnSubView);
  document.getElementById("btn-cancel-create-hymn")?.addEventListener("click", closeAddHymnSubView);

  // Buscador en tiempo real de la tabla de himnos
  const searchInput = document.getElementById("hymns-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterAndRenderHymnsTable(e.target.value);
    });
  }

  // Configurar listeners de creación
  const createForm = document.getElementById("create-hymn-form");
  if (createForm) {
    const newForm = createForm.cloneNode(true);
    createForm.parentNode.replaceChild(newForm, createForm);
    newForm.addEventListener("submit", handleCreateHymn);

    const submitBtn = newForm.querySelector("#btn-create-hymn-submit");
    if (submitBtn) {
      submitBtn.addEventListener("click", (e) => {
        if (typeof newForm.requestSubmit === "function") {
          e.preventDefault();
          newForm.requestSubmit();
        }
      });
    }
    const cancelBtn = newForm.querySelector("#btn-cancel-create-hymn");
    if (cancelBtn) cancelBtn.addEventListener("click", closeAddHymnSubView);
  }

  // Configurar listeners de edición (modal)
  document.getElementById("btn-edit-hymn-close")?.addEventListener("click", cerrarEditHymnModal);
  document.getElementById("btn-edit-hymn-cancel")?.addEventListener("click", cerrarEditHymnModal);
  
  const editForm = document.getElementById("edit-hymn-form");
  if (editForm) {
    const newEditForm = editForm.cloneNode(true);
    editForm.parentNode.replaceChild(newEditForm, editForm);
    newEditForm.addEventListener("submit", handleUpdateHymn);
    document.getElementById("btn-edit-hymn-cancel")?.addEventListener("click", cerrarEditHymnModal);
  }

  setupFileChangeDelegators();
  await loadHymns();
}

function openAddHymnSubView() {
  document.getElementById("himnos-main-view")?.classList.add("hidden");
  document.getElementById("add-hymn-subview")?.classList.remove("hidden");
}

function closeAddHymnSubView() {
  document.getElementById("add-hymn-subview")?.classList.add("hidden");
  document.getElementById("himnos-main-view")?.classList.remove("hidden");

  const form = document.getElementById("create-hymn-form");
  if (form) {
    form.reset();
    form.querySelectorAll(".file-upload-btn").forEach(label => {
      label.classList.remove("file-selected");
      const isAudio = label.getAttribute("for")?.includes("audio");
      label.innerHTML = `<span>${isAudio ? '🎵' : '📄'} +</span>`;
    });
    form.querySelectorAll(".file-name-text").forEach(nameText => {
      nameText.textContent = "Sin archivo";
      nameText.style.color = "";
      nameText.style.fontWeight = "";
    });
  }
}

function setupFileChangeDelegators() {
  const tabContainer = document.getElementById("tab-himnos");
  if (tabContainer) {
    tabContainer.removeEventListener("change", handleFileStatusChange);
    tabContainer.addEventListener("change", handleFileStatusChange);
  }

  const editModal = document.getElementById("edit-hymn-modal");
  if (editModal) {
    editModal.removeEventListener("change", handleFileStatusChange);
    editModal.addEventListener("change", handleFileStatusChange);
  }
}

function handleFileStatusChange(e) {
  if (
    e.target.classList.contains("voice-audio-input") || 
    e.target.classList.contains("voice-pdf-input") ||
    e.target.classList.contains("edit-voice-audio-input") ||
    e.target.classList.contains("edit-voice-pdf-input")
  ) {
    const file = e.target.files[0];
    const id = e.target.id;
    const label = document.querySelector(`label[for="${id}"]`);
    const nameText = document.getElementById(`name-${id}`);
    
    if (label) {
      const symbol = id.includes("audio") ? "🎵" : "📄";
      if (file) {
        label.classList.add("file-selected");
        label.innerHTML = `<span>${symbol} ✓</span>`;
        if (nameText) {
          nameText.textContent = file.name;
          nameText.style.color = "#10b981";
          nameText.style.fontWeight = "600";
        }
      } else {
        label.classList.remove("file-selected");
        label.innerHTML = `<span>${symbol} +</span>`;
        if (nameText) {
          nameText.textContent = "Sin archivo";
          nameText.style.color = "";
          nameText.style.fontWeight = "";
        }
      }
    }
  }
}

async function loadHymns() {
  const tbody = document.getElementById("hymns-table-body");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Cargando biblioteca...</td></tr>';

  try {
    const { data: hymns, error: hymnsError } = await supabase
      .from("hymns")
      .select("*")
      .order("id", { ascending: true });

    if (hymnsError) throw hymnsError;

    allHymnsCache = hymns || [];

    const { data: voiceLinks, error: linksError } = await supabase
      .from("hymn_voice")
      .select("hymn_id, voice_id, audio_url, pdf_url");

    if (linksError) throw linksError;

    voiceLinksMapCache = {};
    if (voiceLinks) {
      voiceLinks.forEach(link => {
        if (!voiceLinksMapCache[link.hymn_id]) voiceLinksMapCache[link.hymn_id] = [];
        voiceLinksMapCache[link.hymn_id].push(link);
      });
    }

    const currentSearchQuery = document.getElementById("hymns-search-input")?.value || "";
    filterAndRenderHymnsTable(currentSearchQuery);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
}

function filterAndRenderHymnsTable(query = '') {
  const tbody = document.getElementById("hymns-table-body");
  if (!tbody) return;

  const normQuery = normalizarTexto(query);
  let filtered = allHymnsCache;

  if (normQuery !== '') {
    filtered = allHymnsCache.filter(h => {
      const title = normalizarTexto(h.title);
      const id = String(h.id || '');
      const key = normalizarTexto(h.hymn_key);
      const version = normalizarTexto(h.version_name);
      return title.includes(normQuery) || id.includes(normQuery) || key.includes(normQuery) || version.includes(normQuery);
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#64748b; padding:1.5rem 0;">No se encontraron himnos ${normQuery ? 'que coincidan' : 'registrados'}.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(h => {
    const links = voiceLinksMapCache[h.id] || [];

    const voiceBadges = cachedVoicesCatalog.map(voice => {
      const link = links.find(l => l.voice_id === voice.id);
      const { label, badgeClass, name } = getVoiceBadgeInfo(voice);

      const hasAudio = !!link?.audio_url;
      const hasPdf = !!link?.pdf_url;

      if (!hasAudio && !hasPdf) {
        return `<span class="badge" style="opacity: 0.25; margin-right: 0.2rem; cursor: default; user-select: none;" title="${name}: Sin archivos">${label}</span>`;
      }

      let titleStr = [];
      if (hasAudio) titleStr.push("Audio");
      if (hasPdf) titleStr.push("PDF");

      return `<span class="badge ${badgeClass}" style="margin-right: 0.2rem; cursor: pointer;" title="${name}: ${titleStr.join(' y ')}">${label}</span>`;
    }).join('');

    const accessBadge = h.access_level === 'public'
      ? `<span class="badge badge-global" style="color:initial;">Público</span>`
      : (h.access_level === 'private'
        ? `<span class="badge badge-voice" style="color:initial;">Privado</span>`
        : `<span class="badge badge-voice-p" style="color:initial;">Oculto</span>`);

    return `
      <tr>
        <td style="font-family: monospace; font-size: 0.85rem; color:#64748b;">${h.id}</td>
        <td style="font-weight: 600;">${h.title}</td>
        <td>${h.hymn_key || '-'}</td>
        <td>${h.version_name || '-'}</td>
        <td>${accessBadge}</td>
        <td><div style="display: flex; flex-wrap: wrap; gap: 0.25rem; align-items: center; max-width: 240px;">${voiceBadges}</div></td>
        <td style="text-align: right;">
          <div style="display:flex; justify-content: flex-end; align-items:center;">
            <button class="btn-icon btn-edit-hymn" data-id="${h.id}" title="Editar Himno" style="font-size: 1.15rem; margin-right: 0.75rem;">✏️</button>
            <button class="btn-icon btn-delete-hymn" data-id="${h.id}" title="Eliminar Himno" style="font-size: 1.15rem;">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll(".btn-edit-hymn").forEach(btn => {
    btn.addEventListener("click", openEditHymnModal);
  });

  tbody.querySelectorAll(".btn-delete-hymn").forEach(btn => {
    btn.addEventListener("click", handleDeleteHymn);
  });
}

async function handleCreateHymn(e) {
  e.preventDefault();
  const titleInput = document.getElementById("hymn-title");
  const keyInput = document.getElementById("hymn-key");
  const versionInput = document.getElementById("hymn-version");
  const accessSelect = document.getElementById("hymn-access");
  const submitBtn = document.getElementById("btn-create-hymn-submit");
  const statusEl = document.getElementById("create-hymn-status");
  const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
  const spinner = submitBtn ? submitBtn.querySelector(".spinner") : null;

  const title = titleInput.value.trim();
  if (!title) {
    titleInput.style.borderColor = "#ef4444";
    titleInput.focus();
    if (statusEl) {
      statusEl.style.color = "#ef4444";
      statusEl.textContent = "⚠️ Ingrese el título del himno";
    }
    return;
  }

  titleInput.style.borderColor = "";

  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = "Guardando...";
  if (spinner) spinner.classList.remove("hidden");
  if (statusEl) {
    statusEl.style.color = "#2563eb";
    statusEl.textContent = "Registrando himno en la base de datos...";
  }

  try {
    const { data: hymn, error: insertError } = await supabase
      .from("hymns")
      .insert([{
        title: title,
        hymn_key: keyInput.value.trim() || null,
        version_name: versionInput.value.trim() || null,
        access_level: accessSelect.value,
        register: new Date().toISOString().split('T')[0]
      }])
      .select()
      .single();

    if (insertError) throw insertError;
    const hymnId = hymn.id;

    const form = e.target;
    const audioInputs = form.querySelectorAll(".voice-audio-input");
    const pdfInputs = form.querySelectorAll(".voice-pdf-input");

    const uploads = [];

    audioInputs.forEach(inp => {
      const voiceId = parseInt(inp.getAttribute("data-voice"));
      const file = inp.files[0];
      if (file) uploads.push({ voiceId, file, type: 'audio' });
    });

    pdfInputs.forEach(inp => {
      const voiceId = parseInt(inp.getAttribute("data-voice"));
      const file = inp.files[0];
      if (file) uploads.push({ voiceId, file, type: 'pdf' });
    });

    if (uploads.length > 0) {
      let idx = 1;
      for (const upload of uploads) {
        const voiceName = getVoiceNameById(upload.voiceId);
        if (statusEl) {
          statusEl.textContent = `Subiendo archivos (${idx}/${uploads.length}): ${voiceName}...`;
        }

        const ext = upload.type === 'audio' ? 'mp3' : 'pdf';
        const folder = upload.type === 'audio' ? 'audios' : 'scores';
        
        const storagePath = `${folder}/${hymnId}/${hymnId}_${voiceName}.${ext}`;

        const { error: storageError } = await supabase.storage
          .from("hymns")
          .upload(storagePath, upload.file, {
            cacheControl: '3600',
            upsert: true
          });

        if (storageError) throw storageError;

        const { data: existing } = await supabase
          .from("hymn_voice")
          .select("id, audio_url, pdf_url")
          .eq("hymn_id", hymnId)
          .eq("voice_id", upload.voiceId)
          .maybeSingle();

        if (existing) {
          const updatePayload = {};
          if (upload.type === 'audio') updatePayload.audio_url = storagePath;
          else updatePayload.pdf_url = storagePath;

          const { error: updateError } = await supabase
            .from("hymn_voice")
            .update(updatePayload)
            .eq("id", existing.id);

          if (updateError) throw updateError;
        } else {
          const insertPayload = {
            hymn_id: hymnId,
            voice_id: upload.voiceId,
            audio_url: upload.type === 'audio' ? storagePath : null,
            pdf_url: upload.type === 'pdf' ? storagePath : null
          };

          const { error: insertLinkError } = await supabase
            .from("hymn_voice")
            .insert([insertPayload]);

          if (insertLinkError) throw insertLinkError;
        }

        idx++;
      }
    }

    showToast(`Himno "${title}" registrado exitosamente.`, "success", "Himno Creado");
    closeAddHymnSubView();
    await loadHymns();

  } catch (err) {
    console.error("Error al registrar himno:", err);
    showToast(`Error al crear himno: ${err.message}`, "error", "Error");
    if (statusEl) {
      statusEl.style.color = "#ef4444";
      statusEl.textContent = `❌ Error: ${err.message || "No se pudo guardar"}`;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = "Guardar Himno";
    if (spinner) spinner.classList.add("hidden");
  }
}

async function handleDeleteHymn(e) {
  const hymnId = e.currentTarget.getAttribute("data-id");
  if (!confirm("¿Eliminar este himno permanentemente? Se eliminarán todas sus versiones de voz y vínculos.")) return;

  e.currentTarget.disabled = true;

  try {
    const { error: deleteVoicesError } = await supabase
      .from("hymn_voice")
      .delete()
      .eq("hymn_id", hymnId);

    if (deleteVoicesError) throw deleteVoicesError;

    const { error: deleteCategoriesError } = await supabase
      .from("hymn_category")
      .delete()
      .eq("hymn_id", hymnId);

    if (deleteCategoriesError) throw deleteCategoriesError;

    const { error: deleteHymnError } = await supabase
      .from("hymns")
      .delete()
      .eq("id", hymnId);

    if (deleteHymnError) throw deleteHymnError;

    showToast("Himno eliminado correctamente.", "info", "Himno Eliminado");
    await loadHymns();

  } catch (err) {
    showToast(`Error al eliminar el himno: ${err.message}`, "error", "Error");
    e.currentTarget.disabled = false;
  }
}

async function openEditHymnModal(e) {
  const hymnId = e.currentTarget.getAttribute("data-id");
  const modal = document.getElementById("edit-hymn-modal");
  const container = document.getElementById("edit-voice-files-container");
  const statusEl = document.getElementById("edit-hymn-status");

  if (!modal || !container) return;

  document.getElementById("edit-hymn-id").value = hymnId;
  document.getElementById("edit-hymn-title").value = "Cargando...";
  document.getElementById("edit-hymn-key").value = "";
  document.getElementById("edit-hymn-version").value = "";
  if (statusEl) statusEl.textContent = "";

  container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:#64748b;">Cargando archivos del himno...</p>`;
  modal.classList.remove("hidden");

  try {
    const { data: hymn, error: hymnError } = await supabase
      .from("hymns")
      .select("*")
      .eq("id", hymnId)
      .single();

    if (hymnError) throw hymnError;

    document.getElementById("edit-hymn-title").value = hymn.title || "";
    document.getElementById("edit-hymn-key").value = hymn.hymn_key || "";
    document.getElementById("edit-hymn-version").value = hymn.version_name || "";
    document.getElementById("edit-hymn-access").value = hymn.access_level || "public";

    const { data: voiceLinks, error: linksError } = await supabase
      .from("hymn_voice")
      .select("voice_id, audio_url, pdf_url")
      .eq("hymn_id", hymnId);

    if (linksError) throw linksError;

    const linksMap = {};
    if (voiceLinks) {
      voiceLinks.forEach(l => { linksMap[l.voice_id] = l; });
    }

    container.innerHTML = cachedVoicesCatalog.map(v => {
      const link = linksMap[v.id];
      const hasAudio = !!link?.audio_url;
      const hasPdf = !!link?.pdf_url;

      const audioName = hasAudio ? link.audio_url.split('/').pop() : "Sin archivo";
      const pdfName = hasPdf ? link.pdf_url.split('/').pop() : "Sin archivo";

      return `
        <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0;">
          <span style="font-weight: 600; font-size: 0.85rem; color: #1e293b; display: block; margin-bottom: 0.25rem;">${v.voice_name}</span>
          <div class="file-upload-row">
            <div class="file-upload-col">
              <label class="file-upload-btn ${hasAudio ? 'file-selected' : ''}" for="edit-audio-voice-${v.id}" title="Reemplazar audio de ${v.voice_name}">
                <span>🎵 ${hasAudio ? '✓' : '+'}</span>
              </label>
              <input type="file" id="edit-audio-voice-${v.id}" class="edit-voice-audio-input hidden" data-voice="${v.id}" accept="audio/mpeg,audio/mp3">
              <span class="file-name-text" id="name-edit-audio-voice-${v.id}" style="${hasAudio ? 'color:#10b981; font-weight:600;' : ''}">${audioName}</span>
            </div>
            <div class="file-upload-col">
              <label class="file-upload-btn ${hasPdf ? 'file-selected' : ''}" for="edit-pdf-voice-${v.id}" title="Reemplazar partitura de ${v.voice_name}">
                <span>📄 ${hasPdf ? '✓' : '+'}</span>
              </label>
              <input type="file" id="edit-pdf-voice-${v.id}" class="edit-voice-pdf-input hidden" data-voice="${v.id}" accept="application/pdf">
              <span class="file-name-text" id="name-edit-pdf-voice-${v.id}" style="${hasPdf ? 'color:#10b981; font-weight:600;' : ''}">${pdfName}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    container.innerHTML = `<p style="grid-column: 1/-1; color:red; text-align:center;">Error: ${err.message}</p>`;
  }
}

function cerrarEditHymnModal() {
  document.getElementById("edit-hymn-modal")?.classList.add("hidden");
  document.getElementById("edit-hymn-form")?.reset();
}

async function handleUpdateHymn(e) {
  e.preventDefault();
  const hymnId = document.getElementById("edit-hymn-id").value;
  const titleInput = document.getElementById("edit-hymn-title");
  const keyInput = document.getElementById("edit-hymn-key");
  const versionInput = document.getElementById("edit-hymn-version");
  const accessSelect = document.getElementById("edit-hymn-access");
  const submitBtn = document.getElementById("btn-edit-hymn-submit");
  const statusEl = document.getElementById("edit-hymn-status");
  const btnText = submitBtn ? submitBtn.querySelector(".btn-text") : null;
  const spinner = submitBtn ? submitBtn.querySelector(".spinner") : null;

  const title = titleInput.value.trim();
  if (!title) return;

  if (submitBtn) submitBtn.disabled = true;
  if (btnText) btnText.textContent = "Guardando...";
  if (spinner) spinner.classList.remove("hidden");
  if (statusEl) {
    statusEl.style.color = "#2563eb";
    statusEl.textContent = "Actualizando datos del himno...";
  }

  try {
    const { error: updateHymnError } = await supabase
      .from("hymns")
      .update({
        title: title,
        hymn_key: keyInput.value.trim() || null,
        version_name: versionInput.value.trim() || null,
        access_level: accessSelect.value
      })
      .eq("id", hymnId);

    if (updateHymnError) throw updateHymnError;

    const form = e.target;
    const audioInputs = form.querySelectorAll(".edit-voice-audio-input");
    const pdfInputs = form.querySelectorAll(".edit-voice-pdf-input");

    const uploads = [];

    audioInputs.forEach(inp => {
      const voiceId = parseInt(inp.getAttribute("data-voice"));
      const file = inp.files[0];
      if (file) uploads.push({ voiceId, file, type: 'audio' });
    });

    pdfInputs.forEach(inp => {
      const voiceId = parseInt(inp.getAttribute("data-voice"));
      const file = inp.files[0];
      if (file) uploads.push({ voiceId, file, type: 'pdf' });
    });

    if (uploads.length > 0) {
      let idx = 1;
      for (const upload of uploads) {
        const voiceName = getVoiceNameById(upload.voiceId);
        if (statusEl) {
          statusEl.textContent = `Actualizando archivos (${idx}/${uploads.length}): ${voiceName}...`;
        }

        const ext = upload.type === 'audio' ? 'mp3' : 'pdf';
        const folder = upload.type === 'audio' ? 'audios' : 'scores';
        const storagePath = `${folder}/${hymnId}/${hymnId}_${voiceName}.${ext}`;

        const { error: storageError } = await supabase.storage
          .from("hymns")
          .upload(storagePath, upload.file, {
            cacheControl: '3600',
            upsert: true
          });

        if (storageError) throw storageError;

        const { data: existing } = await supabase
          .from("hymn_voice")
          .select("id, audio_url, pdf_url")
          .eq("hymn_id", hymnId)
          .eq("voice_id", upload.voiceId)
          .maybeSingle();

        if (existing) {
          const updatePayload = {};
          if (upload.type === 'audio') updatePayload.audio_url = storagePath;
          else updatePayload.pdf_url = storagePath;

          const { error: updateLinkError } = await supabase
            .from("hymn_voice")
            .update(updatePayload)
            .eq("id", existing.id);

          if (updateLinkError) throw updateLinkError;
        } else {
          const insertPayload = {
            hymn_id: hymnId,
            voice_id: upload.voiceId,
            audio_url: upload.type === 'audio' ? storagePath : null,
            pdf_url: upload.type === 'pdf' ? storagePath : null
          };

          const { error: insertLinkError } = await supabase
            .from("hymn_voice")
            .insert([insertPayload]);

          if (insertLinkError) throw insertLinkError;
        }

        idx++;
      }
    }

    showToast(`Himno "${title}" actualizado correctamente.`, "success", "Himno Actualizado");
    cerrarEditHymnModal();
    await loadHymns();

  } catch (err) {
    console.error("Error al actualizar himno:", err);
    showToast(`Error al actualizar: ${err.message}`, "error", "Error");
    if (statusEl) {
      statusEl.style.color = "#ef4444";
      statusEl.textContent = `❌ Error: ${err.message || "No se pudo actualizar"}`;
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = "Guardar Cambios";
    if (spinner) spinner.classList.add("hidden");
  }
}

function normalizarTexto(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!«»"'\(\)\[\]\.,_\-]/g, "")
    .trim();
}
