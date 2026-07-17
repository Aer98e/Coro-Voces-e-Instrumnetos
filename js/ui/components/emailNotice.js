/**
 * Componente Temporal: Aviso de correo ficticio (@aer98e.com)
 * Este archivo completo puede ser eliminado en unos días cuando la migración termine.
 */
export function initTemporaryEmailNotice(user) {
  // Eliminar banner previo si existe
  const existingBanner = document.getElementById("temp-email-notice-banner");
  if (existingBanner) existingBanner.remove();

  if (!user || !user.email || !user.email.toLowerCase().endsWith("@aer98e.com")) {
    return;
  }

  // Comprobar si ya fue cerrado en esta sesión para no ser molesto
  if (sessionStorage.getItem("dismissed_temp_email_notice") === "true") {
    return;
  }

  // Crear el banner
  const banner = document.createElement("div");
  banner.id = "temp-email-notice-banner";
  banner.className = "temp-email-notice-banner fade-in";
  banner.innerHTML = `
    <div class="banner-inner container">
      <div class="banner-text">
        <span class="banner-icon">⚠️</span>
        <span>Actualmente el correo asociado a esta cuenta no está asociado a un servicio real, se aconseja actualizar.</span>
      </div>
      <div class="banner-actions">
        <a href="#/perfil" class="btn btn-banner-action">Actualizar en mi Perfil</a>
        <button id="btn-close-temp-banner" class="btn-banner-close" aria-label="Cerrar aviso">&times;</button>
      </div>
    </div>
  `;

  // Estilos CSS dinámicos específicos para este banner, facilitando su eliminación posterior
  const styleId = "temp-email-notice-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .temp-email-notice-banner {
        background: linear-gradient(135deg, #fffdf5 0%, #fef3c7 100%);
        border-bottom: 2px solid #fde68a;
        color: #92400e;
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        position: relative;
        z-index: 50;
      }
      .temp-email-notice-banner .banner-inner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .temp-email-notice-banner .banner-text {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        line-height: 1.4;
      }
      .temp-email-notice-banner .banner-icon {
        font-size: 1.2rem;
      }
      .temp-email-notice-banner .banner-actions {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      .temp-email-notice-banner .btn-banner-action {
        background-color: #d97706;
        color: #ffffff !important;
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
        border-radius: 0.375rem;
        text-decoration: none;
        font-weight: 600;
        transition: background-color 0.2s, transform 0.1s;
        box-shadow: 0 2px 4px rgba(217, 119, 6, 0.2);
      }
      .temp-email-notice-banner .btn-banner-action:hover {
        background-color: #b45309;
        transform: translateY(-1px);
      }
      .temp-email-notice-banner .btn-banner-action:active {
        transform: translateY(0);
      }
      .temp-email-notice-banner .btn-banner-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #b45309;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        display: flex;
        align-items: center;
        transition: color 0.2s;
      }
      .temp-email-notice-banner .btn-banner-close:hover {
        color: #78350f;
      }
    `;
    document.head.appendChild(style);
  }

  // Insertar el banner justo debajo del header
  const header = document.querySelector(".site-header");
  if (header) {
    header.insertAdjacentElement("afterend", banner);
  } else {
    document.body.prepend(banner);
  }

  // Asignar evento de cierre
  banner.querySelector("#btn-close-temp-banner").addEventListener("click", () => {
    banner.remove();
    sessionStorage.setItem("dismissed_temp_email_notice", "true");
  });
}
