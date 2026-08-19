import supabase from "../../config/supabase.js";
import { showToast } from "../components/toast.js";

let perfilesRegistrados = [];
let currentUserSession = null;
let currentUserRole = null;

function parseMemberError(err) {
  if (!err) return { message: "Ocurrió un error inesperado.", type: "error", title: "Error" };
  const msg = err.message || err.toString() || "";
  const code = err.code || "";

  if (code === "23505" || msg.includes("group_members_pkey") || msg.includes("duplicate key") || msg.includes("unique constraint")) {
    return {
      message: "Este usuario ya pertenece a este grupo coral.",
      type: "warning",
      title: "Integrante ya en el grupo"
    };
  }

  return {
    message: `Error al añadir miembro: ${msg}`,
    type: "error",
    title: "Error al añadir"
  };
}

async function loadProfilesForDatalist(role) {
  const datalist = document.getElementById("registered-emails-list");
  if (!datalist) return;

  // Solo administradores pueden ver todos los correos para autocompletado
  if (role !== 'admin') {
    datalist.innerHTML = "";
    return;
  }

  const { data, error } = await supabase.from('profiles').select('id, email');
  if (!error && data) {
    perfilesRegistrados = data;
    datalist.innerHTML = data.map(p => `<option value="${p.email}">`).join('');
  }
}

async function openMembersModal(groupId, groupName, canManageGroup) {
  let modalOverlay = document.getElementById("members-modal-overlay");
  if (modalOverlay) modalOverlay.remove();

  modalOverlay = document.createElement("div");
  modalOverlay.id = "members-modal-overlay";
  modalOverlay.className = "members-modal-overlay fade-in";
  modalOverlay.innerHTML = `
    <div class="members-modal-card">
      <div class="members-modal-header">
        <h3 class="members-modal-title">👥 Integrantes de ${groupName}</h3>
        <button class="members-modal-close" aria-label="Cerrar">&times;</button>
      </div>
      <div class="members-modal-body">
        <input type="text" class="members-search-input" placeholder="🔍 Buscar integrante por correo..." style="display: none;">
        <div class="members-modal-list">
          <p class="loading-message" style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1rem 0;">Cargando miembros...</p>
        </div>
      </div>
      <div class="members-modal-footer">
        <button class="btn btn-ghost btn-close-modal-footer" style="padding: 0.4rem 1rem;">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  const closeModal = () => {
    modalOverlay.remove();
  };

  modalOverlay.querySelector(".members-modal-close").addEventListener("click", closeModal);
  modalOverlay.querySelector(".btn-close-modal-footer").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  await renderMembersListInModal(groupId, groupName, canManageGroup, modalOverlay);
}

async function renderMembersListInModal(groupId, groupName, canManageGroup, modalOverlay) {
  const listContainer = modalOverlay.querySelector(".members-modal-list");
  const searchInput = modalOverlay.querySelector(".members-search-input");
  if (!listContainer) return;

  const { data: membersData, error } = await supabase
    .from('group_members')
    .select('user_id, added_at')
    .eq('group_id', groupId);

  if (error) {
    listContainer.innerHTML = `<p style="color: red; font-size: 0.85rem; text-align: center;">Error al obtener miembros: ${error.message}</p>`;
    return;
  }

  const rawMembers = membersData || [];
  if (rawMembers.length === 0) {
    listContainer.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1rem 0;">No hay integrantes registrados en este grupo.</p>`;
    if (searchInput) searchInput.style.display = "none";
    return;
  }

  const membersList = [];
  for (const m of rawMembers) {
    let email = "Usuario oculto";
    try {
      const { data: emailData } = await supabase.rpc('get_email_by_profile_id', { user_id_param: m.user_id });
      if (emailData) email = emailData;
    } catch(e) {}
    membersList.push({ userId: m.user_id, email, addedAt: m.added_at });
  }

  // Ordenar alfabéticamente por correo
  membersList.sort((a, b) => a.email.localeCompare(b.email, 'es', { sensitivity: 'base' }));

  if (membersList.length > 5 && searchInput) {
    searchInput.style.display = "block";
  }

  const renderList = (filterText = '') => {
    const filtered = membersList.filter(m => m.email.toLowerCase().includes(filterText.toLowerCase()));
    if (filtered.length === 0) {
      listContainer.innerHTML = `<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 1rem 0;">No se encontraron coincidencias.</p>`;
      return;
    }

    listContainer.innerHTML = filtered.map(m => `
      <div class="members-modal-item">
        <span>✉️ ${m.email}</span>
        ${canManageGroup ? `<button class="btn-icon btn-remove-modal-member" data-group="${groupId}" data-user="${m.userId}" data-email="${m.email}" title="Eliminar miembro">🗑️</button>` : ''}
      </div>
    `).join('');

    listContainer.querySelectorAll(".btn-remove-modal-member").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const uId = e.currentTarget.getAttribute("data-user");
        const gId = e.currentTarget.getAttribute("data-group");
        const uEmail = e.currentTarget.getAttribute("data-email");

        if (!confirm(`¿Deseas eliminar a ${uEmail} de este grupo?`)) return;

        e.currentTarget.disabled = true;
        try {
          const { error: delErr } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', gId)
            .eq('user_id', uId);

          if (delErr) throw delErr;

          showToast(`Se eliminó a ${uEmail} del grupo.`, "info", "Miembro Eliminado");
          await renderMembersListInModal(groupId, groupName, canManageGroup, modalOverlay);
          await loadGroups();
        } catch(err) {
          showToast("Error al eliminar miembro: " + err.message, "error", "Error");
          e.currentTarget.disabled = false;
        }
      });
    });
  };

  renderList();

  if (searchInput) {
    searchInput.oninput = (e) => {
      renderList(e.target.value.trim());
    };
  }
}

async function loadGroups() {
  const listContainer = document.getElementById("groups-list");
  if (!listContainer) return;

  listContainer.innerHTML = '<p class="loading-message">Cargando grupos...</p>';

  // Fetch grupos ordenados alfabéticamente por group_name
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('*')
    .order('group_name', { ascending: true });

  if (groupsError) {
    listContainer.innerHTML = `<p style="color:red;">Error cargando grupos: ${groupsError.message}</p>`;
    return;
  }

  if (!groups || groups.length === 0) {
    listContainer.innerHTML = `<p>No tienes ningún grupo creado aún.</p>`;
    return;
  }

  // Render groups
  let html = '';
  for (const group of groups) {
    const isOwner = currentUserSession && currentUserSession.user && (group.created_by === currentUserSession.user.id);
    const isAdmin = (currentUserRole === 'admin');
    const canManageGroup = isOwner || isAdmin;

    // Obtener el correo del creador del grupo
    let creatorEmail = "Desconocido";
    try {
      const { data: creatorEmailData } = await supabase.rpc('get_email_by_profile_id', { user_id_param: group.created_by });
      if (creatorEmailData) creatorEmail = creatorEmailData;
    } catch(e) {}

    // Contar miembros del grupo
    const { data: membersData } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id);

    const membersCount = (membersData || []).length;

    const actionButtons = canManageGroup ? `
      <div class="group-header-actions">
        <button class="btn-icon btn-edit-group" data-group="${group.id}" data-name="${group.group_name}" title="Renombrar grupo">✏️</button>
        <button class="btn-icon btn-delete-group" data-group="${group.id}" title="Eliminar grupo">🗑️</button>
      </div>
    ` : `
      <div class="group-header-actions">
        <span class="badge" style="background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; font-size: 0.7rem; font-weight: 500; white-space: nowrap;">Integrante</span>
      </div>
    `;

    const addMemberForm = canManageGroup ? `
      <form class="add-member-form form-compact" data-group="${group.id}">
        <input type="email" class="search-input member-email-input" list="registered-emails-list" placeholder="Añadir miembro por correo exacto..." required style="margin-bottom: 0.5rem; width: 100%;">
        <button type="submit" class="btn btn-secondary btn-sm w-full">Añadir Integrante</button>
      </form>
    ` : `
      <p style="font-size: 0.75rem; color: #64748b; text-align: center; margin: 0.5rem 0 0; font-style: italic;">Perteneces a este grupo (Solo lectura).</p>
    `;

    html += `
      <div class="group-card">
        <div class="group-header">
          <div class="group-header-info">
            <h4 class="group-title">${group.group_name}</h4>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0.2rem 0 0; word-break: break-all;">Creado por: ${creatorEmail}</p>
          </div>
          ${actionButtons}
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.25rem;">
          <button type="button" class="btn btn-ghost btn-sm btn-open-members-modal w-full" data-group="${group.id}" data-name="${group.group_name}" data-can-manage="${canManageGroup}">
            👥 Ver Integrantes (${membersCount})
          </button>

          ${addMemberForm}
        </div>
      </div>
    `;
  }

  listContainer.innerHTML = html;

  // Add Listeners
  document.querySelectorAll(".btn-open-members-modal").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const gId = e.currentTarget.getAttribute("data-group");
      const gName = e.currentTarget.getAttribute("data-name");
      const canManage = e.currentTarget.getAttribute("data-can-manage") === "true";
      openMembersModal(gId, gName, canManage);
    });
  });

  document.querySelectorAll(".add-member-form").forEach(form => {
    form.addEventListener("submit", handleAddMember);
  });

  document.querySelectorAll(".btn-edit-group").forEach(btn => {
    btn.addEventListener("click", handleEditGroup);
  });

  document.querySelectorAll(".btn-delete-group").forEach(btn => {
    btn.addEventListener("click", handleDeleteGroup);
  });
}

async function handleCreateGroup(e) {
  e.preventDefault();
  const nameInput = document.getElementById("group-name");
  const groupName = nameInput.value.trim();
  const btn = e.target.querySelector("button");

  if (!groupName) return;

  btn.disabled = true;
  btn.textContent = "Creando...";

  try {
    const { error } = await supabase
      .from('groups')
      .insert([{ 
        group_name: groupName, 
        created_by: currentUserSession.user.id 
      }]);

    if (error) throw error;
    
    showToast(`Grupo "${groupName}" creado exitosamente.`, "success", "Grupo Creado");
    nameInput.value = '';
    await loadGroups();
  } catch (err) {
    showToast("Error al crear grupo: " + err.message, "error", "Error al Crear Grupo");
  } finally {
    btn.disabled = false;
    btn.textContent = "Crear Grupo";
  }
}

async function handleAddMember(e) {
  e.preventDefault();
  const groupId = e.target.getAttribute("data-group");
  const emailInput = e.target.querySelector(".member-email-input");
  const email = emailInput.value.trim();
  const btn = e.target.querySelector("button");

  if (!email) return;

  btn.disabled = true;

  try {
    const { data: profileId, error: rpcError } = await supabase.rpc('get_profile_id_by_email', { email_param: email });
    
    if (rpcError || !profileId) {
      showToast("No se encontró ningún usuario con ese correo exacto registrado en la plataforma.", "warning", "Usuario no encontrado");
      btn.disabled = false;
      return;
    }

    const { error } = await supabase
      .from('group_members')
      .insert([{
        group_id: groupId,
        user_id: profileId,
        added_by: currentUserSession.user.id
      }]);

    if (error) throw error;

    showToast(`Integrante ${email} añadido al grupo.`, "success", "Miembro Añadido");
    emailInput.value = '';
    await loadGroups();
  } catch (err) {
    const parsed = parseMemberError(err);
    showToast(parsed.message, parsed.type, parsed.title);
  } finally {
    btn.disabled = false;
  }
}

async function handleEditGroup(e) {
  const groupId = e.currentTarget.getAttribute("data-group");
  const currentName = e.currentTarget.getAttribute("data-name");
  
  const newName = prompt("Introduce el nuevo nombre para el grupo:", currentName);
  if (!newName || newName.trim() === "" || newName === currentName) return;

  e.currentTarget.disabled = true;
  try {
    const { error } = await supabase
      .from('groups')
      .update({ group_name: newName.trim() })
      .eq('id', groupId);

    if (error) throw error;
    showToast(`El grupo fue renombrado a "${newName.trim()}".`, "success", "Grupo Actualizado");
    await loadGroups();
  } catch (err) {
    showToast("Error al renombrar el grupo: " + err.message, "error", "Error");
    e.currentTarget.disabled = false;
  }
}

async function handleDeleteGroup(e) {
  const groupId = e.currentTarget.getAttribute("data-group");

  if (!confirm("¿Estás seguro de que deseas eliminar este grupo? Todos sus miembros serán eliminados de la lista.")) return;

  e.currentTarget.disabled = true;
  try {
    await supabase.from('group_members').delete().eq('group_id', groupId);

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
    showToast("Grupo eliminado correctamente.", "info", "Grupo Eliminado");
    await loadGroups();
  } catch (err) {
    showToast("Error al eliminar el grupo: " + err.message, "error", "Error");
    e.currentTarget.disabled = false;
  }
}

export async function initGruposAdmin(session, role) {
  if (role !== 'admin' && role !== 'special') {
    const container = document.getElementById("groups-list");
    if(container) container.innerHTML = `<p style="color: red;">Acceso denegado.</p>`;
    return;
  }

  currentUserSession = session;
  currentUserRole = role;

  const createForm = document.getElementById("create-group-form");
  if (createForm) {
    createForm.addEventListener("submit", handleCreateGroup);
  }

  await loadProfilesForDatalist(role);
  await loadGroups();
}
