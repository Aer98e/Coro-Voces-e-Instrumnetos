/**
 * Selectores de elementos del DOM
 * Define todas las referencias a elementos HTML del página
 */

export const selectors = {
  inputBusqueda: document.getElementById("search-input"),
  selectCategoria: document.getElementById("category-select"),
  selectOrden: document.getElementById("order-select"),
  panelResultados: document.querySelector(".results-panel"),
  
  // Selectores para autenticación
  authWidget: document.getElementById("auth-widget"),
  btnLoginOpen: document.getElementById("btn-login-open"),
  loginModal: document.getElementById("login-modal"),
  btnLoginClose: document.getElementById("btn-login-close"),
  loginForm: document.getElementById("login-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  btnLoginSubmit: document.getElementById("btn-login-submit")
};

export const {
  inputBusqueda,
  selectCategoria,
  selectOrden,
  panelResultados,
  authWidget,
  btnLoginOpen,
  loginModal,
  btnLoginClose,
  loginForm,
  loginEmail,
  loginPassword,
  loginError,
  btnLoginSubmit
} = selectors;
