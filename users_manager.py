from supabase import create_client
from dotenv import load_dotenv
import os

# Cargar variables desde .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
USER_ID = os.getenv("ADMIN_USER_ID")

supabase = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

def set_admin_role():
    response = supabase.auth.admin.update_user_by_id(
        USER_ID,
        {
            "user_metadata": {
                "role": "admin"
            }
        }
    )
    print(response)

if __name__ == "__main__":
    set_admin_role()
