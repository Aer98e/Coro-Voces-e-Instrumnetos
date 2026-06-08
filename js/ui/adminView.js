import { initUsuariosAdmin } from "./admin/usuariosAdmin.js";
import { initGruposAdmin } from "./admin/gruposAdmin.js";

// Cache para submódulos administrativos
const adminViewsCache = {};

async function loadAdminSubView(viewName) {
  const container = document.querySelector(".admin-main-panel");
  if (!container) return false;

  if (!adminViewsCache[viewName]) {
    try {
      const response = await fetch(`views/admin/${viewName}.html`);
      if (!response.ok) throw new Error("No se pudo cargar la vista " + viewName);
      const html = await response.text();
      adminViewsCache[viewName] = html;
    } catch (error) {
      console.error(error);
      container.innerHTML = `<p style="color: var(--error-color);">Error cargando módulo.</p>`;
      return false;
    }
  }

  container.innerHTML = adminViewsCache[viewName];
  return true;
}

function updateSidebarActiveLink(subPath) {
  const links = document.querySelectorAll(".admin-nav-link");
  links.forEach(link => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#/admin/${subPath}`) {
      link.classList.add("active");
    }
  });
}

export async function initAdminView(subPath, session, role) {
  // Ocultar pestaña de usuarios si no es admin
  const userTab = document.querySelector('a[href="#/admin/usuarios"]');
  if (userTab) {
    userTab.style.display = role === 'admin' ? 'block' : 'none';
  }

  // Redirigir si 'special' intenta acceder a usuarios
  if (role !== 'admin' && (!subPath || subPath === "usuarios")) {
    subPath = "grupos";
    window.location.hash = "#/admin/grupos";
  }

  // Por defecto cargar usuarios si no hay ruta o es errónea (y es admin)
  if (!subPath || subPath === "") subPath = "usuarios";
  
  updateSidebarActiveLink(subPath);

  let loaded = false;
  
  switch(subPath) {
    case "usuarios":
      loaded = await loadAdminSubView("usuarios");
      if (loaded) initUsuariosAdmin(session, role);
      break;
    case "grupos":
      loaded = await loadAdminSubView("grupos");
      if (loaded) initGruposAdmin(session, role);
      break;
    case "categorias":
      loaded = await loadAdminSubView("categorias");
      if (loaded) {
        import('./admin/categoriasAdmin.js').then(module => {
          module.initCategoriasAdmin(session, role);
        });
      }
      break;
    case "himnos":
      loaded = await loadAdminSubView("himnos");
      if (loaded) {
        import('./admin/himnosAdmin.js').then(module => {
          module.initHimnosAdmin(session, role);
        });
      }
      break;
    default:
      // Redirigir a usuarios si la subruta no existe
      window.location.hash = "#/admin/usuarios";
      break;
  }
}
