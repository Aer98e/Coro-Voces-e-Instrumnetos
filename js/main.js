/**
 * Punto de entrada de la aplicación
 * Inicializa la aplicación y coordina los módulos
 */

import {
  inputBusqueda,
  selectCategoria,
  selectOrden,
  authWidget,
  btnLoginOpen,
  loginModal,
  btnLoginClose,
  loginForm,
  loginEmail,
  loginPassword,
  loginError,
  btnLoginSubmit
} from "./config/selectors.js";
import { cargarHimnos, cargarCategoriasUnicas } from "./services/hymnService.js";
import { filtrarHimnos, ordenarHimnos } from "./domain/hymn.js";
import { renderizarCategorias, renderizarResultados } from "./ui/renderer.js";
import { mostrarError } from "./ui/errorHandler.js";
import supabase from "./config/supabase.js";

// Estado global
let himnos = [];

/**
 * Actualiza los resultados según los filtros y orden actuales
 */
function actualizar() {
  const texto = inputBusqueda.value.trim().toLowerCase();
  const categoria = selectCategoria.value;
  const orden = selectOrden.value;

  let filtrados = filtrarHimnos(himnos, texto, categoria);
  filtrados = ordenarHimnos(filtrados, orden);

  renderizarResultados(filtrados);
}

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

  // Mostrar cargando
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
 * Recarga los himnos y categorías desde Supabase aplicando permisos actuales
 */
async function recargarDatos() {
  try {
    const panelResultados = document.querySelector(".results-panel");
    if (panelResultados) {
      panelResultados.innerHTML = `
        <h2 class="section-title">Resultados</h2>
        <p class="loading-message">Cargando himnos...</p>
      `;
    }

    himnos = await cargarHimnos();
    const categorias = await cargarCategoriasUnicas();

    renderizarCategorias(categorias);
    actualizar();
  } catch (error) {
    mostrarError(`No se pudieron cargar los datos. ${error.message}`);
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
      adminLink = `<a href="interfaz_admin/managerInterface.html" class="btn btn-admin-header">Administrar</a>`;
    }

    authWidget.innerHTML = `
      <div class="user-info-container">
        <span class="user-email">${user.email}</span>
        <span class="badge badge-role">${roleText}</span>
        ${adminLink}
        <button id="btn-logout" class="btn btn-logout-header">Cerrar sesión</button>
      </div>
    `;

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) logoutBtn.addEventListener("click", cerrarSesion);
  }
}

/**
 * Inicializa la aplicación
 */
async function inicializar() {
  // Configurar listeners de la modal
  if (btnLoginOpen) btnLoginOpen.addEventListener("click", abrirModal);
  if (btnLoginClose) btnLoginClose.addEventListener("click", cerrarModal);
  
  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) cerrarModal();
    });
  }

  if (loginForm) loginForm.addEventListener("submit", manejarLogin);

  // Configurar event listeners de filtros
  inputBusqueda.addEventListener("input", actualizar);
  selectCategoria.addEventListener("change", actualizar);
  selectOrden.addEventListener("change", actualizar);

  // Escuchar estado de autenticación de Supabase (esto se ejecuta al inicio automáticamente)
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔐 Evento Auth: ${event}`);
    const user = session?.user || null;
    let role = 'member';

    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          role = data.role;
        }
      } catch (e) {
        console.warn("⚠️ No se pudo obtener el rol del usuario, por defecto 'member':", e);
      }
      actualizarHeaderUI(user, role);
    } else {
      actualizarHeaderUI(null, null);
    }

    await recargarDatos();
  });
}

// Iniciar la aplicación
inicializar();
