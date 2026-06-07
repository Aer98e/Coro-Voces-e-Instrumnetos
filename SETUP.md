# 🚀 Guía de Configuración con Vite

## Requisitos previos

- **Node.js** (versión 16+) - Descarga desde [nodejs.org](https://nodejs.org)
- **npm** (viene con Node.js)

## Verificar instalación

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
node --version
npm --version
```

## Pasos de configuración

### 1. Instalar dependencias

```bash
npm install
```

Esto descargará:
- `vite` - Bundler y dev server
- `@supabase/supabase-js` - Cliente de Supabase

### 2. Configurar Supabase

#### a) Crear archivo `.env`

En la raíz del proyecto (donde está `package.json`), crea un archivo llamado `.env`:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima-aqui
```

#### b) Obtener credenciales de Supabase

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** (ícono de engranaje)
4. En el menú izquierdo, ve a **API**
5. Busca:
   - **Project URL** → Copia en `VITE_SUPABASE_URL`
   - **Project API keys → anon public** → Copia en `VITE_SUPABASE_ANON_KEY`

⚠️ **IMPORTANTE**: No compartas estas credenciales. El archivo `.env` está en `.gitignore` y no se subirá a GitHub.

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

✅ La aplicación se abrirá automáticamente en `http://localhost:5173`

### 4. Construir para producción

```bash
npm run build
```

Esto genera una carpeta `dist/` lista para desplegar.

## Estructura de carpetas

```
Coro-Voces-e-Instrumnetos/
├── js/                      # Código JavaScript
│   ├── main.js             # Punto de entrada
│   ├── config/             # Configuración
│   │   ├── supabase.js     # Cliente Supabase
│   │   ├── constants.js
│   │   └── selectors.js
│   ├── services/           # Consultas a BD
│   │   └── hymnService.js
│   ├── domain/             # Lógica de negocio
│   │   └── hymn.js
│   ├── ui/                 # Componentes UI
│   │   ├── renderer.js
│   │   ├── errorHandler.js
│   │   └── components/
│   └── utils/              # Utilidades
│       └── formatters.js
├── index.html              # HTML principal
├── styles.css              # Estilos
├── package.json            # Configuración de Node
├── vite.config.js          # Configuración de Vite
├── .env                    # Variables de entorno (NO compartir)
└── .env.example            # Plantilla de .env
```

## Solución de problemas

### Error: "npm: comando no encontrado"

**Causa**: Node.js no está instalado o no está en el PATH.

**Solución**:
1. Descarga Node.js desde [nodejs.org](https://nodejs.org)
2. Instala la versión LTS (Long Term Support)
3. Reinicia la terminal

### Error: "Cannot find module '@supabase/supabase-js'"

**Causa**: Las dependencias no están instaladas.

**Solución**:
```bash
npm install
```

### Error: "VITE_SUPABASE_URL is undefined"

**Causa**: El archivo `.env` no existe o no tiene las variables correctas.

**Solución**:
1. Crea un archivo `.env` en la raíz (donde está `package.json`)
2. Añade las variables de Supabase
3. Reinicia el servidor (`npm run dev`)

### Error: "Port 5173 is already in use"

**Causa**: Otro proceso está usando el puerto 5173.

**Solución**:
```bash
# Opción 1: Espera unos segundos y reinicia
npm run dev

# Opción 2: Usa otro puerto
npm run dev -- --port 3000
```

## Próximos pasos

✅ Instala las dependencias: `npm install`
✅ Configura `.env` con tus credenciales
✅ Inicia en desarrollo: `npm run dev`
✅ Prueba la aplicación en `http://localhost:5173`

¿Preguntas? Revisa el [README.md](README.md) o consulta la documentación de [Vite](https://vitejs.dev) y [Supabase](https://supabase.com/docs).
