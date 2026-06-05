import os
import re
from supabase import create_client, Client
from dotenv import load_dotenv

# ============================
# CONFIGURACIÓN
# ============================

CARPETA_LOCAL = r"./partituras/"
BUCKET = "hymns"
CARPETA_BUCKET = "scores"

load_dotenv()

# Inicializar Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# Patrón válido: número + "_" + nombre + ".mp3"
PATRON = re.compile(r"^(\d+)_([a-zA-Z0-9 ]+)\.pdf$")

errores = []
subidos = []
saltados = []

# ============================
# PROCESO DE SUBIDA REAL
# ============================

for archivo in os.listdir(CARPETA_LOCAL):
    ruta_local = os.path.join(CARPETA_LOCAL, archivo)

    if not os.path.isfile(ruta_local):
        continue

    if not archivo.lower().endswith(".pdf"):
        errores.append((archivo, "No es un archivo .pdf"))
        continue

    match = PATRON.match(archivo)
    if not match:
        errores.append((archivo, "Nombre inválido, no coincide con patrón NOMBRE.pdf"))
        continue

    numero = match.group(1)
    ruta_destino = f"{CARPETA_BUCKET}/{numero}/{archivo}"

    # Verificar si ya existe en Supabase
    try:
        existe = supabase.storage.from_(BUCKET).list(f"{CARPETA_BUCKET}/{numero}")
        if any(item["name"] == archivo for item in existe):
            saltados.append((archivo, "Ya existe en Supabase"))
            continue
    except Exception as e:
        errores.append((archivo, f"Error verificando existencia: {e}"))
        continue

    # Subir archivo
    try:
        with open(ruta_local, "rb") as f:
            supabase.storage.from_(BUCKET).upload(ruta_destino, f)
        subidos.append(archivo)
    except Exception as e:
        errores.append((archivo, f"Error al subir: {e}"))

# ============================
# RESULTADOS
# ============================

print("\n=== ARCHIVOS SUBIDOS ===")
for a in subidos:
    print(" +", a)
print("Total subidos:", len(subidos))

print("\n=== ARCHIVOS SALTADOS (ya existían) ===")
for a, motivo in saltados:
    print(" ~", a, "→", motivo)
print("Total saltados:", len(saltados))

print("\n=== ERRORES ===")
for a, motivo in errores:
    print(" !", a, "→", motivo)
print("Total errores:", len(errores))
