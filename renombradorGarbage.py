import os

CARPETA = "./partituras/"

for archivo in os.listdir(CARPETA):
    ruta_original = os.path.join(CARPETA, archivo)

    # Solo procesar archivos
    if not os.path.isfile(ruta_original):
        continue

    # Si contiene "score satb", renombrar
    if "score satb" in archivo.lower():
        nuevo_nombre = archivo.lower().replace("score satb", "todos")
        ruta_nueva = os.path.join(CARPETA, nuevo_nombre)

        os.rename(ruta_original, ruta_nueva)
        print(f"Renombrado: {archivo}  ->  {nuevo_nombre}")

print("\nProceso completado.")
