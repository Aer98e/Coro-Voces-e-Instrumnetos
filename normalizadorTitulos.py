from dotenv import load_dotenv
import unicodedata
import re
from supabase import create_client, Client
import os

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
TABLA_NOMBRE = "hymns"

CARPETA_AUDIOS = "./partituras"
ARCHIVO_LOG = "errores_renombrado.txt"

def limpiar_texto(texto: str) -> str:
    """
    Elimina tildes, comas, puntos, caracteres especiales, 
    espacios dobles y lo pasa a minúsculas.
    """
    if not texto:
        return ""
    
    # 1. Pasar a minúsculas y quitar espacios en los extremos
    texto = texto.lower().strip()
    
    # 2. Quitar tildes y diéresis (ej. 'ún' -> 'un', 'ó' -> 'o')
    texto = ''.join(
        c for c in unicodedata.normalize('NFD', texto)
        if unicodedata.category(c) != 'Mn'
    )
    
    # 3. Eliminar todo lo que no sean letras o números (comas, paréntesis, puntos, etc.)
    # Esto mantiene los espacios temporales para no pegar palabras incorrectamente
    texto = re.sub(r'[^a-z0-9\s]', '', texto)
    
    # 4. Eliminar espacios múltiples y unificar en espacios simples o quitar del todo
    # Unificar espacios es más seguro para evitar colisiones: "aun de noche"
    texto = " ".join(texto.split())
    
    # NOTA: Si quieres máxima coincidencia agresiva, puedes quitar todos los espacios
    # activando la siguiente línea:
    # texto = texto.replace(" ", "")
    
    return texto

def conectar_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def obtener_datos_supabase(supabase: Client):
    try:
        response = supabase.table(TABLA_NOMBRE).select("*").execute()
        return response.data
    except Exception as e:
        print(f"❌ Error en Supabase: {e}")
        return []

def renombrar_archivos():
    supabase = conectar_supabase()
    print("🔄 Obteniendo datos de Supabase...")
    datos = obtener_datos_supabase(supabase)
    
    if not datos:
        print("🛑 No se obtuvieron datos.")
        return
    
    # NUEVO: El mapa ahora guarda la versión ULTRA LIMPIA del título como clave
    mapa_titulos = {}
    for item in datos:
        clave_limpia = limpiar_texto(item['title'])
        if clave_limpia:
            mapa_titulos[clave_limpia] = item['id']

    if not os.path.exists(CARPETA_AUDIOS):
        print(f"🛑 La carpeta '{CARPETA_AUDIOS}' no existe.")
        return

    archivos_en_carpeta = os.listdir(CARPETA_AUDIOS)
    errores = []

    print(f"🎵 Procesando archivos con normalización activa...\n")

    for nombre_archivo in archivos_en_carpeta:
        ruta_original = os.path.join(CARPETA_AUDIOS, nombre_archivo)
        if not os.path.isfile(ruta_original) or not nombre_archivo.lower().endswith('.pdf'):
            continue

        try:
            if " - " not in nombre_archivo:
                raise ValueError("El archivo no tiene el separador ' - '")

            titulo_archivo, resto = nombre_archivo.split(" - ", 1)
            
            # NUEVO: Limpiamos agresivamente el título extraído del archivo
            titulo_archivo_limpio = limpiar_texto(titulo_archivo)

            # Buscamos en nuestro mapa ultra limpio
            if titulo_archivo_limpio in mapa_titulos:
                id_supabase = mapa_titulos[titulo_archivo_limpio]
                
                # Para el resto del nombre (ej: "Soprano.mp3")
                # Solo limpiamos minúsculas y caracteres extraños de la extensión,
                # pero mantenemos su estructura.
                resto_limpio = resto.lower().strip()
                
                nuevo_nombre = f"{id_supabase}_{resto_limpio}"
                ruta_nueva = os.path.join(CARPETA_AUDIOS, nuevo_nombre)

                os.rename(ruta_original, ruta_nueva)
                print(f"✅ ¡Coincidencia encontrada! '{nombre_archivo}' -> '{nuevo_nombre}'")
            else:
                raise ValueError(f"No se encontró coincidencia (Texto limpio buscado: '{titulo_archivo_limpio}')")

        except Exception as e:
            print(f"❌ Error con '{nombre_archivo}': {e}")
            errores.append(f"Archivo: {nombre_archivo} | Razón: {e}")

    if errores:
        with open(ARCHIVO_LOG, "w", encoding="utf-8") as f:
            f.write("\n".join(errores))
        print(f"\n⚠️ Proceso terminado. Algunos archivos fallaron, revisa '{ARCHIVO_LOG}'")
    else:
        print("\n✨ ¡Proceso completado con éxito! Cero errores de coincidencia.")

if __name__ == "__main__":
    renombrar_archivos()