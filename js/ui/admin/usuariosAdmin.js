import supabase from "../../config/supabase.js";

let perfiles = [];

async function loadProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('email');

  if (error) {
    console.error("Error cargando perfiles:", error);
    return [];
  }
  return data || [];
}

async function updateRole(userId, newRole, originalRole, selectEl) {
  selectEl.disabled = true;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) throw error;
    
    // Éxito, actualizar estado local
    const perfil = perfiles.find(p => p.id === userId);
    if (perfil) perfil.role = newRole;
    
    // Alerta visual de éxito (opcional, cambiar clase temporalmente)
    selectEl.style.borderColor = "var(--success-color, #10b981)";
    setTimeout(() => selectEl.style.borderColor = "", 2000);
    
  } catch (error) {
    console.error("Error actualizando rol:", error);
    alert("Error al actualizar el rol: " + error.message);
    selectEl.value = originalRole; // Revertir
  } finally {
    selectEl.disabled = false;
  }
}

function renderProfiles(lista) {
  const tbody = document.getElementById("admin-users-tbody");
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No se encontraron usuarios.</td></tr>`;
    return;
  }

  const html = lista.map(p => `
    <tr>
      <td style="font-weight: 500;">${p.email || 'Sin correo'}</td>
      <td style="font-family: monospace; font-size: 0.8rem; color: #64748b;">${p.id.split('-')[0]}...</td>
      <td>
        <span class="badge ${p.role === 'admin' ? 'badge-role' : (p.role === 'special' ? 'badge-category' : 'badge-voice')}" style="color: initial;">
          ${p.role}
        </span>
      </td>
      <td style="text-align: right;">
        <select class="select-input role-select" data-id="${p.id}" data-original="${p.role}" style="padding: 0.3rem; width: auto; font-size: 0.8rem;">
          <option value="member" ${p.role === 'member' ? 'selected' : ''}>Miembro</option>
          <option value="special" ${p.role === 'special' ? 'selected' : ''}>Especial</option>
          <option value="admin" ${p.role === 'admin' ? 'selected' : ''}>Administrador</option>
        </select>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = html;

  // Añadir eventos a los selects
  const selects = tbody.querySelectorAll(".role-select");
  selects.forEach(sel => {
    sel.addEventListener("change", (e) => {
      const newRole = e.target.value;
      const originalRole = e.target.getAttribute("data-original");
      const userId = e.target.getAttribute("data-id");
      
      if (newRole !== originalRole) {
        if(confirm(`¿Estás seguro de cambiar el rol a ${newRole}?`)) {
          updateRole(userId, newRole, originalRole, e.target);
        } else {
          e.target.value = originalRole; // Cancelado
        }
      }
    });
  });
}

export async function initUsuariosAdmin(session, role) {
  if (role !== 'admin') {
    const tbody = document.getElementById("admin-users-tbody");
    if(tbody) tbody.innerHTML = `<tr><td colspan="4" style="color: red;">Acceso denegado.</td></tr>`;
    return;
  }

  perfiles = await loadProfiles();
  renderProfiles(perfiles);

  const searchInput = document.getElementById("admin-user-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      const filtrados = perfiles.filter(p => p.email && p.email.toLowerCase().includes(term));
      renderProfiles(filtrados);
    });
  }
}
