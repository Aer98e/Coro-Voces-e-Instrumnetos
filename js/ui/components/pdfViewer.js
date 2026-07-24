/**
 * Componente Visor de PDF Integrado
 * Despliega un visor modal superpuesto para visualizar partituras directamente dentro de la aplicación.
 */

export function abrirVisorPDF(pdfUrl, titulo = "Partitura") {
  if (!pdfUrl) return;

  // Insertar estilos si no existen
  const styleId = "pdf-viewer-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .pdf-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(15, 23, 42, 0.85);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 0.75rem;
      }
      .pdf-modal-container {
        background: #ffffff;
        border-radius: 0.75rem;
        width: 100%;
        max-width: 1100px;
        height: 94vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .pdf-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background-color: #0f172a;
        color: #f8fafc;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      .pdf-modal-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 1rem;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 60%;
      }
      .pdf-modal-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .btn-pdf-external {
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0 !important;
        padding: 0.4rem 0.75rem;
        font-size: 0.825rem;
        border-radius: 0.375rem;
        text-decoration: none;
        font-weight: 500;
        transition: background 0.2s;
      }
      .btn-pdf-external:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      .btn-pdf-close {
        background-color: #ef4444;
        color: #ffffff;
        border: none;
        padding: 0.4rem 0.85rem;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }
      .btn-pdf-close:hover {
        background-color: #dc2626;
      }
      .pdf-modal-body {
        flex: 1;
        width: 100%;
        background-color: #334155;
        position: relative;
      }
      .pdf-modal-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
      @media (max-width: 640px) {
        .pdf-modal-container {
          height: 98vh;
          border-radius: 0.5rem;
        }
        .pdf-modal-header {
          padding: 0.6rem 0.75rem;
        }
        .pdf-modal-title {
          max-width: 50%;
          font-size: 0.9rem;
        }
      }
    `;
    document.head.appendChild(style);
  }

  let modal = document.getElementById("pdf-viewer-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "pdf-viewer-modal";
    modal.className = "pdf-modal-overlay fade-in";
    modal.innerHTML = `
      <div class="pdf-modal-container">
        <div class="pdf-modal-header">
          <div class="pdf-modal-title">
            <span>📖</span>
            <span id="pdf-modal-title-text">Partitura</span>
          </div>
          <div class="pdf-modal-actions">
            <a id="pdf-modal-external-link" href="#" target="_blank" rel="noopener noreferrer" class="btn-pdf-external">
              Abrir externamente ↗
            </a>
            <button id="btn-close-pdf-modal" class="btn-pdf-close">
              ✕ Cerrar
            </button>
          </div>
        </div>
        <div class="pdf-modal-body">
          <iframe id="pdf-modal-iframe" class="pdf-modal-iframe" src="" title="Visor de Partitura PDF"></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const cerrarModal = () => {
      const iframe = document.getElementById("pdf-modal-iframe");
      if (iframe) iframe.src = "";
      modal.classList.add("hidden");
    };

    modal.querySelector("#btn-close-pdf-modal").addEventListener("click", cerrarModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) cerrarModal();
    });

    // Permitir cerrar con la tecla Escape
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) {
        cerrarModal();
      }
    });
  }

  // Actualizar contenido
  const titleText = document.getElementById("pdf-modal-title-text");
  const externalLink = document.getElementById("pdf-modal-external-link");
  const iframe = document.getElementById("pdf-modal-iframe");

  if (titleText) titleText.textContent = titulo;
  if (externalLink) externalLink.href = pdfUrl;
  if (iframe) iframe.src = pdfUrl;

  modal.classList.remove("hidden");
}

export default {
  abrirVisorPDF
};
