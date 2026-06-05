import os
import re

# Carpeta local donde están tus audios
CARPETA_LOCAL = r"./audios/"
type_file=".mp3"

# Patrón válido: número + "_" + nombre + ".mp3"
PATRON = re.compile(r"^(\d+)_([a-zA-Z0-9 ]+)\.mp3$")

# Simulación de resultados
simulacion = []

errores = []

for archivo in os.listdir(CARPETA_LOCAL):
    ruta = os.path.join(CARPETA_LOCAL, archivo)

    # Solo archivos
    if not os.path.isfile(ruta):
        continue

    # Solo mp3
    if not archivo.lower().endswith(type_file):
        errores.append((archivo, f"No es un archivo {type_file}"))
        continue

    match = PATRON.match(archivo)
    if not match:
        errores.append((archivo, f"Nombre inválido, no coincide con patrón NOMBRE{type_file}"))
        continue

    numero = match.group(1)
    nombre = match.group(2)

    # Ruta destino simulada en Supabase
    ruta_destino = f"audios/{numero}/{archivo}"

    simulacion.append((archivo, ruta_destino))

# Mostrar resultados
print("\n=== SIMULACIÓN DE SUBIDA ===\n")
for origen, destino in simulacion:
    print(f"Subir: {origen}  →  {destino}")

print("\nTotal simulados:", len(simulacion))

print("\n=== ERRORES DETECTADOS ===\n")
for archivo, motivo in errores:
    print(f"{archivo}  →  ERROR: {motivo}")

print("\nTotal errores:", len(errores))
