/**
 * Servicio de datos para Listas de Reproducción (Playlists)
 * Maneja las consultas a Supabase para la tabla `playlists` y `playlist_hymns`
 */

import supabase from "../config/supabase.js";

/**
 * Obtiene todas las listas creadas por el usuario autenticado
 */
export async function obtenerMisPlaylists() {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) return [];

  const { data, error } = await supabase
    .from("playlists")
    .select(`
      id,
      name,
      description,
      access_level,
      created_by,
      created_at,
      playlist_hymns(id)
    `)
    .eq("created_by", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error al obtener mis playlists:", error);
    throw error;
  }

  return (data || []).map(p => ({
    ...p,
    total_hymns: p.playlist_hymns ? p.playlist_hymns.length : 0
  }));
}

/**
 * Obtiene las listas públicas creadas por miembros de la comunidad
 * @param {string} search - Término de búsqueda opcional
 */
export async function obtenerPlaylistsComunidad(search = "") {
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id;

  let query = supabase
    .from("playlists")
    .select(`
      id,
      name,
      description,
      access_level,
      created_by,
      created_at,
      profiles:created_by (id, name, email),
      playlist_hymns(id)
    `)
    .eq("access_level", "public")
    .order("created_at", { ascending: false });

  if (search.trim()) {
    query = query.ilike("name", `%${search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("❌ Error al obtener playlists de la comunidad:", error);
    throw error;
  }

  return (data || []).map(p => ({
    ...p,
    creator_name: p.profiles?.name || p.profiles?.email || "Usuario de la Comunidad",
    is_own: p.created_by === currentUserId,
    total_hymns: p.playlist_hymns ? p.playlist_hymns.length : 0
  }));
}

/**
 * Crea una nueva lista de reproducción
 * @param {string} name 
 * @param {string} description 
 * @param {string} accessLevel - 'private' (por defecto) o 'public'
 */
export async function crearPlaylist(name, description = "", accessLevel = "private") {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error("Debe estar autenticado para crear una lista.");

  const { data, error } = await supabase
    .from("playlists")
    .insert([{
      name: name.trim(),
      description: description.trim() || null,
      access_level: accessLevel === "public" ? "public" : "private",
      created_by: userId
    }])
    .select()
    .single();

  if (error) {
    console.error("❌ Error al crear la playlist:", error);
    throw error;
  }

  return data;
}

/**
 * Actualiza los datos de una lista (nombre, descripción, visibilidad)
 */
export async function actualizarPlaylist(playlistId, { name, description, access_level }) {
  const payload = {};
  if (name !== undefined) payload.name = name.trim();
  if (description !== undefined) payload.description = description.trim() || null;
  if (access_level !== undefined) payload.access_level = access_level === "public" ? "public" : "private";

  const { data, error } = await supabase
    .from("playlists")
    .update(payload)
    .eq("id", playlistId)
    .select()
    .single();

  if (error) {
    console.error("❌ Error al actualizar playlist:", error);
    throw error;
  }

  return data;
}

/**
 * Elimina una lista de reproducción completa
 */
export async function eliminarPlaylist(playlistId) {
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);

  if (error) {
    console.error("❌ Error al eliminar playlist:", error);
    throw error;
  }

  return true;
}

/**
 * Obtiene el detalle completo de una lista y sus himnos asociados
 * @param {number} playlistId 
 */
export async function obtenerDetallePlaylist(playlistId) {
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUserId = sessionData?.session?.user?.id;

  const { data: playlist, error: pError } = await supabase
    .from("playlists")
    .select(`
      id,
      name,
      description,
      access_level,
      created_by,
      created_at,
      profiles:created_by (id, name, email)
    `)
    .eq("id", playlistId)
    .single();

  if (pError) {
    console.error("❌ Error al obtener detalle de la playlist:", pError);
    throw pError;
  }

  const { data: items, error: iError } = await supabase
    .from("playlist_hymns")
    .select(`
      id,
      playlist_id,
      hymn_id,
      position,
      repeat_count,
      voice_id,
      hymns (
        id,
        title,
        hymn_key,
        version_name
      ),
      voices (
        id,
        voice_name
      )
    `)
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });

  if (iError) {
    console.error("❌ Error al obtener himnos de la playlist:", iError);
    throw iError;
  }

  return {
    ...playlist,
    creator_name: playlist.profiles?.name || playlist.profiles?.email || "Usuario",
    is_own: playlist.created_by === currentUserId,
    items: (items || []).map(item => ({
      id: item.id,
      hymn_id: item.hymn_id,
      title: item.hymns?.title || "Himno Desconocido",
      hymn_key: item.hymns?.hymn_key || "-",
      version_name: item.hymns?.version_name || "-",
      position: item.position,
      repeat_count: item.repeat_count || 1,
      voice_id: item.voice_id || null,
      voice_name: item.voices?.voice_name || "Voz por Defecto"
    }))
  };
}

/**
 * Agrega un himno a una lista de reproducción
 */
export async function agregarHimnoAPlaylist(playlistId, hymnId, voiceId = null, repeatCount = 1) {
  // Obtener la posición máxima actual
  const { data: currentItems } = await supabase
    .from("playlist_hymns")
    .select("position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPos = (currentItems && currentItems.length > 0) ? currentItems[0].position + 1 : 1;

  const { data, error } = await supabase
    .from("playlist_hymns")
    .insert([{
      playlist_id: playlistId,
      hymn_id: hymnId,
      position: nextPos,
      repeat_count: Math.max(1, repeatCount),
      voice_id: voiceId || null
    }])
    .select()
    .single();

  if (error) {
    console.error("❌ Error al agregar himno a la playlist:", error);
    throw error;
  }

  return data;
}

/**
 * Elimina un himno específico de una lista
 */
export async function eliminarHimnoDePlaylist(playlistHymnId) {
  const { error } = await supabase
    .from("playlist_hymns")
    .delete()
    .eq("id", playlistHymnId);

  if (error) {
    console.error("❌ Error al eliminar himno de la playlist:", error);
    throw error;
  }

  return true;
}

/**
 * Actualiza el orden (`position`), repeticiones (`repeat_count`) y voz de un elemento
 */
export async function actualizarItemPlaylist(playlistHymnId, { position, repeat_count, voice_id }) {
  const payload = {};
  if (position !== undefined) payload.position = position;
  if (repeat_count !== undefined) payload.repeat_count = Math.max(1, repeat_count);
  if (voice_id !== undefined) payload.voice_id = voice_id || null;

  const { data, error } = await supabase
    .from("playlist_hymns")
    .update(payload)
    .eq("id", playlistHymnId)
    .select()
    .single();

  if (error) {
    console.error("❌ Error al actualizar ítem de la playlist:", error);
    throw error;
  }

  return data;
}

/**
 * Guarda en lote el orden y repeticiones de los elementos de una lista
 * @param {number} playlistId 
 * @param {Array<{id: number, position: number, repeat_count: number, voice_id?: number}>} items 
 */
export async function guardarOrdenYRepeticiones(playlistId, items) {
  const updates = items.map(item => 
    supabase
      .from("playlist_hymns")
      .update({
        position: item.position,
        repeat_count: Math.max(1, item.repeat_count || 1),
        voice_id: item.voice_id || null
      })
      .eq("id", item.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find(r => r.error);
  if (failed) {
    console.error("❌ Error al guardar orden de la playlist:", failed.error);
    throw failed.error;
  }

  return true;
}

/**
 * Clona/duplica una playlist existente para el usuario actual
 * @param {number} originalPlaylistId 
 * @param {string} nuevoNombreOpcional 
 */
export async function duplicarPlaylist(originalPlaylistId, nuevoNombreOpcional = null) {
  const original = await obtenerDetallePlaylist(originalPlaylistId);
  const nombreCopia = nuevoNombreOpcional || `Copia de ${original.name}`;

  // 1. Crear nueva lista propia (privada por defecto)
  const nuevaPlaylist = await crearPlaylist(nombreCopia, original.description || "", "private");

  // 2. Duplicar todos los ítems
  if (original.items && original.items.length > 0) {
    const itemsToInsert = original.items.map(item => ({
      playlist_id: nuevaPlaylist.id,
      hymn_id: item.hymn_id,
      position: item.position,
      repeat_count: item.repeat_count,
      voice_id: item.voice_id || null
    }));

    const { error } = await supabase
      .from("playlist_hymns")
      .insert(itemsToInsert);

    if (error) {
      console.error("❌ Error al copiar ítems a la nueva playlist:", error);
      throw error;
    }
  }

  return nuevaPlaylist;
}
