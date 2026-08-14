import supabase from "../../config/supabase.js";
import { cargarVoces } from "../../services/hymnService.js";

let currentUserSession = null;
let currentRole = null;
let cachedVoicesCatalog = [];

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

/**
 * Asegura que la tabla voices en Supabase contenga el catálogo completo de voces (incluyendo Soprano 1, Soprano 2, Alto 1, Alto 2)
 */
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

/**
 * Obtiene iniciales y clase CSS para insignias de voz en la tabla
 */
function getVoiceBadgeInfo(voice) {
  const name = voice.voice_name || "";
  let label = "V";
  let badgeClass = "badge-voice-g";

  if (name.includes("Soprano 1")) { label = "S1"; badgeClass = "badge-voice-s"; }
  else if (name.includes("Soprano 2")) { label = "S2"; badgeClass = "badge-voice-s"; }
  else if (name.includes("Soprano")) { label = "S"; badgeClass = "badge-voice-s"; }
  else if (name.includes("Alto 1")) { label = "A1"; badgeClass = "badge-voice-a"; }
  else if (name.includes("Alto 2")) { label = "A2"; badgeClass = "badge-voice-a"; }
  else if (name.includes("Alto") || name.includes("Contralto")) { label = "A"; badgeClass = "badge-voice-a"; }
  else if (name.includes("Tenor 1")) { label = "T1"; badgeClass = "badge-voice-t"; }
  else if (name.includes("Tenor 2")) { label = "T2"; badgeClass = "badge-voice-t"; }
  else if (name.includes("Tenor")) { label = "T"; badgeClass = "badge-voice-t"; }
  else if (name.includes("Bajo 1")) { label = "B1"; badgeClass = "badge-voice-b"; }
  else if (name.includes("Bajo 2")) { label = "B2"; badgeClass = "badge-voice-b"; }
  else if (name.includes("Bajo")) { label = "B"; badgeClass = "badge-voice-b"; }
  else if (name.includes("Piano")) { label = "P"; badgeClass = "badge-voice-p"; }
  else if (name.includes("Solo")) { label = "O"; badgeClass = "badge-voice-o"; }
  else { label = "G"; badgeClass = "badge-voice-g"; }

  return { label, badgeClass, name };
}

/**
 * Renderiza el grid de voces en el formulario de creación
 */
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

  // Sincronizar catálogo de voces e inicializar formulario de creación dinámico
  await syncVoicesCatalog();
  renderCreateVoiceGrid(cachedVoicesCatalog);

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

  // Configurar event delegation para los cambios de archivos
  setupFileChangeDelegators();

  await loadHymns();
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

    if (!hymns || hymns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay himnos registrados en el sistema.</td></tr>';
      return;
    }

    const { data: voiceLinks, error: linksError } = await supabase
      .from("hymn_voice")
      .select("hymn_id, voice_id, audio_url, pdf_url");

    if (linksError) throw linksError;

    const linksMap = {};
    if (voiceLinks) {
      voiceLinks.forEach(link => {
        if (!linksMap[link.hymn_id]) linksMap[link.hymn_id] = [];
        linksMap[link.hymn_id].push(link);
      });
    }

    tbody.innerHTML = hymns.map(h => {
      const links = linksMap[h.id] || [];

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
          <td>${voiceBadges}</td>
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

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Error: ${err.message}</td></tr>`;
  }
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

  // Quitar estilo de error previo
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

    if (statusEl) {
      statusEl.style.color = "#10b981";
      statusEl.textContent = "✓ ¡Himno guardado con éxito!";
    }
    form.reset();
    
    form.querySelectorAll(".file-upload-btn").forEach(label => {
      label.classList.remove("file-selected");
      const isAudio = label.getAttribute("for").includes("audio");
      label.innerHTML = `<span>${isAudio ? '🎵' : '📄'} +</span>`;
    });
    form.querySelectorAll(".file-name-text").forEach(nameText => {
      nameText.textContent = "Sin archivo";
      nameText.style.color = "";
      nameText.style.fontWeight = "";
    });

    setTimeout(() => { 
      if (statusEl) {
        statusEl.textContent = ""; 
        statusEl.style.color = "";
      }
    }, 4000);
    
    await loadHymns();

  } catch (err) {
    console.error("Error al registrar himno:", err);
    if (statusEl) {
      statusEl.style.color = "#ef4444";
      statusEl.textContent = `❌ Error: ${err.message || "No se pudo guardar"}`;
    }
    alert("Error al registrar himno: " + (err.message || "Ocurrió un problema de conexión"));
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (btnText) btnText.textContent = "Guardar Himno";
    if (spinner) spinner.classList.add("hidden");
  }
}

async function handleDeleteHymn(e) {
  const hymnId = e.currentTarget.getAttribute("data-id");
  if (!confirm("¿Eliminar este himno permanentemente? Todos los audios y partituras asociados serán eliminados.")) return;

  e.currentTarget.disabled = true;

  try {
    const { data: links, error: fetchError } = await supabase
      .from("hymn_voice")
      .select("audio_url, pdf_url")
      .eq("hymn_id", hymnId);

    if (fetchError) throw fetchError;

    const filesToDelete = [];
    if (links) {
      links.forEach(l => {
        if (l.audio_url) filesToDelete.push(l.audio_url);
        if (l.pdf_url) filesToDelete.push(l.pdf_url);
      });
    }

    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("hymns")
        .remove(filesToDelete);

      if (storageError) {
        console.warn("Advertencia al borrar del storage:", storageError.message);
      }
    }

    await supabase.from("hymn_voice").delete().eq("hymn_id", hymnId);
    await supabase.from("hymn_category").delete().eq("hymn_id", hymnId);

    const { error: deleteHymnError } = await supabase
      .from("hymns")
      .delete()
      .eq("id", hymnId);

    if (deleteHymnError) throw deleteHymnError;

    await loadHymns();

  } catch (err) {
    alert("Error al eliminar himno: " + err.message);
    e.currentTarget.disabled = false;
  }
}

// ---- Modal de Edición ---- //

async function openEditHymnModal(e) {
  const hymnId = e.currentTarget.getAttribute("data-id");
  
  const modal = document.getElementById("edit-hymn-modal");
  const idInput = document.getElementById("edit-hymn-id");
  const titleInput = document.getElementById("edit-hymn-title");
  const keyInput = document.getElementById("edit-hymn-key");
  const versionInput = document.getElementById("edit-hymn-version");
  const accessSelect = document.getElementById("edit-hymn-access");
  const container = document.getElementById("edit-voice-files-container");
  
  container.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#64748b;'>Cargando archivos del himno...</p>";
  modal.classList.remove("hidden");

  try {
    const { data: hymn, error: fetchHymnError } = await supabase
      .from("hymns")
      .select("*")
      .eq("id", hymnId)
      .single();

    if (fetchHymnError) throw fetchHymnError;

    idInput.value = hymn.id;
    titleInput.value = hymn.title || "";
    keyInput.value = hymn.hymn_key || "";
    versionInput.value = hymn.version_name || "";
    accessSelect.value = hymn.access_level || "public";

    const { data: voiceLinks, error: fetchLinksError } = await supabase
      .from("hymn_voice")
      .select("*")
      .eq("hymn_id", hymnId);

    if (fetchLinksError) throw fetchLinksError;

    container.innerHTML = cachedVoicesCatalog.map(voice => {
      const vId = voice.id;
      const name = voice.voice_name;
      const link = voiceLinks ? voiceLinks.find(l => l.voice_id === vId) : null;
      
      const hasAudio = !!link?.audio_url;
      const hasPdf = !!link?.pdf_url;

      return `
        <div style="background: #f8fafc; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; display:flex; flex-direction:column; gap:0.25rem;">
          <span style="font-weight: 600; font-size: 0.85rem; color: #1e293b;">${name}</span>
          
          <div class="file-upload-row">
            <!-- Audio MP3 -->
            <div class="file-upload-col">
              <label class="file-upload-btn ${hasAudio ? 'file-selected' : ''}" for="edit-audio-voice-${vId}" title="Reemplazar o subir audio">
                <span>🎵 ${hasAudio ? '✓' : '+'}</span>
              </label>
              <input type="file" id="edit-audio-voice-${vId}" class="edit-voice-audio-input hidden" data-voice="${vId}" accept="audio/mpeg,audio/mp3">
              <span class="file-name-text" id="name-edit-audio-voice-${vId}">
                ${hasAudio ? '<span style="color:#10b981; font-weight:600;">Subido</span>' : 'Sin archivo'}
              </span>
              ${hasAudio ? `<button type="button" class="btn btn-ghost btn-sm btn-delete-file" data-hymn="${hymnId}" data-voice="${vId}" data-type="audio" style="padding:0.1rem 0.3rem; margin-top:0.25rem; font-size:0.7rem; border-color:#fee2e2; color:#ef4444; background:#fef2f2;">Eliminar</button>` : ''}
            </div>

            <!-- Partitura PDF -->
            <div class="file-upload-col">
              <label class="file-upload-btn ${hasPdf ? 'file-selected' : ''}" for="edit-pdf-voice-${vId}" title="Reemplazar o subir partitura">
                <span>📄 ${hasPdf ? '✓' : '+'}</span>
              </label>
              <input type="file" id="edit-pdf-voice-${vId}" class="edit-voice-pdf-input hidden" data-voice="${vId}" accept="application/pdf">
              <span class="file-name-text" id="name-edit-pdf-voice-${vId}">
                ${hasPdf ? '<span style="color:#10b981; font-weight:600;">Subido</span>' : 'Sin archivo'}
              </span>
              ${hasPdf ? `<button type="button" class="btn btn-ghost btn-sm btn-delete-file" data-hymn="${hymnId}" data-voice="${vId}" data-type="pdf" style="padding:0.1rem 0.3rem; margin-top:0.25rem; font-size:0.7rem; border-color:#fee2e2; color:#ef4444; background:#fef2f2;">Eliminar</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    setupFileChangeDelegators();

    container.querySelectorAll(".btn-delete-file").forEach(btn => {
      btn.addEventListener("click", handleDeleteHymnFile);
    });

  } catch (err) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:red; padding:1rem;">Error: ${err.message}</p>`;
  }
}

async function handleDeleteHymnFile(e) {
  const btn = e.currentTarget;
  const hymnId = btn.getAttribute("data-hymn");
  const voiceId = parseInt(btn.getAttribute("data-voice"));
  const fileType = btn.getAttribute("data-type");

  if (!confirm(`¿Estás seguro de eliminar el archivo de ${fileType === 'audio' ? 'audio (MP3)' : 'partitura (PDF)'} de esta voz?`)) return;

  btn.disabled = true;
  btn.textContent = "Eliminando...";

  try {
    const { data: link, error: linkError } = await supabase
      .from("hymn_voice")
      .select("id, audio_url, pdf_url")
      .eq("hymn_id", hymnId)
      .eq("voice_id", voiceId)
      .single();

    if (linkError) throw linkError;

    const storagePath = fileType === 'audio' ? link.audio_url : link.pdf_url;

    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from("hymns")
        .remove([storagePath]);

      if (storageError) console.warn("Error eliminando de storage:", storageError.message);
    }

    const payload = {};
    if (fileType === 'audio') payload.audio_url = null;
    else payload.pdf_url = null;

    const { error: updateError } = await supabase
      .from("hymn_voice")
      .update(payload)
      .eq("id", link.id);

    if (updateError) throw updateError;

    const { data: updatedLink } = await supabase
      .from("hymn_voice")
      .select("audio_url, pdf_url")
      .eq("id", link.id)
      .single();

    if (updatedLink && !updatedLink.audio_url && !updatedLink.pdf_url) {
      await supabase.from("hymn_voice").delete().eq("id", link.id);
    }

    const mockEvent = { currentTarget: { getAttribute: (attr) => attr === 'data-id' ? hymnId : null } };
    await openEditHymnModal(mockEvent);
    await loadHymns();

  } catch (err) {
    alert("Error al eliminar archivo: " + err.message);
    btn.disabled = false;
    btn.textContent = `Eliminar`;
  }
}

async function handleUpdateHymn(e) {
  e.preventDefault();
  const hymnId = document.getElementById("edit-hymn-id").value;
  const title = document.getElementById("edit-hymn-title").value.trim();
  const key = document.getElementById("edit-hymn-key").value.trim();
  const version = document.getElementById("edit-hymn-version").value.trim();
  const access = document.getElementById("edit-hymn-access").value;
  
  const submitBtn = document.getElementById("btn-edit-hymn-submit");
  const statusEl = document.getElementById("edit-hymn-status");
  const btnText = submitBtn.querySelector(".btn-text");
  const spinner = submitBtn.querySelector(".spinner");

  if (!title) return;

  submitBtn.disabled = true;
  if (btnText) btnText.textContent = "Guardando...";
  if (spinner) spinner.classList.remove("hidden");
  statusEl.textContent = "Guardando metadatos...";

  try {
    const { error: updateError } = await supabase
      .from("hymns")
      .update({
        title: title,
        hymn_key: key || null,
        version_name: version || null,
        access_level: access
      })
      .eq("id", hymnId);

    if (updateError) throw updateError;

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
        statusEl.textContent = `Subiendo archivos (${idx}/${uploads.length}): ${voiceName}...`;

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
            hymn_id: parseInt(hymnId),
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

    cerrarEditHymnModal();
    await loadHymns();

  } catch (err) {
    alert("Error al actualizar himno: " + err.message);
    statusEl.textContent = "Error al guardar.";
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = "Guardar Cambios";
    if (spinner) spinner.classList.add("hidden");
  }
}

function cerrarEditHymnModal() {
  document.getElementById("edit-hymn-modal").classList.add("hidden");
  document.getElementById("edit-hymn-form").reset();
  document.getElementById("edit-hymn-status").textContent = "";
}

// ---- Helpers ---- //

function getVoiceNameById(id) {
  const found = cachedVoicesCatalog.find(v => v.id === id);
  if (found) {
    return found.voice_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  return `voz_${id}`;
}

function getVoiceDisplayName(id) {
  const found = cachedVoicesCatalog.find(v => v.id === id);
  return found ? found.voice_name : "Desconocida";
}
