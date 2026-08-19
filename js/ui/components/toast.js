/**
 * Componente de Notificaciones Toast
 * Muestra avisos flotantes estilizados para acciones de usuario (success, error, warning, info)
 */

export function showToast(message, type = 'info', title = null, duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const defaultTitles = {
    success: 'Éxito',
    error: 'Error',
    warning: 'Atención',
    info: 'Información'
  };

  const icon = icons[type] || icons.info;
  const toastTitle = title !== null ? title : (defaultTitles[type] || '');

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      ${toastTitle ? `<div class="toast-title">${toastTitle}</div>` : ''}
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Cerrar">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    dismissToast(toast);
  });

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      dismissToast(toast);
    }, duration);
  }
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('toast-leaving')) return;
  toast.classList.add('toast-leaving');
  toast.addEventListener('animationend', () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });
}

export default {
  showToast
};
