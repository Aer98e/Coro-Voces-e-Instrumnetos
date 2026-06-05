from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

print("URL:", url)
print("KEY empieza con:", key[:10] if key else None)

supabase = create_client(url, key)

try:
    # Hacemos una consulta mínima a PostgREST
    response = supabase.table("hymns").select("id").limit(1).execute()
    print("Respuesta:", response.data)
    print("Conexión OK")
except Exception as e:
    print("❌ Error al conectar:", e)
