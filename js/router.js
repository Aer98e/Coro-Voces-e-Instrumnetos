import { initHomeView } from "./ui/homeView.js";
import { initProfileView } from "./ui/profileView.js";

// Cache de las vistas para no hacer fetch múltiples veces
const viewsCache = {};

/**
 * Carga el contenido HTML de una vista y lo inyecta en el DOM
 */
async function loadView(viewName) {
  const outlet = document.getElementById("router-outlet");
  
  if (!viewsCache[viewName]) {
    try {
      const response = await fetch(`views/${viewName}.html`);
      if (!response.ok) throw new Error("No se pudo cargar la vista");
      const html = await response.text();
      viewsCache[viewName] = html;
    } catch (error) {
      console.error(error);
      outlet.innerHTML = `<p style="text-align: center; color: var(--error-color);">Error cargando la vista.</p>`;
      return false;
    }
  }
  
  outlet.innerHTML = viewsCache[viewName];
  return true;
}

/**
 * Maneja el cambio de ruta
 * @param {Object} session - La sesión actual de Supabase
 * @param {string} role - El rol actual del usuario
 */
export async function handleRouteChange(session, role) {
  const hash = window.location.hash || '#/home';
  const fullPath = hash.replace('#/', '');
  const pathParts = fullPath.split('/');
  const path = pathParts[0];
  const subPath = pathParts[1] || '';

  // Guardianes de Ruta (Route Guards)
  if (path === 'perfil' && !session) {
    window.location.hash = '#/home';
    return;
  }
  
  if (path === 'admin' && (!session || role === 'member')) {
    window.location.hash = '#/home';
    return;
  }

  // Cargar la vista correspondiente
  let viewLoaded = false;
  
  switch(path) {
    case 'perfil':
      viewLoaded = await loadView('profile');
      if (viewLoaded) initProfileView(session, role);
      break;
    case 'admin':
      viewLoaded = await loadView('admin');
      if (viewLoaded) {
        // Dynamic import to avoid loading admin logic for standard users
        import('./ui/adminView.js').then(module => {
          module.initAdminView(subPath, session, role);
        });
      }
      break;
    case 'home':
    default:
      viewLoaded = await loadView('home');
      if (viewLoaded) initHomeView();
      break;
  }
}

/**
 * Inicializa el enrutador
 */
export function initRouter(getSessionAndRole) {
  window.addEventListener('hashchange', async () => {
    const { session, role } = await getSessionAndRole();
    handleRouteChange(session, role);
  });
}
