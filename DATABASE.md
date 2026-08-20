# 🗄️ Documentación de Base de Datos (Supabase)

Esta documentación describe la estructura de la base de datos de Supabase, las políticas de Row Level Security (RLS), y las funciones/disparadores (triggers) implementados para el proyecto **Coro - Voces y Partituras**.

---

## 🏗️ Esquema y Estructura de Tablas

### `profiles`
Contiene la información de los perfiles de usuario y sus roles dentro de la aplicación.
* **id**: `uuid` (No nulo, Llave Primaria, vinculada a `auth.users`)
* **email**: `text` (Permite nulos)
* **name**: `text` (Permite nulos, nombre del usuario)
* **role**: `app_role` (No nulo, valor por defecto: `'member'::app_role`)
* **defauld_voice_id**: `integer` (Permite nulos, Llave Foránea a `voices(id)`, voz seleccionada por defecto para el usuario)

### `hymns`
Registros de los himnos del repertorio.
* **id**: `integer` (No nulo, Llave Primaria, autoincrementable)
* **title**: `text` (No nulo)
* **hymn_key**: `text` (Permite nulos)
* **register**: `date` (Permite nulos)
* **version_name**: `text` (Permite nulos)
* **access_level**: `text` (Permite nulos, ej: `'public'`, `'individual'`, `'restricted'`)
* **created_by**: `uuid` (Permite nulos, Llave Foránea a `profiles(id)`, usuario creador/propietario del himno)

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

### `hymn_user_permissions`
Tabla mediadora para permisos individuales asignados explícitamente a un usuario específico por himno (Nivel 2). Poseer un registro en esta tabla otorga automáticamente acceso de lectura y derecho a asociar/compartir el himno con los propios grupos.
* **id**: `bigint` (No nulo, Llave Primaria, autoincrementable)
* **hymn_id**: `integer` (No nulo, Llave Foránea a `hymns`)
* **user_id**: `uuid` (No nulo, Llave Foránea a `profiles`)
* **granted_by**: `uuid` (Permite nulos, Llave Foránea a `profiles`)
* **created_at**: `timestamp with time zone` (Valor por defecto: `now()`)

---

## 🔐 Políticas de Seguridad de Fila (RLS)

Todas las tablas y buckets tienen habilitado RLS para garantizar la integridad y privacidad de los datos musicales.

El sistema funciona con **tres niveles de acceso de lectura**:
1. **Acceso Público**: `hymns.access_level = 'public'` (disponible para todo público, incluso no autenticados).
2. **Acceso Individual (Por Usuario)**: Asignación explícita mediante la tabla `hymn_user_permissions`.
3. **Acceso por Categoría (Por Grupo)**: Heredado colectivamente mediante pertenencia a un grupo (`group_members`) cuya categoría está vinculada al himno (`hymn_category`).

### 1. `voices`
* **Lectura**: Cualquiera puede leer las voces (`SELECT` permitido para todo público).
* **Escritura**: Solo administradores (`public.get_current_user_role() = 'admin'`) pueden insertar o actualizar voces.

### 2. `hymn_voice`
* **Lectura**: Cualquiera puede leer la relación himno-voz (`SELECT` libre).
* **Escritura**: Solo administradores pueden insertar o actualizar estas relaciones.

### 3. `hymns`
* **Lectura (SELECT)**: Evaluado mediante la función `public.user_has_hymn_access(id)`. Permite ver el himno si es público, si tiene permiso individual explícito, o si el usuario pertenece al grupo asociado al himno.
* **Escritura (INSERT/UPDATE/DELETE)**: Permitida a administradores o al usuario creador (`created_by = auth.uid()`).

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
* **Lectura (SELECT)**: Visible si el usuario tiene acceso de lectura al himno en cuestión (`public.user_has_hymn_access(hymn_id)`).
* **Escritura (INSERT/DELETE)**: Evaluado mediante `public.user_can_manage_hymn(hymn_id)` y requiriendo que la categoría pertenezca a un grupo propio. Esto evita que miembros pasivos de otros grupos re-compartan himnos ajenos.

### 8. Storage: Bucket `'hymns'`
* **Lectura (SELECT)**: Evaluado dinámicamente mediante `public.user_has_hymn_access()`.
* **Escritura (INSERT/UPDATE/DELETE)**: Restringido únicamente al rol de administrador o creador del himno.

### 9. `hymn_user_permissions`
* **Lectura (SELECT)**: Visible para administradores o si el registro corresponde al propio usuario (`user_id = auth.uid()`).
* **Escritura (ALL)**: Permitido únicamente para administradores.

### 10. `profiles`
* **Lectura (SELECT)**: Los usuarios pueden leer perfiles públicos o la lógica del sistema lee el perfil del usuario autenticado.
* **Modificación (UPDATE)**: Permitido para que cualquier usuario autenticado modifique únicamente su propio perfil:
  ```sql
  CREATE POLICY "Usuario modifica su propia voz"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
  ```

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

### Función `public.user_has_hymn_access(hymn_id_param INT)`
Evalúa si el usuario actual posee derechos de **lectura / reproducción** sobre un himno según los 3 niveles de acceso.
```sql
CREATE OR REPLACE FUNCTION public.user_has_hymn_access(hymn_id_param INT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Nivel Admin: Acceso total
    IF public.get_current_user_role() = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Nivel 1: Himno Público (visible para todos, incluidos no autenticados)
    IF EXISTS (
        SELECT 1 FROM public.hymns
        WHERE id = hymn_id_param AND access_level = 'public'
    ) THEN
        RETURN TRUE;
    END IF;

    -- Si no está autenticado, no tiene acceso
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Nivel 2: Permiso Individual asignado explícitamente al usuario
    IF EXISTS (
        SELECT 1 FROM public.hymn_user_permissions
        WHERE hymn_id = hymn_id_param AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Nivel 3a: Permiso por Grupo heredado a través de Categorías
    IF EXISTS (
        SELECT 1 
        FROM public.hymn_category hc
        JOIN public.categories c ON hc.category_id = c.id
        JOIN public.group_members gm ON c.group_id = gm.group_id
        WHERE hc.hymn_id = hymn_id_param 
          AND gm.user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Nivel 3b: Categorías de tipo global
    IF EXISTS (
        SELECT 1 
        FROM public.hymn_category hc
        JOIN public.categories c ON hc.category_id = c.id
        WHERE hc.hymn_id = hymn_id_param 
          AND c.type = 'global'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Función `public.user_can_manage_hymn(hymn_id_param INT)`
Evalúa si el usuario actual posee derechos de **gestión / vinculación / compartir** sobre un himno.
```sql
CREATE OR REPLACE FUNCTION public.user_can_manage_hymn(hymn_id_param INT)
RETURNS BOOLEAN AS $$
BEGIN
    -- 1. Admins tienen control total
    IF public.get_current_user_role() = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 2. Himnos Públicos: Cualquier usuario autenticado puede vincularlo a sus categorías de grupo
    IF EXISTS (
        SELECT 1 FROM public.hymns
        WHERE id = hymn_id_param AND access_level = 'public'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 3. Creador original del himno
    IF EXISTS (
        SELECT 1 FROM public.hymns
        WHERE id = hymn_id_param AND created_by = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- 4. Acceso Individual explícito (Nivel 2): Poseer registro en hymn_user_permissions otorga derecho a compartir
    IF EXISTS (
        SELECT 1 FROM public.hymn_user_permissions
        WHERE hymn_id = hymn_id_param AND user_id = auth.uid()
    ) THEN
        RETURN TRUE;
    END IF;

    -- Acceso pasivo por grupo (Nivel 3) NO otorga derecho a re-compartir
    RETURN FALSE;
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
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (
    new.id, 
    new.email, 
    'member', -- Todos los usuarios nuevos inician como miembros por defecto
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Disparador: Sincronización de Correo al Actualizar (`public.handle_update_user()`)
Mantiene actualizado el campo `email` en la tabla pública `profiles` cuando el usuario cambia su correo electrónico en `auth.users`.
```sql
-- Función del Trigger
CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.email IS DISTINCT FROM OLD.email) THEN
    UPDATE public.profiles
    SET email = NEW.email
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_update_user();
```
