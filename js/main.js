/**
 * Punto de entrada de la aplicación
 * Inicializa la aplicación, la autenticación y el enrutador SPA
 */

import supabase from "./config/supabase.js";
import { initRouter, handleRouteChange } from "./router.js";

// Estado global
let currentSession = null;
let currentRole = 'member';

// Selectores globales (fuera de las vistas dinámicas)
const authWidget = document.getElementById("auth-widget");
const btnLoginOpen = document.getElementById("btn-login-open");
const loginModal = document.getElementById("login-modal");
const btnLoginClose = document.getElementById("btn-login-close");
const loginForm = document.getElementById("login-form");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const btnLoginSubmit = document.getElementById("btn-login-submit");

/**
 * Abre el modal de inicio de sesión
 */
function abrirModal() {
  loginModal.classList.remove("hidden");
  loginEmail.focus();
}

/**
 * Cierra el modal de inicio de sesión
 */
function cerrarModal() {
  loginModal.classList.add("hidden");
  loginForm.reset();
  loginError.classList.add("hidden");
  loginError.textContent = "";
}

/**
 * Maneja el envío del formulario de inicio de sesión
 */
async function manejarLogin(e) {
  e.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  const btnText = btnLoginSubmit.querySelector(".btn-text");
  const spinner = btnLoginSubmit.querySelector(".spinner");

  btnLoginSubmit.disabled = true;
  if (btnText) btnText.textContent = "Ingresando...";
  if (spinner) spinner.classList.remove("hidden");
  loginError.classList.add("hidden");

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    cerrarModal();
  } catch (error) {
    console.error("❌ Error al iniciar sesión:", error);
    loginError.textContent = error.message || "Credenciales incorrectas.";
    loginError.classList.remove("hidden");
  } finally {
    btnLoginSubmit.disabled = false;
    if (btnText) btnText.textContent = "Entrar";
    if (spinner) spinner.classList.add("hidden");
  }
}

/**
 * Cierra la sesión activa del usuario
 */
async function cerrarSesion() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("❌ Error al cerrar sesión:", error.message);
  }
}

/**
 * Actualiza los elementos del header según el estado de autenticación y rol
 */
function actualizarHeaderUI(user, role) {
  if (!user) {
    authWidget.innerHTML = `<button id="btn-login-open" class="btn btn-login-header">Iniciar sesión</button>`;
    const btn = document.getElementById("btn-login-open");
    if (btn) btn.addEventListener("click", abrirModal);
  } else {
    let roleText = 'Miembro';
    if (role === 'admin') roleText = 'Administrador';
    if (role === 'special') roleText = 'Especial';

    let adminLink = '';
    if (role === 'admin' || role === 'special') {
      adminLink = `<a href="#/admin" class="dropdown-item">Administrar</a>`;
    }

    authWidget.innerHTML = `
      <div class="user-menu-container">
        <button id="btn-user-menu" class="btn-user-icon" title="Opciones de usuario">
          <span class="avatar-sm">${user.email.charAt(0).toUpperCase()}</span>
        </button>
        <div id="user-dropdown" class="user-dropdown hidden">
          <div class="dropdown-header">
            <span class="user-email-dropdown">${user.email}</span>
            <span class="badge badge-role" style="color: initial;">${roleText}</span>
          </div>
          <hr class="dropdown-divider">
          ${adminLink}
          <a href="#/perfil" class="dropdown-item">Mi Perfil</a>
          <button id="btn-logout" class="dropdown-item text-danger">Cerrar sesión</button>
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", cerrarSesion);

    const userMenuBtn = document.getElementById("btn-user-menu");
    const userDropdown = document.getElementById("user-dropdown");
    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("hidden");
      });
      // Cerrar al hacer clic fuera
      document.addEventListener("click", (e) => {
        if (!userDropdown.contains(e.target) && e.target !== userMenuBtn) {
          userDropdown.classList.add("hidden");
        }
      });
    }
  }
}

/**
 * Devuelve la sesión y el rol actuales (usado por el router)
 */
export async function getSessionAndRole() {
  return { session: currentSession, role: currentRole };
}

/**
 * Inicializa la aplicación
 */
async function inicializar() {
  // Configurar listeners de la modal de login
  if (btnLoginOpen) btnLoginOpen.addEventListener("click", abrirModal);
  if (btnLoginClose) btnLoginClose.addEventListener("click", cerrarModal);
  
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) cerrarModal();
    });
  }

  if (loginForm) loginForm.addEventListener("submit", manejarLogin);

  // Inicializar enrutador
  initRouter(getSessionAndRole);

  // Obtener sesión inicial de manera proactiva para evitar esperas y bloqueos infinitos
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentSession = session;
    currentRole = 'member';

    if (session?.user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!error && data) {
        currentRole = data.role;
      }
    }
    actualizarHeaderUI(currentSession?.user || null, currentRole);
    await handleRouteChange(currentSession, currentRole);
  } catch (error) {
    console.error("⚠️ Error obteniendo sesión inicial:", error);
    // Cargar la ruta de todas formas para evitar quedarse pegado en Cargando
    actualizarHeaderUI(null, 'member');
    await handleRouteChange(null, 'member');
  }

  // Escuchar futuros cambios de estado de autenticación de Supabase (inicio/cierre de sesión)
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔐 Evento Auth posterior: ${event}`);
    
    // Evitar recargar la ruta en el evento inicial si ya la procesamos arriba
    if (event === 'INITIAL_SESSION' && currentSession) {
      return;
    }

    const user = session?.user || null;
    currentSession = session;
    currentRole = 'member';

    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          currentRole = data.role;
        }
      } catch (e) {
        console.warn("⚠️ No se pudo obtener el rol del usuario en cambio de auth, por defecto 'member':", e);
      }
      actualizarHeaderUI(user, currentRole);
    } else {
      actualizarHeaderUI(null, null);
    }

    // Forzar re-evaluación de la ruta actual basada en la nueva sesión
    handleRouteChange(currentSession, currentRole);
  });
}

// Iniciar la aplicación
inicializar();
