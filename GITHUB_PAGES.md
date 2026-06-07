# 🚀 Deployment en GitHub Pages con Vite

## Configuración para GitHub Pages

Vite está configurado para desplegarse en GitHub Pages. Hay dos opciones: **automática (recomendada)** o **manual**.

## Opción 1: Deploy Automático con GitHub Actions (RECOMENDADO) ✅

### Paso 1: Actualizar `vite.config.js`

El archivo ya está configurado con:
```js
base: '/Coro-Voces-e-Instrumnetos/',
```

**⚠️ IMPORTANTE**: Reemplaza `Coro-Voces-e-Instrumnetos` con el nombre de tu repositorio actual si cambia.

**Excepciones:**
- Si el repositorio es `username.github.io`, cambia a: `base: '/'`

### Paso 2: Configurar GitHub Pages en el repositorio

1. Ve a **Settings** del repositorio
2. En la izquierda, selecciona **Pages**
3. En **Build and deployment**:
   - **Source**: Selecciona `GitHub Actions`
   - **Branch**: `gh-pages` (se creará automáticamente)

### Paso 3: Push a GitHub

```bash
git add .
git commit -m "Setup Vite with GitHub Pages"
git push origin main
```

✅ **Automáticamente**:
- Se ejecutará el workflow (ve a **Actions** para ver el progreso)
- La rama `gh-pages` se creará
- Tu sitio estará disponible en `https://tu-usuario.github.io/Coro-Voces-e-Instrumnetos/`

## Opción 2: Deploy Manual

Si prefieres desplegar manualmente:

### Paso 1: Compilar la aplicación

```bash
npm run build
```

Esto genera una carpeta `dist/` con los archivos optimizados.

### Paso 2: Desplegar a GitHub Pages

**Opción A: Usando git subtree (más simple)**

```bash
npm run deploy
```

Este comando:
1. Compila la aplicación
2. Crea/actualiza la rama `gh-pages`
3. Sube a GitHub

**Opción B: Manual con git**

```bash
npm run build
git add dist -f
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix dist origin gh-pages
```

## Verificar el deployment

1. Ve a **Settings → Pages** de tu repositorio
2. Deberías ver: "Your site is live at `https://...`"
3. Abre el enlace en tu navegador

## Solución de problemas

### Error: "dist not found"

**Causa**: No compilaste la aplicación.

**Solución**:
```bash
npm run build
```

### Error: "fatal: 'origin' does not appear to be a git repository"

**Causa**: No estás en el directorio correcto o no hay un repositorio git.

**Solución**:
```bash
cd tu-carpeta-del-proyecto
git init
git remote add origin https://github.com/tu-usuario/Coro-Voces-e-Instrumnetos.git
npm run deploy
```

### Sitio devuelve 404

**Causa**: El `base` en `vite.config.js` no coincide con el nombre del repositorio.

**Solución**:
1. Ve a `vite.config.js`
2. Reemplaza `base: '/Coro-Voces-e-Instrumnetos/'` con el nombre correcto de tu repositorio
3. Compila y despliega de nuevo:
   ```bash
   npm run build
   npm run deploy
   ```

### Las variables de Supabase no funcionan

**Causa**: El archivo `.env` no se incluye en el deploy (por seguridad).

**Solución**: Usar **Secrets de GitHub**

1. Ve a **Settings → Secrets and variables → Actions**
2. Haz clic en **New repository secret**
3. Añade dos secrets:
   - Nombre: `VITE_SUPABASE_URL` | Valor: tu URL
   - Nombre: `VITE_SUPABASE_ANON_KEY` | Valor: tu clave

4. Actualiza `.github/workflows/deploy.yml`:
```yaml
      - name: Build with Vite
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

## Flujo recomendado

```
1. Desarrollo local
   └─ npm run dev

2. Cambios listos
   └─ git add .
   └─ git commit -m "mensaje"
   └─ git push origin main

3. GitHub Actions se ejecuta automáticamente
   └─ Compila con Vite
   └─ Sube a rama gh-pages
   └─ Sitio disponible en 2-3 minutos

4. ¡Listo! Tu aplicación está en GitHub Pages
```

## URLs útiles

- 📖 [Documentación de GitHub Pages](https://docs.github.com/en/pages)
- 📖 [Documentación de Vite](https://vitejs.dev/guide/static-deploy.html)
- 🔑 [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- 🚀 [GitHub Actions](https://docs.github.com/en/actions)

## Próximos pasos

1. ✅ Actualiza `vite.config.js` con el nombre correcto del repositorio
2. ✅ Configura GitHub Pages en Settings
3. ✅ (Opcional) Añade secrets de Supabase si es privada
4. ✅ Push a GitHub
5. ✅ Visita tu sitio en `https://tu-usuario.github.io/Coro-Voces-e-Instrumnetos/`
