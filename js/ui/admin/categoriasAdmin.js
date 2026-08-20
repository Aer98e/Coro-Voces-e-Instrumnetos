import supabase from "../../config/supabase.js";
import { showToast } from "../components/toast.js";

let currentUserSession = null;
let currentRole = null;
let activeCategoryId = null;
let activeCategoryName = "";

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

  // Configurar listeners de la sub-vista de vinculación
  document.getElementById("btn-back-to-categories")?.addEventListener("click", closeLinkHymnsView);

  const searchInput = document.getElementById("linking-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      if (activeCategoryId) {
        renderLinkingLists(activeCategoryId, e.target.value.trim());
      }
    });
  }

  // Pestañas móviles
  document.querySelectorAll(".linking-tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".linking-tab-btn").forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      const tab = e.currentTarget.getAttribute("data-tab");

      const colLinked = document.getElementById("col-linked-wrapper");
      const colAvailable = document.getElementById("col-available-wrapper");

      if (tab === "linked") {
        colLinked?.classList.add("active-mobile-col");
        colAvailable?.classList.remove("active-mobile-col");
      } else {
        colAvailable?.classList.add("active-mobile-col");
        colLinked?.classList.remove("active-mobile-col");
      }
    });
  });

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
  const gridContainer = document.getElementById("categories-grid");
  if (!gridContainer) return;

  gridContainer.innerHTML = '<p class="loading-message">Cargando categorías...</p>';

  // Obtener categorías ordenadas alfabéticamente
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*, groups(group_name)")
    .order("category_name", { ascending: true });

  if (error) {
    gridContainer.innerHTML = `<p style="color:red;">Error cargando categorías: ${error.message}</p>`;
    return;
  }

  if (!categories || categories.length === 0) {
    gridContainer.innerHTML = `<p>No hay categorías creadas aún.</p>`;
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

    const badgeType = isGlobal 
      ? `<span class="badge badge-global">Global</span>`
      : `<span class="badge badge-group">Grupo: ${asignedTo}</span>`;

    const actionButtons = `
      <div class="group-header-actions">
        ${canEdit ? `<button class="btn-icon btn-edit-cat" data-id="${cat.id}" data-name="${cat.category_name}" data-group="${cat.group_id || ''}" title="Editar Categoría">✏️</button>` : ''}
        ${canDelete ? `<button class="btn-icon btn-delete-cat" data-id="${cat.id}" title="Eliminar Categoría">🗑️</button>` : ''}
      </div>
    `;

    html += `
      <div class="category-card">
        <div class="group-header">
          <div class="group-header-info">
            <h4 class="category-title">${cat.category_name}</h4>
            <div style="margin-top: 0.35rem;">
              ${badgeType}
            </div>
          </div>
          ${actionButtons}
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.25rem;">
          <p style="font-size: 0.85rem; color: #64748b; margin: 0; font-weight: 500;">
            🎵 <strong>${count}</strong> himno(s) vinculados
          </p>

          ${canManageLinks ? `
            <button type="button" class="btn btn-secondary btn-sm btn-link-hymns w-full" data-id="${cat.id}" data-name="${cat.category_name}">
              🔗 Gestionar Himnos (${count})
            </button>
          ` : `
            <p style="font-size: 0.75rem; color: #94a3b8; margin: 0; font-style: italic;">🔒 Solo lectura</p>
          `}
        </div>
      </div>
    `;
  }

  gridContainer.innerHTML = html || '<p style="color: #64748b;">No hay categorías visibles para ti.</p>';

  // Registrar eventos
  document.querySelectorAll(".btn-delete-cat").forEach(btn => {
    btn.addEventListener("click", handleDeleteCategory);
  });

  document.querySelectorAll(".btn-link-hymns").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      const name = e.currentTarget.getAttribute("data-name");
      openLinkHymnsView(id, name);
    });
  });

  document.querySelectorAll(".btn-edit-cat").forEach(btn => {
    btn.addEventListener("click", openEditCategoryModal);
  });
}

// ---- Sub-vista Dedicada para Vincular Himnos en 2 Columnas ---- //

function openLinkHymnsView(categoryId, categoryName) {
  activeCategoryId = categoryId;
  activeCategoryName = categoryName;

  document.getElementById("categories-main-view")?.classList.add("hidden");
  
  const subview = document.getElementById("link-hymns-subview");
  if (subview) subview.classList.remove("hidden");

  const titleEl = document.getElementById("linking-category-title");
  if (titleEl) titleEl.textContent = `Gestionar Himnos: ${categoryName}`;

  const searchInput = document.getElementById("linking-search-input");
  if (searchInput) searchInput.value = "";

  // Activar primera columna en móviles
  const colLinked = document.getElementById("col-linked-wrapper");
  const colAvailable = document.getElementById("col-available-wrapper");
  if (colLinked) colLinked.classList.add("active-mobile-col");
  if (colAvailable) colAvailable.classList.remove("active-mobile-col");

  document.querySelectorAll(".linking-tab-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-tab") === "linked");
  });

  renderLinkingLists(categoryId);
}

function closeLinkHymnsView() {
  activeCategoryId = null;
  activeCategoryName = "";

  document.getElementById("link-hymns-subview")?.classList.add("hidden");
  document.getElementById("categories-main-view")?.classList.remove("hidden");

  loadCategories();
}

async function renderLinkingLists(categoryId, query = "") {
  const linkedListContainer = document.getElementById("linked-hymns-list");
  const availableListContainer = document.getElementById("available-hymns-list");
  const badgeLinked = document.getElementById("badge-count-linked");
  const badgeAvailable = document.getElementById("badge-count-available");
  const mobileLinkedCount = document.getElementById("mobile-count-linked");
  const mobileAvailableCount = document.getElementById("mobile-count-available");

  if (linkedListContainer) linkedListContainer.innerHTML = '<p class="loading-message">Cargando vinculados...</p>';
  if (availableListContainer) availableListContainer.innerHTML = '<p class="loading-message">Cargando disponibles...</p>';

  try {
    // 1. Obtener todos los himnos disponibles en la plataforma
    const { data: hymnsData, error: hymnsErr } = await supabase
      .from("hymns")
      .select("id, title, access_level");

    if (hymnsErr) throw hymnsErr;
    const allHymns = hymnsData || [];

    // 2. Obtener IDs de himnos vinculados a esta categoría
    const { data: linkedData, error: linkedErr } = await supabase
      .from("hymn_category")
      .select("hymn_id")
      .eq("category_id", categoryId);

    if (linkedErr) throw linkedErr;

    const linkedIdsSet = new Set((linkedData || []).map(l => l.hymn_id));

    // Separar en 2 arreglos
    let linkedHymns = allHymns.filter(h => linkedIdsSet.has(h.id));
    let availableHymns = allHymns.filter(h => !linkedIdsSet.has(h.id));

    // ORDENAR ALFABÉTICAMENTE por título
    linkedHymns.sort((a, b) => normalizarTexto(a.title).localeCompare(normalizarTexto(b.title), 'es', { sensitivity: 'base' }));
    availableHymns.sort((a, b) => normalizarTexto(a.title).localeCompare(normalizarTexto(b.title), 'es', { sensitivity: 'base' }));

    // Filtrar por búsqueda si existe query
    const normQuery = normalizarTexto(query);
    if (normQuery !== "") {
      linkedHymns = linkedHymns.filter(h => normalizarTexto(h.title).includes(normQuery));
      availableHymns = availableHymns.filter(h => normalizarTexto(h.title).includes(normQuery));
    }

    // Actualizar contadores
    if (badgeLinked) badgeLinked.textContent = `${linkedHymns.length} Himnos`;
    if (badgeAvailable) badgeAvailable.textContent = `${availableHymns.length} Himnos`;
    if (mobileLinkedCount) mobileLinkedCount.textContent = linkedHymns.length;
    if (mobileAvailableCount) mobileAvailableCount.textContent = availableHymns.length;

    // Renderizar Columna Vinculados
    if (linkedListContainer) {
      if (linkedHymns.length === 0) {
        linkedListContainer.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1.5rem 0;">No hay himnos vinculados ${normQuery ? 'que coincidan' : 'aún'}.</p>`;
      } else {
        linkedListContainer.innerHTML = linkedHymns.map(h => {
          const badgeText = h.access_level === 'private' ? 'Privado' : (h.access_level === 'hidden' ? 'Oculto' : 'Público');
          const badgeClass = h.access_level === 'private' ? 'badge-voice' : (h.access_level === 'hidden' ? 'badge-group' : 'badge-category');
          return `
            <div class="hymn-linking-item">
              <div class="hymn-linking-info">
                <span class="hymn-linking-title" title="${h.title}">${h.title}</span>
                <span class="badge ${badgeClass}" style="font-size: 0.65rem; width: fit-content;">${badgeText}</span>
              </div>
              <button type="button" class="btn-action-icon btn-action-remove btn-unlink-hymn" data-id="${h.id}" data-title="${h.title}" title="Desvincular de esta categoría">
                ✖
              </button>
            </div>
          `;
        }).join('');
      }
    }

    // Renderizar Columna Disponibles
    if (availableListContainer) {
      if (availableHymns.length === 0) {
        availableListContainer.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1.5rem 0;">No hay más himnos disponibles ${normQuery ? 'que coincidan' : 'para agregar'}.</p>`;
      } else {
        availableListContainer.innerHTML = availableHymns.map(h => {
          const badgeText = h.access_level === 'private' ? 'Privado' : (h.access_level === 'hidden' ? 'Oculto' : 'Público');
          const badgeClass = h.access_level === 'private' ? 'badge-voice' : (h.access_level === 'hidden' ? 'badge-group' : 'badge-category');
          return `
            <div class="hymn-linking-item">
              <div class="hymn-linking-info">
                <span class="hymn-linking-title" title="${h.title}">${h.title}</span>
                <span class="badge ${badgeClass}" style="font-size: 0.65rem; width: fit-content;">${badgeText}</span>
              </div>
              <button type="button" class="btn-action-icon btn-action-add btn-link-hymn" data-id="${h.id}" data-title="${h.title}" title="Agregar a esta categoría">
                ➕
              </button>
            </div>
          `;
        }).join('');
      }
    }

    // Registrar Eventos de Acción Instantánea
    document.querySelectorAll(".btn-link-hymn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const buttonEl = e.currentTarget;
        if (!buttonEl) return;
        const hId = parseInt(buttonEl.getAttribute("data-id"));
        const hTitle = buttonEl.getAttribute("data-title");
        buttonEl.disabled = true;

        try {
          const { error: insErr } = await supabase
            .from("hymn_category")
            .insert([{ hymn_id: hId, category_id: parseInt(categoryId) }]);

          if (insErr) throw insErr;

          showToast(`Se vinculó "${hTitle}" a la categoría.`, "success", "Himno Vinculado");
          await renderLinkingLists(categoryId, query);
        } catch(err) {
          const isRlsError = err.code === "42501" || (err.message && (err.message.toLowerCase().includes("row-level security") || err.message.toLowerCase().includes("policy")));
          if (isRlsError) {
            showToast(
              `Este himno es privado. Para vincularlo a tu grupo, un administrador debe otorgarte permiso explícito.`,
              "warning",
              "Acceso Restringido 🔒"
            );
          } else {
            showToast(`No se pudo vincular "${hTitle}": ${err.message || "Error de permisos"}`, "error", "Error");
          }
          if (buttonEl) buttonEl.disabled = false;
        }
      });
    });

    document.querySelectorAll(".btn-unlink-hymn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const buttonEl = e.currentTarget;
        if (!buttonEl) return;
        const hId = parseInt(buttonEl.getAttribute("data-id"));
        const hTitle = buttonEl.getAttribute("data-title");
        buttonEl.disabled = true;

        try {
          const { error: delErr } = await supabase
            .from("hymn_category")
            .delete()
            .eq("category_id", categoryId)
            .eq("hymn_id", hId);

          if (delErr) throw delErr;

          showToast(`Se desvinculó "${hTitle}" de la categoría.`, "info", "Himno Desvinculado");
          await renderLinkingLists(categoryId, query);
        } catch(err) {
          const isRlsError = err.code === "42501" || (err.message && (err.message.toLowerCase().includes("row-level security") || err.message.toLowerCase().includes("policy")));
          if (isRlsError) {
            showToast(
              `No puedes desvincular este himno privado. Solo un administrador tienen permiso para hacerlo.`,
              "warning",
              "Acceso Restringido 🔒"
            );
          } else {
            showToast(`No se pudo desvincular "${hTitle}": ${err.message || "Error de permisos"}`, "error", "Error");
          }
          if (buttonEl) buttonEl.disabled = false;
        }
      });
    });

  } catch (err) {
    if (linkedListContainer) linkedListContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    if (availableListContainer) availableListContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

// ---- Funciones CRUD de Categoría ---- //

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
        showToast("Debes seleccionar un grupo para crear la categoría.", "warning", "Grupo Requerido");
        btn.disabled = false;
        return;
      }
      payload.type = 'group';
      payload.group_id = parseInt(groupId);
    }

    const { error } = await supabase.from('categories').insert([payload]);
    if (error) throw error;

    showToast(`Categoría "${name}" creada exitosamente.`, "success", "Categoría Creada");
    nameInput.value = '';
    if (currentRole === 'special') {
      groupSelect.selectedIndex = 0;
    } else {
      groupSelect.value = '';
    }
    await loadCategories();
  } catch (error) {
    showToast("Error al crear categoría: " + error.message, "error", "Error");
  } finally {
    btn.disabled = false;
  }
}

async function handleDeleteCategory(e) {
  const catId = e.currentTarget.getAttribute("data-id");
  if (!confirm("¿Eliminar esta categoría permanentemente? Todos sus himnos serán desvinculados automáticamente.")) return;

  e.currentTarget.disabled = true;
  try {
    // 1. Eliminar vínculos de hymn_category primero
    await supabase
      .from('hymn_category')
      .delete()
      .eq('category_id', catId);

    // 2. Eliminar la categoría
    const { error } = await supabase.from('categories').delete().eq('id', catId);
    if (error) throw error;
    
    showToast("Categoría eliminada correctamente.", "info", "Categoría Eliminada");
    await loadCategories();
  } catch (err) {
    showToast("Error al eliminar la categoría: " + err.message, "error", "Error");
    e.currentTarget.disabled = false;
  }
}

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

    showToast(`Categoría actualizada a "${name}".`, "success", "Categoría Actualizada");
    cerrarModalEdicion();
    await loadCategories();
  } catch (err) {
    showToast("Error al actualizar la categoría: " + err.message, "error", "Error");
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = "Guardar Cambios";
    if (spinner) spinner.classList.add("hidden");
  }
}

// ---- Helpers ---- //

function normalizarTexto(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!«»"'\(\)\[\]\.,_\-]/g, "")
    .trim();
}
