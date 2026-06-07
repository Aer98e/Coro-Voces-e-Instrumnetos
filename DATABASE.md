# 🗄️ Documentación de Base de Datos (Supabase)

Esta documentación describe la estructura de la base de datos de Supabase, las políticas de Row Level Security (RLS), y las funciones/disparadores (triggers) implementados para el proyecto **Coro - Voces y Partituras**.

---

## 🏗️ Esquema y Estructura de Tablas

### `profiles`
Contiene la información de los perfiles de usuario y sus roles dentro de la aplicación.
* **id**: `uuid` (No nulo, Llave Primaria, vinculada a `auth.users`)
* **email**: `text` (Permite nulos)
* **role**: `app_role` (No nulo, valor por defecto: `'member'::app_role`)

### `hymns`
Registros de los himnos del repertorio.
* **id**: `integer` (No nulo, Llave Primaria, autoincrementable)
* **title**: `text` (No nulo)
* **hymn_key**: `text` (Permite nulos)
* **register**: `date` (Permite nulos)
* **version_name**: `text` (Permite nulos)
* **access_level**: `text` (Permite nulos, ej: `'public'`, `'private'`, o `'hidden'`)

### `voices`
Voces de coro disponibles en la aplicación.
* **id**: `integer` (No nulo, Llave Primaria, autoincrementable)
* **voice_name**: `text` (No nulo, ej: `'Soprano'`, `'Contralto'`, `'Tenor'`, `'Bajo'`)

### `hymn_voice`
Tabla mediadora que asocia himnos con voces y contiene sus archivos del Storage.
* **id**: `integer` (No nulo, Llave Primaria, autoincrementable)
* **hymn_id**: `integer` (No nulo, Llave Foránea a `hymns`)
* **voice_id**: `integer` (No nulo, Llave Foránea a `voices`)
* **audio_url**: `text` (Permite nulos, ruta relativa en storage: `audios/...`)
* **pdf_url**: `text` (Permite nulos, ruta relativa en storage: `scores/...`)

### `categories`
Categorías de agrupación de los himnos.
* **id**: `integer` (No nulo, Llave Primaria, autoincrementable)
* **category_name**: `text` (No nulo)
* **type**: `text` (No nulo, valor por defecto: `'global'::text`)
* **group_id**: `integer` (Permite nulos, Llave Foránea a `groups`)
* **created_by**: `uuid` (No nulo, Llave Foránea a `profiles`)

### `hymn_category`
Tabla mediadora que asocia himnos con categorías.
* **hymn_id**: `integer` (No nulo, Llave Foránea a `hymns`)
* **category_id**: `integer` (No nulo, Llave Foránea a `categories`)

### `groups`
Grupos o coros personalizados creados por los usuarios.
* **id**: `integer` (No nulo, Llave Primaria, autoincrementable)
* **group_name**: `text` (No nulo)
* **created_by**: `uuid` (No nulo, Llave Foránea a `profiles`)

### `group_members`
Miembros que pertenecen a cada grupo.
* **group_id**: `integer` (No nulo, Llave Foránea a `groups`)
* **user_id**: `uuid` (No nulo, Llave Foránea a `profiles`)
* **added_by**: `uuid` (No nulo, Llave Foránea a `profiles`)
* **added_at**: `timestamp with time zone` (Valor por defecto: `now()`)

---

## 🔐 Políticas de Seguridad de Fila (RLS)

Todas las tablas y buckets tienen habilitado RLS para garantizar la integridad y privacidad de los datos musicales.

### 1. `voices`
* **Lectura**: Cualquiera puede leer las voces (`SELECT` permitido para todo público).
* **Escritura**: Solo administradores (`public.get_current_user_role() = 'admin'`) pueden insertar o actualizar voces.

### 2. `hymn_voice`
* **Lectura**: Cualquiera puede ver las relaciones (`SELECT` permitido para todo público).
* **Escritura**: Solo administradores pueden insertar o actualizar estas relaciones.

### 3. `hymns`
* **Lectura (SELECT)**:
  * Nivel de acceso `public` es visible por cualquier usuario (autenticado o anónimo).
  * Nivel de acceso `private` es visible solo por usuarios autenticados (`auth.role() = 'authenticated'`).
  * Los administradores pueden ver todos los niveles de acceso (incluyendo `hidden`).
* **Escritura (INSERT/UPDATE/DELETE)**: Permitida única y exclusivamente a usuarios administradores.

### 4. `groups`
* **Lectura (SELECT)**: Visible para administradores, creadores del grupo (`created_by = auth.uid()`) o si el usuario autenticado pertenece a los miembros del grupo (`public.is_group_member(id)`).
* **Creación (INSERT)**: Permitido para roles `special` y `admin`, asignándose a sí mismos como creadores (`created_by = auth.uid()`).
* **Modificación (ALL)**: Permitido para el creador del grupo o administradores.

### 5. `group_members`
* **Lectura (SELECT)**: Visible si el registro corresponde al propio usuario (`user_id = auth.uid()`), si es administrador, o si el usuario es creador del grupo asociado.
* **Adición (INSERT)**: Permitido para administradores, o usuarios `special` que sean dueños del grupo, registrando su propia firma (`added_by = auth.uid()`).
* **Eliminación (DELETE)**: Permitido para administradores o para el creador del grupo asociado.

### 6. `categories`
* **Lectura (SELECT)**:
  * Categorías de tipo `global` son visibles para todo público.
  * Todas las categorías son visibles para administradores.
  * Categorías de tipo `group` son visibles para miembros activos del grupo respectivo.
  * Categorías propias son visibles para usuarios de tipo `special` si son creadores.
* **Creación (INSERT)**: Permitido para administradores o para usuarios `special` asociando la categoría a su grupo.
* **Modificación (ALL)**: Permitido para administradores o el creador del registro.

### 7. `hymn_category`
* **Lectura (SELECT)**: Visible si el usuario tiene acceso al menos al himno en cuestión.
* **Escritura (INSERT/DELETE)**: Permitido para administradores, o para usuarios con rol `special` en las categorías globales o asociadas a sus grupos.

### 8. Storage: Bucket `'hymns'`
* **Lectura (SELECT)**:
  * Archivos de himnos con `access_level = 'public'` son visibles de manera pública.
  * Archivos de himnos públicos y privados son visibles para usuarios autenticados.
  * Administradores tienen acceso total a todos los archivos.
* **Escritura (INSERT/UPDATE/DELETE)**: Restringido únicamente al rol de administrador.

---

## ⚙️ Funciones Personalizadas y Triggers (PostgreSQL)

Estas funciones corren internamente en PostgreSQL para gestionar el comportamiento del RLS.

### Función `public.get_current_user_role()`
Retorna el rol asignado al usuario que realiza la consulta actual.
```sql
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.app_role AS $$
DECLARE
  current_user_role public.app_role;
BEGIN
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  RETURN COALESCE(current_user_role, 'member'::public.app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Función `public.is_group_member(group_id_param INT)`
Verifica si el usuario autenticado pertenece a un grupo específico.
```sql
CREATE OR REPLACE FUNCTION public.is_group_member(group_id_param INT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = group_id_param AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Disparador: Creación Automática de Perfiles (`public.handle_new_user()`)
Se ejecuta automáticamente cuando se registra un usuario en Supabase Auth (`auth.users`) para crear su perfil respectivo en la tabla pública `profiles`.
```sql
-- Función del Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    new.id, 
    new.email, 
    'member' -- Todos los usuarios nuevos inician como miembros por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
