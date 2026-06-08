import supabase from "../../config/supabase.js";

let currentUserSession = null;
let currentRole = null;
let currentCategoryId = null;

// Estados para vinculación en bloque
let allHymns = [];
let initiallyLinkedHymnIds = new Set();
let currentLinkedHymnIds = new Set();

// Cache de grupos
let allGroups = [];

export async function initCategoriasAdmin(session, role) {
  currentUserSession = session;
  currentRole = role;

  if (role !== 'admin' && role !== 'special') {
    const container = document.getElementById("tab-categorias");
    if(container) container.innerHTML = `<p style="color: red;">Acceso denegado.</p>`;
    return;
  }

  // Configurar select de grupos para creación
  const groupLabel = document.getElementById("category-group-label");
  const groupSelect = document.getElementById("category-group-select");
  
  if (role === 'special') {
    if (groupLabel) groupLabel.textContent = "Vincular al Grupo (Requerido)";
    if (groupSelect) groupSelect.required = true;
    
    const { data: groups } = await supabase
      .from("groups")
      .select("id, group_name")
      .eq("created_by", session.user.id);
      
    if (groups && groups.length > 0) {
      allGroups = groups;
      groupSelect.innerHTML = `<option value="" disabled selected>Selecciona tu grupo...</option>` +
        groups.map(g => `<option value="${g.id}">${g.group_name}</option>`).join('');
    } else {
      groupSelect.innerHTML = `<option value="" disabled selected>No tienes grupos creados</option>`;
    }
  } else {
    // Admin
    if (groupLabel) groupLabel.textContent = "Vincular al Grupo (Opcional)";
    if (groupSelect) groupSelect.required = false;
    
    const { data: groups } = await supabase
      .from("groups")
      .select("id, group_name")
      .order("group_name");
      
    if (groups && groups.length > 0) {
      allGroups = groups;
      groupSelect.innerHTML = `<option value="" selected>Categoría Global (Ningún grupo)</option>` +
        groups.map(g => `<option value="${g.id}">${g.group_name}</option>`).join('');
    } else {
      groupSelect.innerHTML = `<option value="" selected>Categoría Global (Ningún grupo)</option>`;
    }
  }

  const createForm = document.getElementById("create-category-form");
  if (createForm) {
    createForm.addEventListener("submit", handleCreateCategory);
  }

  // Configurar modal de vincular himnos
  document.getElementById("btn-link-hymns-close")?.addEventListener("click", cerrarModalVinculacion);
  document.getElementById("btn-link-hymns-cancel")?.addEventListener("click", cerrarModalVinculacion);
  document.getElementById("btn-link-hymns-save")?.addEventListener("click", handleSaveLinkedHymns);
  document.getElementById("btn-select-all-hymns")?.addEventListener("click", selectAllHymns);
  document.getElementById("btn-deselect-all-hymns")?.addEventListener("click", deselectAllHymns);

  const searchInput = document.getElementById("search-hymn-input");
  if (searchInput) {
    searchInput.addEventListener("input", handleFilterHymns);
  }

  // Configurar modal de edición
  document.getElementById("btn-edit-category-close")?.addEventListener("click", cerrarModalEdicion);
  document.getElementById("btn-edit-category-cancel")?.addEventListener("click", cerrarModalEdicion);
  
  const editForm = document.getElementById("edit-category-form");
  if (editForm) {
    editForm.addEventListener("submit", handleUpdateCategory);
  }

  await loadCategories();
}

async function loadCategories() {
  const tbody = document.getElementById("categories-table-body");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando categorías...</td></tr>';

  // Obtener categorías con el nombre de sus grupos
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*, groups(group_name)")
    .order("category_name", { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${error.message}</td></tr>`;
    return;
  }

  if (!categories || categories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay categorías creadas.</td></tr>`;
    return;
  }

  // Obtener conteo de himnos vinculados por categoría
  const { data: links } = await supabase
    .from("hymn_category")
    .select("category_id");
  
  const linkCounts = {};
  if (links) {
    links.forEach(l => {
      linkCounts[l.category_id] = (linkCounts[l.category_id] || 0) + 1;
    });
  }

  let html = '';
  for (const cat of categories) {
    // Permisos: Admin puede todo. Special puede ver globales y gestionar las suyas.
    if (currentRole === 'special' && cat.type === 'group' && cat.created_by !== currentUserSession.user.id) {
      continue;
    }

    const canDelete = currentRole === 'admin' || (currentRole === 'special' && cat.created_by === currentUserSession.user.id && cat.type === 'group');
    const canEdit = canDelete;
    const canManageLinks = canDelete || currentRole === 'admin';

    const count = linkCounts[cat.id] || 0;
    const isGlobal = cat.type === 'global';
    const asignedTo = isGlobal ? 'Global' : (cat.groups?.group_name || 'Desconocido');
    
    let actionsHtml = '';
    if (canManageLinks) {
      actionsHtml += `<button class="btn-icon btn-link-hymns" data-id="${cat.id}" data-name="${cat.category_name}" title="Vincular Himnos" style="font-size: 1.1rem; margin-right: 0.75rem;">🔗</button>`;
    }
    if (canEdit) {
      actionsHtml += `<button class="btn-icon btn-edit-cat" data-id="${cat.id}" data-name="${cat.category_name}" data-group="${cat.group_id || ''}" title="Editar Categoría" style="font-size: 1.1rem; margin-right: 0.75rem;">✏️</button>`;
    }
    if (canDelete) {
      actionsHtml += `<button class="btn-icon btn-delete-cat" data-id="${cat.id}" title="Eliminar Categoría" style="font-size: 1.1rem;">🗑️</button>`;
    }
    if (!canManageLinks && !canEdit && !canDelete) {
      actionsHtml += `<span style="font-size: 0.8rem; color: #64748b;" title="Solo lectura">🔒 Solo lectura</span>`;
    }

    html += `
      <tr>
        <td style="font-weight: 600;">${cat.category_name}</td>
        <td><span class="badge ${isGlobal ? 'badge-global' : 'badge-role'}">${isGlobal ? 'Global' : 'Grupo'}</span></td>
        <td>${asignedTo}</td>
        <td>${count} himno(s)</td>
        <td>
          <div style="display:flex; align-items:center;">
            ${actionsHtml}
          </div>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;">No hay categorías visibles para ti.</td></tr>';

  // Registrar eventos
  document.querySelectorAll(".btn-delete-cat").forEach(btn => {
    btn.addEventListener("click", handleDeleteCategory);
  });

  document.querySelectorAll(".btn-link-hymns").forEach(btn => {
    btn.addEventListener("click", openLinkHymnsModal);
  });

  document.querySelectorAll(".btn-edit-cat").forEach(btn => {
    btn.addEventListener("click", openEditCategoryModal);
  });
}

async function handleCreateCategory(e) {
  e.preventDefault();
  const nameInput = document.getElementById("category-name");
  const groupSelect = document.getElementById("category-group-select");
  const btn = e.target.querySelector("button");

  const name = nameInput.value.trim();
  if (!name) return;

  btn.disabled = true;

  try {
    let payload = {
      category_name: name,
      created_by: currentUserSession.user.id
    };

    if (currentRole === 'admin') {
      const groupId = groupSelect.value;
      if (groupId) {
        payload.type = 'group';
        payload.group_id = parseInt(groupId);
      } else {
        payload.type = 'global';
        payload.group_id = null;
      }
    } else if (currentRole === 'special') {
      const groupId = groupSelect.value;
      if (!groupId) {
        alert("Debes seleccionar un grupo para crear la categoría.");
        btn.disabled = false;
        return;
      }
      payload.type = 'group';
      payload.group_id = parseInt(groupId);
    }

    const { error } = await supabase.from('categories').insert([payload]);
    if (error) throw error;

    nameInput.value = '';
    if (currentRole === 'special') {
      groupSelect.selectedIndex = 0;
    } else {
      groupSelect.value = '';
    }
    await loadCategories();
  } catch (error) {
    alert("Error al crear categoría: " + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function handleDeleteCategory(e) {
  const catId = e.currentTarget.getAttribute("data-id");
  if (!confirm("¿Eliminar esta categoría permanentemente? Todos sus himnos serán desvinculados automáticamente.")) return;

  e.currentTarget.disabled = true;
  try {
    // 1. Eliminar todos los vínculos de hymn_category primero para evitar error de FK
    await supabase
      .from('hymn_category')
      .delete()
      .eq('category_id', catId);

    // 2. Eliminar la categoría
    const { error } = await supabase.from('categories').delete().eq('id', catId);
    if (error) throw error;
    
    await loadCategories();
  } catch (err) {
    alert("Error al eliminar la categoría: " + err.message);
    e.currentTarget.disabled = false;
  }
}

// ---- Modal de Edición de Categorías ---- //

function openEditCategoryModal(e) {
  const catId = e.currentTarget.getAttribute("data-id");
  const catName = e.currentTarget.getAttribute("data-name");
  const catGroupId = e.currentTarget.getAttribute("data-group");

  document.getElementById("edit-category-id").value = catId;
  document.getElementById("edit-category-name").value = catName;

  const select = document.getElementById("edit-category-group-select");
  const label = document.getElementById("edit-category-group-label");

  if (currentRole === 'special') {
    label.textContent = "Vincular al Grupo (Requerido)";
    select.required = true;
    select.innerHTML = allGroups.map(g => `<option value="${g.id}">${g.group_name}</option>`).join('');
    select.value = catGroupId;
  } else {
    // Admin
    label.textContent = "Vincular al Grupo (Opcional)";
    select.required = false;
    select.innerHTML = `<option value="">Categoría Global (Ningún grupo)</option>` +
      allGroups.map(g => `<option value="${g.id}">${g.group_name}</option>`).join('');
    select.value = catGroupId || "";
  }

  document.getElementById("edit-category-modal").classList.remove("hidden");
}

function cerrarModalEdicion() {
  document.getElementById("edit-category-modal").classList.add("hidden");
  document.getElementById("edit-category-form").reset();
}

async function handleUpdateCategory(e) {
  e.preventDefault();
  const catId = document.getElementById("edit-category-id").value;
  const name = document.getElementById("edit-category-name").value.trim();
  const groupId = document.getElementById("edit-category-group-select").value;
  const submitBtn = document.getElementById("btn-edit-category-submit");
  const btnText = submitBtn.querySelector(".btn-text");
  const spinner = submitBtn.querySelector(".spinner");

  if (!name) return;

  submitBtn.disabled = true;
  if (btnText) btnText.textContent = "Guardando...";
  if (spinner) spinner.classList.remove("hidden");

  try {
    let payload = {
      category_name: name
    };

    if (currentRole === 'admin') {
      if (groupId) {
        payload.type = 'group';
        payload.group_id = parseInt(groupId);
      } else {
        payload.type = 'global';
        payload.group_id = null;
      }
    } else {
      // Special
      if (!groupId) {
        throw new Error("Debes seleccionar un grupo.");
      }
      payload.type = 'group';
      payload.group_id = parseInt(groupId);
    }

    const { error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', catId);

    if (error) throw error;

    cerrarModalEdicion();
    await loadCategories();
  } catch (err) {
    alert("Error al actualizar la categoría: " + err.message);
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = "Guardar Cambios";
    if (spinner) spinner.classList.add("hidden");
  }
}

// ---- Modal de Vinculación de Himnos (Selección Múltiple) ---- //

async function openLinkHymnsModal(e) {
  currentCategoryId = e.currentTarget.getAttribute("data-id");
  const catName = e.currentTarget.getAttribute("data-name");
  
  document.getElementById("link-hymns-subtitle").textContent = `Categoría: ${catName}`;
  document.getElementById("search-hymn-input").value = "";
  
  const checklistContainer = document.getElementById("hymns-checklist-container");
  const countInfo = document.getElementById("hymns-count-info");
  
  checklistContainer.innerHTML = "<p style='padding:1rem; text-align:center; color:#64748b;'>Cargando himnos...</p>";
  countInfo.textContent = "Cargando...";

  document.getElementById("link-hymns-modal").classList.remove("hidden");

  try {
    // 1. Fetch all hymns available
    const { data: hymnsData, error: hymnsError } = await supabase
      .from("hymns")
      .select("id, title, access_level")
      .order("title");

    if (hymnsError) throw hymnsError;
    allHymns = hymnsData || [];

    // 2. Fetch linked hymns for this category
    const { data: linkedData, error: linkedError } = await supabase
      .from("hymn_category")
      .select("hymn_id")
      .eq("category_id", currentCategoryId);

    if (linkedError) throw linkedError;

    initiallyLinkedHymnIds = new Set(linkedData ? linkedData.map(l => l.hymn_id) : []);
    currentLinkedHymnIds = new Set(initiallyLinkedHymnIds);

    // 3. Render
    renderHymnsChecklist();
    updateHymnsCountInfo();

  } catch (err) {
    checklistContainer.innerHTML = `<p style="color:red; padding:1rem;">Error: ${err.message}</p>`;
    countInfo.textContent = "Error al cargar.";
  }
}

function renderHymnsChecklist() {
  const container = document.getElementById("hymns-checklist-container");
  if (!container) return;

  if (allHymns.length === 0) {
    container.innerHTML = "<p style='padding:1rem; text-align:center; color:#64748b;'>No hay himnos registrados en el sistema.</p>";
    return;
  }

  container.innerHTML = allHymns.map(h => {
    const isChecked = currentLinkedHymnIds.has(h.id);
    const badgeText = h.access_level === 'private' ? 'Privado' : (h.access_level === 'hidden' ? 'Oculto' : 'Público');
    const badgeClass = h.access_level === 'private' ? 'badge-voice' : (h.access_level === 'hidden' ? 'badge-role' : 'badge-category');
    const normalizedTitle = normalizarTexto(h.title);

    return `
      <label class="hymn-checkbox-item" data-id="${h.id}" data-normalized="${normalizedTitle}">
        <input type="checkbox" class="hymn-checkbox-input" data-id="${h.id}" ${isChecked ? 'checked' : ''}>
        <span class="hymn-checkbox-label">${h.title}</span>
        <span class="badge ${badgeClass} hymn-checkbox-badge" style="color:initial;">${badgeText}</span>
      </label>
    `;
  }).join('');

  // Eventos de check
  container.querySelectorAll(".hymn-checkbox-input").forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = parseInt(e.target.getAttribute("data-id"));
      if (e.target.checked) {
        currentLinkedHymnIds.add(id);
      } else {
        currentLinkedHymnIds.delete(id);
      }
      updateHymnsCountInfo();
    });
  });
}

function updateHymnsCountInfo() {
  const info = document.getElementById("hymns-count-info");
  if (info) {
    info.textContent = `${currentLinkedHymnIds.size} de ${allHymns.length} himnos vinculados`;
  }
}

function selectAllHymns() {
  const visibleItems = document.querySelectorAll(".hymn-checkbox-item:not(.hidden)");
  visibleItems.forEach(item => {
    const cb = item.querySelector(".hymn-checkbox-input");
    if (cb && !cb.checked) {
      cb.checked = true;
      const id = parseInt(cb.getAttribute("data-id"));
      currentLinkedHymnIds.add(id);
    }
  });
  updateHymnsCountInfo();
}

function deselectAllHymns() {
  const visibleItems = document.querySelectorAll(".hymn-checkbox-item:not(.hidden)");
  visibleItems.forEach(item => {
    const cb = item.querySelector(".hymn-checkbox-input");
    if (cb && cb.checked) {
      cb.checked = false;
      const id = parseInt(cb.getAttribute("data-id"));
      currentLinkedHymnIds.delete(id);
    }
  });
  updateHymnsCountInfo();
}

function handleFilterHymns(e) {
  const query = normalizarTexto(e.target.value);
  const items = document.querySelectorAll(".hymn-checkbox-item");
  let matchCount = 0;
  
  items.forEach(item => {
    const normalizedTitle = item.getAttribute("data-normalized");
    if (query === "" || normalizedTitle.includes(query)) {
      item.classList.remove("hidden");
      item.style.display = "flex";
      matchCount++;
    } else {
      item.classList.add("hidden");
      item.style.display = "none";
    }
  });

  const info = document.getElementById("hymns-count-info");
  if (info) {
    if (query !== "") {
      info.textContent = `${matchCount} coincidentes (${currentLinkedHymnIds.size} marcados en total)`;
    } else {
      updateHymnsCountInfo();
    }
  }
}

async function handleSaveLinkedHymns() {
  const submitBtn = document.getElementById("btn-link-hymns-save");
  const btnText = submitBtn.querySelector(".btn-text");
  const spinner = submitBtn.querySelector(".spinner");

  submitBtn.disabled = true;
  if (btnText) btnText.textContent = "Guardando...";
  if (spinner) spinner.classList.remove("hidden");

  const added = [...currentLinkedHymnIds].filter(id => !initiallyLinkedHymnIds.has(id));
  const removed = [...initiallyLinkedHymnIds].filter(id => !currentLinkedHymnIds.has(id));

  try {
    // 1. Eliminar removidos
    if (removed.length > 0) {
      const { error: deleteError } = await supabase
        .from("hymn_category")
        .delete()
        .eq("category_id", currentCategoryId)
        .in("hymn_id", removed);
      
      if (deleteError) throw deleteError;
    }

    // 2. Insertar agregados
    if (added.length > 0) {
      const inserts = added.map(hymnId => ({
        hymn_id: hymnId,
        category_id: parseInt(currentCategoryId)
      }));

      const { error: insertError } = await supabase
        .from("hymn_category")
        .insert(inserts);

      if (insertError) throw insertError;
    }

    cerrarModalVinculacion();
    await loadCategories();
  } catch (err) {
    alert("Error al guardar vínculos: " + err.message);
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = "Guardar Cambios";
    if (spinner) spinner.classList.add("hidden");
  }
}

function cerrarModalVinculacion() {
  document.getElementById("link-hymns-modal").classList.add("hidden");
  allHymns = [];
  initiallyLinkedHymnIds = new Set();
  currentLinkedHymnIds = new Set();
  currentCategoryId = null;
}

// ---- Helpers ---- //

function normalizarTexto(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes
    .replace(/[¿?¡!«»"'\(\)\[\]\.,_\-]/g, "") // Remueve signos de puntuación y comas
    .trim();
}
