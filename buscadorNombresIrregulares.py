import os
import re

# Carpeta a revisar
CARPETA = "./partituras"

# Nombres válidos
VALIDOS = {"soprano", "alto", "tenor", "bajo", "piano", "solo", "score satb"}

# Expresión regular: número + "_" + nombre + ".mp3"
PATRON = re.compile(r"^\d+_([a-zA-Z ]+)\.pdf$")

no_coinciden = []

for archivo in os.listdir(CARPETA):
    if not archivo.lower().endswith(".pdf"):
        continue

    match = PATRON.match(archivo)
    if not match:
        no_coinciden.append(archivo)
        continue

    nombre = match.group(1).lower()

    if nombre not in VALIDOS:
        no_coinciden.append(archivo)

print("\nArchivos que NO coinciden con los nombres permitidos:\n")
for a in no_coinciden:
    print(" -", a)

print("\nTotal:", len(no_coinciden))
