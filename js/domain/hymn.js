/**
 * Lógica de dominio para himnos
 * Operaciones y transformaciones relacionadas con datos de himnos
 */

/**
 * Obtiene las categorías de un himno
 * Las categorías ya vienen populadas desde Supabase
 * @param {Object} himno - Objeto himno
 * @returns {Array} Array de categorías del himno
 */
export function obtenerCategorias(himno) {
  const categorias = himno.categorias ?? himno.categoria;
  if (Array.isArray(categorias)) {
    return categorias.filter(Boolean);
  }
  return categorias ? [categorias] : [];
}

/**
 * Obtiene la versión de un himno para una voz específica con soporte para familias de voces (ej. Soprano 1 -> Soprano)
 * @param {Object} himno - Objeto himno
 * @param {string} voz - Voz a buscar (opcional)
 * @returns {Object} Versión del himno
 */
export function obtenerVersionPorVoz(himno, voz) {
  const versiones = himno.versiones ?? himno.voces ?? [];
  if (!Array.isArray(versiones) || versiones.length === 0) {
    return { voz: "Desconocida", audio: "", pdf: "" };
  }
  if (!voz) {
    return versiones[0];
  }

  const vozNormalizada = String(voz).trim().toLowerCase();

  // 1. Coincidencia exacta
  const exacta = versiones.find(
    v => String(v.voz).trim().toLowerCase() === vozNormalizada
  );
  if (exacta) return exacta;

  // Helper para identificar la familia principal de la voz
  const obtenerFamiliaVoz = (str) => {
    const s = String(str || "").toLowerCase();
    if (s.includes("soprano")) return "soprano";
    if (s.includes("alto") || s.includes("contralto")) return "alto";
    if (s.includes("tenor")) return "tenor";
    if (s.includes("bajo")) return "bajo";
    if (s.includes("piano")) return "piano";
    if (s.includes("solo")) return "solo";
    return s;
  };

  const familiaBuscada = obtenerFamiliaVoz(vozNormalizada);

  // 2. Coincidencia por familia de voz (ej: Soprano -> Soprano 1, Alto -> Alto 1)
  const porFamilia = versiones.find(v => {
    const familiaVersion = obtenerFamiliaVoz(v.voz);
    return familiaVersion === familiaBuscada;
  });

  return porFamilia || versiones[0];
}

/**
 * Normaliza un texto eliminando tildes/diacríticos y comas, convirtiendo a minúsculas
 * @param {string} str - Texto a normalizar
 * @returns {string} Texto normalizado
 */
function normalizarTexto(str) {
  return String(str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remueve tildes y diacríticos
    .replace(/,/g, "")               // Remueve comas
    .trim();
}

/**
 * Limpia un título para ordenar alfabéticamente ignorando signos de puntuación comunes
 * @param {string} titulo - Título a limpiar
 * @returns {string} Título limpio
 */
function limpiarParaOrdenar(titulo) {
  return String(titulo ?? "")
    .replace(/[¿?¡!«»"'\(\)\[\]\.,_\-]/g, "") // Remueve signos de interrogación, admiración y puntuación
    .trim()
    .toLowerCase();
}

/**
 * Filtra himnos por texto de búsqueda y categoría
 * @param {Array} himnos - Lista de himnos a filtrar
 * @param {string} texto - Texto de búsqueda
 * @param {string} categoria - Categoría a filtrar
 * @returns {Array} Himnos filtrados
 */
export function filtrarHimnos(himnos, texto, categoria) {
  const queryNormalizado = normalizarTexto(texto);

  return himnos.filter(himno => {
    const rawCategorias = obtenerCategorias(himno);
    const coincideCategoria = categoria === "" || rawCategorias.includes(categoria);

    const titulo = normalizarTexto(himno.titulo);
    const id = String(himno.id ?? "").toLowerCase();
    const categoriasNormalizadas = rawCategorias.map(c => normalizarTexto(c));

    const coincideTexto =
      queryNormalizado === "" ||
      titulo.includes(queryNormalizado) ||
      id.includes(queryNormalizado) ||
      categoriasNormalizadas.some(c => c.includes(queryNormalizado));

    return coincideTexto && coincideCategoria;
  });
}

/**
 * Ordena himnos según el criterio especificado
 * @param {Array} himnos - Lista de himnos a ordenar
 * @param {string} orden - Criterio de orden (titulo, reciente, antiguo)
 * @returns {Array} Himnos ordenados
 */
export function ordenarHimnos(himnos, orden) {
  const copia = [...himnos];

  if (orden === "titulo") {
    copia.sort((a, b) => {
      const cleanA = limpiarParaOrdenar(a.titulo);
      const cleanB = limpiarParaOrdenar(b.titulo);
      const comp = cleanA.localeCompare(cleanB, "es", { sensitivity: "base" });
      if (comp !== 0) return comp;
      return cleanA.localeCompare(cleanB, "es");
    });
  } else if (orden === "reciente") {
    copia.sort((a, b) => {
      const fechaA = new Date(a.fecha_registro || 0).getTime();
      const fechaB = new Date(b.fecha_registro || 0).getTime();
      return fechaB - fechaA;
    });
  } else if (orden === "antiguo") {
    copia.sort((a, b) => {
      const fechaA = new Date(a.fecha_registro || 0).getTime();
      const fechaB = new Date(b.fecha_registro || 0).getTime();
      return fechaA - fechaB;
    });
  }

  return copia;
}

export default {
  obtenerCategorias,
  obtenerVersionPorVoz,
  filtrarHimnos,
  ordenarHimnos
};
