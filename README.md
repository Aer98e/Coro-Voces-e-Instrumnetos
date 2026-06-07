# Coro - Voces y Partituras

Aplicación web para gestionar audios de ensayo y partituras de coro, utilizando Supabase como base de datos.

## 🚀 Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear archivo `.env`

En la raíz del proyecto, copia el archivo `.env.example` y renómbralo a `.env`:

```bash
cp .env.example .env
```

Luego, reemplaza los valores con tus credenciales de Supabase:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

**Dónde obtener estas credenciales:**
1. Ve a [https://supabase.com](https://supabase.com)
2. Abre tu proyecto
3. Ve a **Settings → API → Project URL** (copia como `VITE_SUPABASE_URL`)
4. Ve a **Settings → API → Project API keys → anon public** (copia como `VITE_SUPABASE_ANON_KEY`)

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación se abrirá automáticamente en `http://localhost:5173`

## 📦 Scripts disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera la versión optimizada para producción en la carpeta `dist`
- `npm run preview` - Visualiza la versión de producción localmente

## 🏗️ Estructura de la aplicación

```
js/
├── config/
│   ├── constants.js      # Constantes
│   ├── selectors.js      # Selectores del DOM
│   └── supabase.js       # Configuración de Supabase
├── domain/
│   └── hymn.js           # Lógica de negocio
├── services/
│   └── hymnService.js    # Consultas a Supabase
├── ui/
│   ├── components/       # Componentes reutilizables
│   ├── renderer.js       # Motor de renderización
│   └── errorHandler.js   # Manejo de errores
├── utils/
│   └── formatters.js     # Funciones de utilidad
└── main.js               # Punto de entrada
```

## 🌐 Deployment en GitHub Pages

La aplicación está configurada para desplegarse automáticamente en GitHub Pages usando GitHub Actions.

**Instrucciones completas**: Ver [GITHUB_PAGES.md](GITHUB_PAGES.md)

**Resumen rápido:**
1. Actualiza el nombre del repositorio en `vite.config.js` (en la línea `base: '...'`)
2. Activa GitHub Pages en Settings → Pages → GitHub Actions
3. Push a GitHub - ¡el deployment se hace automáticamente!

## 🗄️ Estructura de Supabase

### Tablas principales

- **hymns**: Información de himnos (id, title, hymn_key, register, access_level)
- **voices**: Voces disponibles (id, voice_name)
- **categories**: Categorías de himnos (id, category_name)
- **hymn_voice**: Relación muchos-a-muchos entre himnos y voces (hymn_id, voice_id, audio_url, pdf_url)
- **hymn_category**: Relación muchos-a-muchos entre himnos y categorías (hymn_id, category_id)

## 🐛 Solución de problemas

### Error: "Variables de entorno Supabase no configuradas"

✅ **Solución:**
1. Asegúrate de haber creado el archivo `.env` en la raíz
2. Verifica que tenga las variables correctas
3. Reinicia el servidor (`npm run dev`)

### Error: "Cannot GET /favicon.ico"

Este es un error menor que no afecta la funcionalidad. Si deseas eliminarlo, crea un archivo `favicon.ico` en la raíz del proyecto.

## ⚠️ Pendientes y Notas de Desarrollo

### 1. Integración de la Interfaz de Administración (`interfaz_admin`)
Actualmente, la interfaz de administración (ubicada en [interfaz_admin](file:///d:/DAaron/Programming%20Proyects/Mi%20Pages/ChoirVoicesAndSheetMusic/interfaz_admin/)) funciona como una **maqueta interactiva local**:
* Carga datos de prueba desde [data/data.json](file:///d:/DAaron/Programming%20Proyects/Mi%20Pages/ChoirVoicesAndSheetMusic/data/data.json).
* Las acciones de añadir, editar o eliminar registros solo ocurren en la memoria del navegador y no se guardan en la base de datos de Supabase ni en el archivo JSON.
* **Pendiente**: Conectar esta interfaz con el cliente de Supabase (`supabase.js`) usando llamadas `insert`, `update` y `delete` para persistir los datos de forma real.

### 2. Estructura y Subida de Archivos en Supabase Storage
Para que la aplicación funcione en producción, los archivos de audio y las partituras deben subirse al bucket `"hymns"` de Supabase Storage:
* **Estructura del Storage**: Se sugiere mantener una estructura organizada:
  * `audios/<id_himno>/` para las pistas de audio (ej: `audios/1/soprano.mp3`).
  * `scores/<id_himno>/` para las partituras en PDF (ej: `scores/1/soprano.pdf`).
* Las rutas relativas de estos archivos deben registrarse en la tabla mediadora `hymn_voice` bajo las columnas `audio_url` y `pdf_url` respectivamente.

### 3. Configuración de RLS (Row Level Security)
En Supabase, debes configurar las siguientes políticas para proteger tu base de datos y tus archivos:
* **Lectura**: Permitir acceso de lectura pública (`anon`) a las tablas del sistema y al bucket `"hymns"` para que los usuarios puedan reproducir audios y ver partituras.
* **Escritura**: Restringir la inserción, modificación y eliminación (tanto en tablas como en storage) únicamente a usuarios autenticados con rol de administrador (empleando RLS con autenticación de Supabase Auth).