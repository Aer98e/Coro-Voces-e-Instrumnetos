# Arquitectura de la Aplicación

## Descripción

La aplicación ha sido reestructurada siguiendo principios de **Arquitectura Limpia** y **Separación de Responsabilidades**. Los archivos están organizados en capas lógicas para mejorar la mantenibilidad, testabilidad y escalabilidad.

## Estructura de Carpetas

```
js/
├── config/              # Configuración y constantes
│   ├── constants.js     # Constantes de la aplicación
│   └── selectors.js     # Selectores de elementos del DOM
│
├── utils/               # Funciones de utilidad reutilizables
│   └── formatters.js    # Formateo de datos (strings, fechas)
│
├── domain/              # Lógica de negocio (Dominio)
│   └── hymn.js          # Lógica relacionada con himnos
│
├── services/            # Servicios de datos
│   └── hymnService.js   # Carga y gestión de datos remotos
│
├── ui/                  # Capa de presentación
│   ├── components/      # Componentes reutilizables
│   │   ├── hymnCard.js      # Tarjeta completa de himno
│   │   ├── hymnInfo.js      # Información y acciones
│   │   ├── voiceSelector.js # Selector de voces
│   │   └── audioPlayer.js   # Reproductor de audio
│   ├── errorHandler.js  # Manejo de errores
│   └── renderer.js      # Renderización general
│
└── main.js             # Punto de entrada y orquestación
```

## Capas de Arquitectura

### 1. **Config** (Configuración)
- **Propósito**: Centraliza constantes y referencias al DOM
- **Archivos**:
  - `constants.js`: URLs, clases CSS, opciones de ordenamiento
  - `selectors.js`: Referencias a elementos HTML

### 2. **Utils** (Utilidades)
- **Propósito**: Funciones puras y reutilizables
- **Características**: Sin efectos secundarios, altamente testables
- **Ejemplos**: formateo de texto, fechas

### 3. **Domain** (Dominio/Lógica de Negocio)
- **Propósito**: Lógica de himnos independiente de cualquier framework
- **Responsabilidades**:
  - Extracción de categorías
  - Búsqueda y filtrado
  - Ordenamiento
  - Obtención de versiones por voz
- **Características**: Funciones puras, sin dependencias del DOM

### 4. **Services** (Servicios de Datos)
- **Propósito**: Comunicación con la API/datos remotos
- **Responsabilidades**:
  - Cargar datos desde `data.json`
  - Manejo de errores HTTP
  - Transformación de respuestas

### 5. **UI** (Presentación)
- **Propósito**: Componentes visuales
- **Subcapas**:
  - **Components**: Componentes reutilizables (tarjeta, voces, audio, etc.)
  - **Renderer**: Lógica de renderización general
  - **ErrorHandler**: Visualización de errores

### 6. **Main** (Orquestación)
- **Propósito**: Coordina todas las capas
- **Responsabilidades**:
  - Inicializar la aplicación
  - Gestionar eventos
  - Coordinar flujos de datos

## Flujo de Datos

```
main.js
  ├─> cargarHimnos() [services/hymnService.js]
  ├─> obtenerCategoriasUnicas() [domain/hymn.js]
  ├─> renderizarCategorias() [ui/renderer.js]
  └─> actualizar() 
      ├─> filtrarHimnos() [domain/hymn.js]
      ├─> ordenarHimnos() [domain/hymn.js]
      └─> renderizarResultados() [ui/renderer.js]
          └─> crearTarjetaHimno() [ui/components/hymnCard.js]
```

## Ventajas de esta Estructura

✅ **Separación de Responsabilidades**: Cada módulo tiene una única responsabilidad  
✅ **Modularidad**: Fácil de añadir, modificar o eliminar funcionalidades  
✅ **Testabilidad**: Funciones puras y aisladas son más fáciles de testear  
✅ **Reusabilidad**: Componentes y utilidades pueden reutilizarse  
✅ **Mantenibilidad**: Código organizado y fácil de navegar  
✅ **Escalabilidad**: Facilita el crecimiento del proyecto  

## Cómo Agregar Nuevas Funcionalidades

### Ejemplo: Agregar un nuevo filtro

1. **Lógica de dominio** → `js/domain/hymn.js`
   ```javascript
   export function filtrarPorTono(himnos, tono) { ... }
   ```

2. **UI (si es necesario)** → `js/ui/components/` o `js/ui/renderer.js`

3. **Actualizar main.js** para coordinar

### Ejemplo: Agregar un componente nuevo

1. Crear archivo en `js/ui/components/nuevoComponente.js`
2. Exportar función principal
3. Importar en `js/ui/components/hymnCard.js` o donde sea necesario

## Migración desde busqueda.js

El archivo `busqueda.js` antiguo se ha dividido en múltiples módulos especializados. El `index.html` ahora importa `js/main.js` con `type="module"` para usar ES6 modules.

**Cambio en HTML**:
```html
<!-- Antes -->
<script src="busqueda.js" defer></script>

<!-- Ahora -->
<script type="module" src="js/main.js" defer></script>
```

## Notas de Desarrollo

- Todos los módulos usan ES6 modules (import/export)
- Las funciones están documentadas con comentarios JSDoc
- Se evita el estado global excepto en `main.js`
- Los componentes retornan objetos con referencias de DOM para facilitar actualizaciones
