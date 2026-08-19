/**
 * Servicio de datos para himnos
 * Maneja la carga y gestión de datos desde Supabase
 */

import supabase from "../config/supabase.js";

/**
 * Transforma datos de Supabase a estructura compatible con la UI
 * @param {Object} hymn - Datos de la tabla hymns
 * @param {Array} voiceRelations - Relaciones de hymn_voice con JOIN a voices
 * @param {Array} categoryRelations - Relaciones de hymn_category con JOIN a categories
 * @returns {Object} Objeto himno transformado (sin URLs aún)
 */
function transformarHimno(hymn, voiceRelations = [], categoryRelations = []) {
  return {
    id: hymn.id,
    titulo: hymn.title,
    tono: hymn.hymn_key || "Desconocido",
    fecha_registro: hymn.register,
    categorias: categoryRelations
      .map(rel => {
        const cat = rel.categories;
        if (!cat) return null;
        if (cat.type === 'group' && cat.groups?.group_name) {
          return `${cat.category_name} (${cat.groups.group_name})`;
        }
        return cat.category_name;
      })
      .filter(Boolean),
    versiones: voiceRelations
      .map(rel => ({
        voz: rel.voices?.voice_name || "Desconocida",
        audioPath: rel.audio_url || "",
        pdfPath: rel.pdf_url || ""
      }))
      .filter(v => v.audioPath || v.pdfPath)
  };
}

/**
 * Genera URLs firmadas para todas las versiones de un himno
 * @param {Object} himno - Objeto himno con paths internos
 * @returns {Promise<Object>} Himno con URLs firmadas generadas
 */
/**
 * Genera Signed URL (URL firmada) para archivos en Supabase Storage
 * Las URLs firmadas expiran después del tiempo especificado
 * @param {string} rutaInterna - Ruta interna del archivo (ej: "audios/1/soprano.mp3")
 * @param {number} expiresIn - Tiempo de expiración en segundos (default: 30 min)
 * @returns {Promise<string>} URL firmada completa o string vacío
 */
export async function generarURLFirmada(rutaInterna, expiresIn = 1800) {
  if (!rutaInterna) {
    return "";
  }

  try {
    const { data, error } = await supabase.storage
      .from("hymns")
      .createSignedUrl(rutaInterna, expiresIn);

    if (error) {
      console.error(`❌ Error Supabase para "${rutaInterna}":`, {
        code: error.code,
        message: error.message,
        status: error.status
      });
      return "";
    }

    if (!data || !data.signedUrl) {
      console.error(`❌ Sin URL en respuesta para "${rutaInterna}"`);
      return "";
    }

    return data.signedUrl;
  } catch (error) {
    console.error(`❌ Exception generando URL para "${rutaInterna}":`, error.message);
    return "";
  }
}

/**
 * Carga todos los himnos desde Supabase con sus voces y categorías
 * @returns {Promise<Array>} Promesa con la lista de himnos transformados
 * @throws {Error} Si hay error al cargar los datos
 */
export async function cargarHimnos() {
  try {
    // Consultar himnos con relaciones
    const { data: hymns, error: hymnError } = await supabase
      .from("hymns")
      .select("*")
      .order("id", { ascending: true });

    if (hymnError) throw hymnError;
    if (!hymns || hymns.length === 0) return [];

    // Obtener IDs de himnos
    const hymnIds = hymns.map(h => h.id);

    // Consultar voces (con relación a voices)
    const { data: voiceRelations, error: voiceError } = await supabase
      .from("hymn_voice")
      .select("hymn_id, audio_url, pdf_url, voices(id, voice_name)")
      .in("hymn_id", hymnIds);

    if (voiceError) throw voiceError;

    // Consultar categorías (con relación a categories y groups)
    const { data: categoryRelations, error: categoryError } = await supabase
      .from("hymn_category")
      .select("hymn_id, categories(id, category_name, type, groups(group_name))")
      .in("hymn_id", hymnIds);

    if (categoryError) throw categoryError;

    // Agrupar relaciones por hymn_id
    const voicesByHymn = {};
    const categoriesByHymn = {};

    voiceRelations.forEach(rel => {
      if (!voicesByHymn[rel.hymn_id]) voicesByHymn[rel.hymn_id] = [];
      voicesByHymn[rel.hymn_id].push(rel);
    });

    categoryRelations.forEach(rel => {
      if (!categoriesByHymn[rel.hymn_id]) categoriesByHymn[rel.hymn_id] = [];
      categoriesByHymn[rel.hymn_id].push(rel);
    });

    // Transformar cada himno
    let hymnos = hymns.map(hymn =>
      transformarHimno(
        hymn,
        voicesByHymn[hymn.id] || [],
        categoriesByHymn[hymn.id] || []
      )
    );

    return hymnos;
  } catch (error) {
    console.error("Error cargando himnos desde Supabase:", error);
    throw error;
  }
}

/**
 * Carga las categorías únicas desde Supabase
 * @returns {Promise<Array>} Promesa con la lista de categorías únicas
 * @throws {Error} Si hay error al cargar los datos
 */
export async function cargarCategoriasUnicas() {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("category_name, type, groups(group_name)")
      .order("category_name", { ascending: true });

    if (error) throw error;
    
    const unique = [];
    const seen = new Set();
    for (const row of data) {
      const groupName = (row.type === 'group' && row.groups?.group_name) ? row.groups.group_name : null;
      const label = groupName ? `${row.category_name} (${groupName})` : row.category_name;
      
      if (!seen.has(label)) {
        seen.add(label);
        unique.push({
          name: row.category_name,
          groupName: groupName,
          type: row.type || 'global',
          label: label
        });
      }
    }
    return unique;
  } catch (error) {
    console.error("Error cargando categorías desde Supabase:", error);
    throw error;
  }
}

/**
 * Carga todas las voces desde Supabase
 * @returns {Promise<Array>} Promesa con la lista de voces
 * @throws {Error} Si hay error al cargar los datos
 */
export async function cargarVoces() {
  try {
    const { data, error } = await supabase
      .from("voices")
      .select("id, voice_name")
      .order("id", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error cargando voces desde Supabase:", error);
    throw error;
  }
}

export default {
  cargarHimnos,
  cargarCategoriasUnicas,
  generarURLFirmada,
  cargarVoces
};
