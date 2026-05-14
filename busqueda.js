// ------------------------------
// Cargar datos
// ------------------------------
let himnos = [];

const inputBusqueda = document.getElementById("search-input");
const selectCategoria = document.getElementById("category-select");
const selectOrden = document.getElementById("order-select");
const panelResultados = document.querySelector(".results-panel");

inputBusqueda.addEventListener("input", actualizar);
selectCategoria.addEventListener("change", actualizar);
selectOrden.addEventListener("change", actualizar);

async function cargarDatos() {
  try {
    const respuesta = await fetch("data/data.json");
    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status} ${respuesta.statusText}`);
    }

    himnos = await respuesta.json();
    const categorias = obtenerCategoriasUnicas(himnos);
    renderizarCategorias(categorias);
    actualizar();
  } catch (error) {
    mostrarError(`No se pudieron cargar los datos. ${error.message}`);
    console.error("Error cargando data.json:", error);
  }
}

function obtenerCategoriasUnicas(lista) {
  const todas = lista.flatMap(himno => {
    const categorias = himno.categorias ?? himno.categoria;
    if (Array.isArray(categorias)) {
      return categorias.filter(Boolean);
    }
    return categorias ? [categorias] : [];
  });
  return Array.from(new Set(todas)).sort();
}

function obtenerCategorias(himno) {
  const categorias = himno.categorias ?? himno.categoria;
  if (Array.isArray(categorias)) {
    return categorias.filter(Boolean);
  }
  return categorias ? [categorias] : [];
}

function obtenerVersionPorVoz(himno, voz) {
  const versiones = himno.versiones ?? himno.voces ?? [];
  if (!Array.isArray(versiones) || versiones.length === 0) {
    return { voz: "Desconocida", audio: "", pdf: "" };
  }
  if (!voz) {
    return versiones[0];
  }
  const seleccion = versiones.find(v => String(v.voz).toLowerCase() === String(voz).toLowerCase());
  return seleccion || versiones[0];
}

function renderizarCategorias(categorias) {
  const opciones = categorias
    .map(categoria => `<option value="${categoria}">${capitalizar(categoria)}</option>`)
    .join("");

  selectCategoria.innerHTML = `<option value="">Todas</option>${opciones}`;
}

function actualizar() {
  const texto = inputBusqueda.value.trim().toLowerCase();
  const categoria = selectCategoria.value;
  const orden = selectOrden.value;

  const filtrados = himnos
    .filter(himno => {
      const titulo = (himno.titulo ?? "").toLowerCase();
      const id = String(himno.id ?? "");
      const categorias = obtenerCategorias(himno).map(c => c.toLowerCase());
      const coincideTexto =
        texto === "" ||
        titulo.includes(texto) ||
        id.includes(texto) ||
        categorias.some(c => c.includes(texto));
      const coincideCategoria =
        categoria === "" || categorias.includes(categoria);
      return coincideTexto && coincideCategoria;
    });

  if (orden === "titulo") {
    filtrados.sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? ""));
  } else if (orden === "reciente") {
    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha_registro || 0).getTime();
      const fechaB = new Date(b.fecha_registro || 0).getTime();
      return fechaB - fechaA;
    });
  } else if (orden === "antiguo") {
    filtrados.sort((a, b) => {
      const fechaA = new Date(a.fecha_registro || 0).getTime();
      const fechaB = new Date(b.fecha_registro || 0).getTime();
      return fechaA - fechaB;
    });
  }

  renderizarResultados(filtrados);
}

function formatDate(fecha) {
  if (!fecha) {
    return "Fecha desconocida";
  }

  const fechaObj = new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderizarResultados(lista) {
  panelResultados.innerHTML = `
    <h2 class="section-title">Resultados</h2>
  `;

  const fragmento = document.createDocumentFragment();

  if (lista.length === 0) {
    const mensaje = document.createElement("p");
    mensaje.textContent = "No se encontraron himnos.";
    fragmento.appendChild(mensaje);
    panelResultados.appendChild(fragmento);
    return;
  }

  lista.forEach(himno => {
    const categorias = obtenerCategorias(himno);
    const versionInicial = obtenerVersionPorVoz(himno);
    const tarjeta = document.createElement("article");
    tarjeta.className = "hymn-card";

    const hymnMain = document.createElement("div");
    hymnMain.className = "hymn-main";

    const info = document.createElement("div");
    const titulo = document.createElement("h3");
    titulo.className = "hymn-title";
    titulo.textContent = himno.titulo || "Himno sin título";

    const meta = document.createElement("p");
    meta.className = "hymn-meta";

    const badge = document.createElement("span");
    badge.className = "badge badge-category";
    badge.textContent = categorias.map(capitalizar).join(", ") || "Categoría desconocida";

    const extra = document.createElement("span");
    extra.className = "hymn-extra";
    extra.textContent = `Tono: ${himno.tono || "-"} · Registrado: ${formatDate(himno.fecha_registro)}`;

    meta.appendChild(badge);
    meta.appendChild(extra);
    info.appendChild(titulo);
    info.appendChild(meta);

    const acciones = document.createElement("div");
    acciones.className = "hymn-actions";

    const verPdf = document.createElement("a");
    verPdf.className = "btn btn-secondary";
    verPdf.href = versionInicial.pdf || "#";
    verPdf.target = "_blank";
    verPdf.rel = "noopener noreferrer";
    verPdf.textContent = "Ver partitura (PDF)";

    const descargarPdf = document.createElement("a");
    descargarPdf.className = "btn btn-ghost";
    descargarPdf.href = versionInicial.pdf || "#";
    descargarPdf.download = "";
    descargarPdf.textContent = "Descargar PDF";

    acciones.appendChild(verPdf);
    acciones.appendChild(descargarPdf);

    hymnMain.appendChild(info);
    hymnMain.appendChild(acciones);

    const voiceSelectorWrapper = document.createElement("div");
    voiceSelectorWrapper.className = "voice-selector";

    const voiceLabel = document.createElement("label");
    voiceLabel.textContent = "Voz:";
    voiceLabel.setAttribute("for", `voice-select-${himno.id}`);

    const voiceSelect = document.createElement("select");
    voiceSelect.id = `voice-select-${himno.id}`;
    voiceSelect.className = "select-input";

    const versiones = himno.versiones ?? himno.voces ?? [];
    versiones.forEach(version => {
      const option = document.createElement("option");
      option.value = version.voz;
      option.textContent = version.voz;
      if (version.voz === versionInicial.voz) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });

    const voiceIndicator = document.createElement("span");
    voiceIndicator.className = "badge badge-voice";
    voiceIndicator.textContent = versionInicial.voz || "Voz";

    voiceSelectorWrapper.appendChild(voiceLabel);
    voiceSelectorWrapper.appendChild(voiceSelect);
    voiceSelectorWrapper.appendChild(voiceIndicator);

    const hymnAudio = document.createElement("div");
    hymnAudio.className = "hymn-audio";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.className = "audio-player";

    const source = document.createElement("source");
    source.src = versionInicial.audio || "";
    source.type = "audio/mpeg";
    audio.appendChild(source);
    audio.appendChild(document.createTextNode("Tu navegador no soporta el elemento de audio."));

    hymnAudio.appendChild(audio);

    voiceSelect.addEventListener("change", () => {
      const versionSeleccionada = obtenerVersionPorVoz(himno, voiceSelect.value);
      voiceIndicator.textContent = versionSeleccionada.voz || voiceSelect.value;
      verPdf.href = versionSeleccionada.pdf || "#";
      descargarPdf.href = versionSeleccionada.pdf || "#";
      source.src = versionSeleccionada.audio || "";
      audio.load();
    });

    tarjeta.appendChild(hymnMain);
    tarjeta.appendChild(voiceSelectorWrapper);
    tarjeta.appendChild(hymnAudio);
    fragmento.appendChild(tarjeta);
  });

  panelResultados.appendChild(fragmento);
}

function mostrarError(mensaje) {
  panelResultados.innerHTML = `
    <h2 class="section-title">Resultados</h2>
    <p>${mensaje}</p>
  `;
}

function capitalizar(texto) {
  return String(texto).charAt(0).toUpperCase() + String(texto).slice(1);
}

cargarDatos();
