/**
 * Lógica de dominio para himnos
 * Operaciones y transformaciones relacionadas con datos de himnos
 */

/**
 * Extrae todas las categorías únicas de una lista de himnos
 * @param {Array} lista - Lista de himnos
 * @returns {Array} Array de categorías únicas ordenadas
 */
export function obtenerCategoriasUnicas(lista) {
  const todas = lista.flatMap(himno => {
    const categorias = himno.categorias ?? himno.categoria;
    if (Array.isArray(categorias)) {
      return categorias.filter(Boolean);
    }
    return categorias ? [categorias] : [];
  });
  return Array.from(new Set(todas)).sort();
}

/**
 * Obtiene las categorías de un himno específico
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
 * Obtiene la versión de un himno para una voz específica
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
  const seleccion = versiones.find(
    v => String(v.voz).toLowerCase() === String(voz).toLowerCase()
  );
  return seleccion || versiones[0];
}

/**
 * Filtra himnos por texto de búsqueda y categoría
 * @param {Array} himnos - Lista de himnos a filtrar
 * @param {string} texto - Texto de búsqueda
 * @param {string} categoria - Categoría a filtrar
 * @returns {Array} Himnos filtrados
 */
export function filtrarHimnos(himnos, texto, categoria) {
  return himnos.filter(himno => {
    const titulo = (himno.titulo ?? "").toLowerCase();
    const id = String(himno.id ?? "");
    const categorias = obtenerCategorias(himno).map(c => c.toLowerCase());

    const coincideTexto =
      texto === "" ||
      titulo.includes(texto) ||
      id.includes(texto) ||
      categorias.some(c => c.includes(texto));

    const coincideCategoria = categoria === "" || categorias.includes(categoria);

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
    copia.sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? ""));
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
  obtenerCategoriasUnicas,
  obtenerCategorias,
  obtenerVersionPorVoz,
  filtrarHimnos,
  ordenarHimnos
};
