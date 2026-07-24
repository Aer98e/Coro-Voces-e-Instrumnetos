/**
 * Componente Temporal: Aviso de correo ficticio (@aer98e.com)
 * Muestra un aviso corto y despliega una pantalla explicativa al interactuar.
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

  // Crear el banner corto
  const banner = document.createElement("div");
  banner.id = "temp-email-notice-banner";
  banner.className = "temp-email-notice-banner fade-in";
  banner.innerHTML = `
    <div class="banner-inner container">
      <div class="banner-text" id="btn-open-email-notice-text" style="cursor: pointer;">
        <span class="banner-icon">⚠️</span>
        <span>Se requiere que revise su correo asociado a esta cuenta.</span>
      </div>
      <div class="banner-actions">
        <button id="btn-open-email-modal" class="btn btn-banner-action">Ver más</button>
        <button id="btn-close-temp-banner" class="btn-banner-close" aria-label="Cerrar aviso">&times;</button>
      </div>
    </div>
  `;

  // Estilos CSS dinámicos específicos para este banner y la modal
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
      .temp-email-notice-banner .banner-text:hover {
        text-decoration: underline;
      }
      .temp-email-notice-banner .banner-icon {
        font-size: 1.2rem;
      }
      .temp-email-notice-banner .banner-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .temp-email-notice-banner .btn-banner-action {
        background-color: #d97706;
        color: #ffffff !important;
        padding: 0.4rem 0.8rem;
        font-size: 0.8rem;
        border-radius: 0.375rem;
        border: none;
        cursor: pointer;
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

      /* Modal explicativa */
      .temp-email-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
      }
      .temp-email-modal-card {
        background: #ffffff;
        border-radius: 0.75rem;
        max-width: 500px;
        width: 100%;
        padding: 1.75rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid #fef3c7;
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

  // Evento para abrir la modal explicativa
  const abrirModalExplicativa = () => {
    let modal = document.getElementById("temp-email-modal-overlay");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "temp-email-modal-overlay";
      modal.className = "temp-email-modal-overlay fade-in";
      modal.innerHTML = `
        <div class="temp-email-modal-card">
          <h3 style="margin-top: 0; color: #b45309; display: flex; align-items: center; gap: 0.5rem; font-size: 1.25rem;">
            <span>⚠️</span> Revisión de Correo Electrónico
          </h3>
          <div style="color: #374151; font-size: 0.95rem; line-height: 1.6; margin: 1.25rem 0 1.75rem;">
            <p style="margin-bottom: 0.75rem;">
              El correo registrado en su cuenta termina en <strong>@aer98e.com</strong>, el cual no es un correo electrónico real.
            </p>
            <p style="margin-bottom: 0;">
              Para poder recuperar su contraseña en caso de olvido, recibir avisos y mantener la seguridad de su cuenta, se requiere que lo reemplace por un correo electrónico real.
            </p>
          </div>
          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap;">
            <button id="btn-close-temp-modal" class="btn btn-ghost" style="padding: 0.5rem 1rem;">Cerrar</button>
            <a href="#/perfil" id="btn-modal-go-profile" class="btn btn-login-submit" style="text-decoration: none; padding: 0.5rem 1rem; width: auto; margin-top: 0;">Ir a Mi Perfil</a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const cerrarModal = () => {
        modal.classList.add("hidden");
      };

      modal.querySelector("#btn-close-temp-modal").addEventListener("click", cerrarModal);
      modal.querySelector("#btn-modal-go-profile").addEventListener("click", () => {
        cerrarModal();
      });
      modal.addEventListener("click", (e) => {
        if (e.target === modal) cerrarModal();
      });
    }
    modal.classList.remove("hidden");
  };

  banner.querySelector("#btn-open-email-notice-text").addEventListener("click", abrirModalExplicativa);
  banner.querySelector("#btn-open-email-modal").addEventListener("click", abrirModalExplicativa);

  // Asignar evento de cierre del banner
  banner.querySelector("#btn-close-temp-banner").addEventListener("click", () => {
    banner.remove();
    sessionStorage.setItem("dismissed_temp_email_notice", "true");
  });
}

