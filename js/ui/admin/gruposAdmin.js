import supabase from "../../config/supabase.js";

let perfilesRegistrados = [];
let currentUserSession = null;

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

async function loadGroups() {
  const listContainer = document.getElementById("groups-list");
  if (!listContainer) return;

  listContainer.innerHTML = '<p class="loading-message">Cargando grupos...</p>';

  // Fetch groups
  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('*')
    .order('id', { ascending: false });

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
    // Obtener el correo del creador del grupo
    let creatorEmail = "Desconocido";
    try {
      const { data: creatorEmailData } = await supabase.rpc('get_email_by_profile_id', { user_id_param: group.created_by });
      if (creatorEmailData) creatorEmail = creatorEmailData;
    } catch(e) {}

    // Fetch members for each group
    const { data: membersData } = await supabase
      .from('group_members')
      .select('user_id, added_at')
      .eq('group_id', group.id);

    const members = membersData || [];

    let membersHtml = '';
    if (members.length === 0) {
      membersHtml = `<p style="font-size: 0.85rem; color: #64748b;">No hay miembros en este grupo.</p>`;
    } else {
      // Obtener los correos de los miembros usando RPC para evitar bloqueos por RLS
      for (const m of members) {
        let memberEmail = "Usuario oculto";
        try {
          const { data: emailData } = await supabase.rpc('get_email_by_profile_id', { user_id_param: m.user_id });
          if (emailData) memberEmail = emailData;
        } catch(e) {}

        membersHtml += `
          <div class="member-row">
            <span>${memberEmail}</span>
            <button class="btn-icon btn-remove-member" data-group="${group.id}" data-user="${m.user_id}" title="Eliminar miembro">🗑️</button>
          </div>
        `;
      }
    }

    html += `
      <div class="group-card">
        <div class="group-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 class="group-title">${group.group_name}</h4>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0.2rem 0 0;">Creado por: ${creatorEmail}</p>
          </div>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn-icon btn-edit-group" data-group="${group.id}" data-name="${group.group_name}" title="Renombrar grupo">✏️</button>
            <button class="btn-icon btn-delete-group" data-group="${group.id}" title="Eliminar grupo">🗑️</button>
          </div>
        </div>
        
        <div class="group-members-list">
          ${membersHtml}
        </div>

        <form class="add-member-form form-compact" data-group="${group.id}">
          <input type="email" class="search-input member-email-input" list="registered-emails-list" placeholder="Añadir miembro por correo exacto..." required style="margin-bottom: 0.5rem; width: 100%;">
          <button type="submit" class="btn btn-secondary btn-sm w-full">Añadir Integrante</button>
        </form>
      </div>
    `;
  }

  listContainer.innerHTML = html;

  // Add Listeners
  document.querySelectorAll(".add-member-form").forEach(form => {
    form.addEventListener("submit", handleAddMember);
  });

  document.querySelectorAll(".btn-remove-member").forEach(btn => {
    btn.addEventListener("click", handleRemoveMember);
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
    
    nameInput.value = '';
    await loadGroups();
  } catch (err) {
    alert("Error al crear grupo: " + err.message);
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

  btn.disabled = true;

  try {
    // Obtener UUID usando RPC para que "special" pueda encontrar a cualquier usuario por correo exacto
    const { data: profileId, error: rpcError } = await supabase.rpc('get_profile_id_by_email', { email_param: email });
    
    if (rpcError || !profileId) {
      alert("No se encontró ningún usuario con ese correo exacto registrado en la plataforma.");
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
    await loadGroups();
  } catch (err) {
    alert("Error al añadir miembro. Es posible que ya pertenezca al grupo. " + err.message);
  } finally {
    btn.disabled = false;
    emailInput.value = '';
  }
}

async function handleRemoveMember(e) {
  const groupId = e.target.getAttribute("data-group");
  const userId = e.target.getAttribute("data-user");

  if (!confirm("¿Eliminar este miembro del grupo?")) return;

  e.target.disabled = true;
  try {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
    await loadGroups();
  } catch (err) {
    alert("Error al eliminar miembro: " + err.message);
    e.target.disabled = false;
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
    await loadGroups();
  } catch (err) {
    alert("Error al renombrar el grupo: " + err.message);
    e.currentTarget.disabled = false;
  }
}

async function handleDeleteGroup(e) {
  const groupId = e.currentTarget.getAttribute("data-group");

  if (!confirm("¿Estás seguro de que deseas eliminar este grupo? Todos sus miembros serán eliminados de la lista.")) return;

  e.currentTarget.disabled = true;
  try {
    // Eliminar miembros primero para evitar conflictos de llave foránea (si no hay CASCADE)
    await supabase.from('group_members').delete().eq('group_id', groupId);

    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
    await loadGroups();
  } catch (err) {
    alert("Error al eliminar el grupo: " + err.message);
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

  const createForm = document.getElementById("create-group-form");
  if (createForm) {
    createForm.addEventListener("submit", handleCreateGroup);
  }

  await loadProfilesForDatalist(role);
  await loadGroups();
}
