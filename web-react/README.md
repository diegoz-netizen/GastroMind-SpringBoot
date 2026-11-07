# GastroMind — Web (React + Vite)

Web de GastroMind para el administrador y el almacenero (el personal operativo usa la app Kotlin).

## Requisitos

- Node.js 20+ y npm
- Backend `backend-spring` corriendo en `http://localhost:8080`

## Ejecución

```bash
cd web-react
npm install
cp .env.example .env.local   # URLs de los backends (opcional: sin él se usan las de desarrollo)
npm run dev
```

| Variable          | Backend      | Por defecto             |
|-------------------|--------------|-------------------------|
| `VITE_API_URL`    | Spring Boot  | `http://localhost:8080` |
| `VITE_DJANGO_URL` | Django       | `http://localhost:8000` |

Las pantallas toman las URLs de `src/config/api.js`. Si se cambia `.env.local`, hay que reiniciar `npm run dev`.

La app queda disponible en `http://localhost:5173` (origen permitido por CORS en el backend).

## Scripts

| Comando           | Descripción                          |
|-------------------|--------------------------------------|
| `npm run dev`     | Servidor de desarrollo con HMR       |
| `npm run build`   | Build de producción en `dist/`       |
| `npm run preview` | Sirve localmente el build generado   |
| `npm run lint`    | Lint con Oxlint                      |

## Pantallas

| Ruta | Qué hace | HU | Quién la ve |
|---|---|---|---|
| `/` | Ingreso con correo y contraseña | HU-02 | Todos |
| `/recuperar`, `/restablecer` | Recuperar la contraseña por correo y crearla al ser invitado | HU-04, HU-01-b | Todos |
| `/dashboard` | Inicio con los accesos del rol y las alertas de stock y vencimiento | HU-16 | Con sesión |
| `/empleados`, `/empleados/nuevo` | Lista, alta (con invitación por correo) y desactivación de empleados | HU-01, HU-01-b, HU-03 | Administrador |
| `/insumos` | Insumos: consulta, alta, ingreso de compras, alertas y clasificación | HU-05, HU-14, HU-16, HU-25 | Administrador y almacenero |
| `/carta`, `/carta/:id/receta` | Carta, receta y costo de cada platillo | HU-06, HU-07, HU-08 | Administrador |
| `/reportes` | Reportes del gerente, una pestaña por HU (ver el README principal) | HU-19 a HU-24 | Administrador |
