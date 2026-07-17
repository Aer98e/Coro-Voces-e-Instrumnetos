/**
 * Configuración de cliente Supabase
 * Inicializa la conexión con la base de datos
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Variables de entorno Supabase no configuradas');
  console.error('Por favor, crea un archivo .env en la raíz del proyecto con:');
  console.error('  VITE_SUPABASE_URL=https://tu-proyecto.supabase.co');
  console.error('  VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui');
  throw new Error('Supabase no está configurado correctamente');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Verifica la contraseña de un usuario de forma aislada sin alterar la sesión actual del cliente principal.
 * @param {string} email - Correo del usuario
 * @param {string} password - Contraseña a verificar
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function verificarPassword(email, password) {
  try {
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    
    const { error } = await tempClient.auth.signInWithPassword({
      email,
      password
    });
    
    return { success: !error, error };
  } catch (err) {
    return { success: false, error: err };
  }
}

export default supabase;
