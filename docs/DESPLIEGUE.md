# Despliegue de GastroMind

Volver al [README](../README.md) · Modelo de datos: [`modelo_datos.md`](modelo_datos.md) · Cronograma: [`cronograma.md`](cronograma.md)

Esta guía levanta **todo el sistema en una máquina**, con Docker, sin instalar Java, Python, Node ni PostgreSQL. Es un despliegue **documentado y reproducible**; no incluye un servidor en internet (ver [lo que no cubre](#lo-que-no-cubre)).

## 1. Qué se levanta

| Servicio | Qué es | Puerto | Imagen |
|---|---|---|---|
| `db` | PostgreSQL 16, **una sola base** para Spring y Django | solo interno | `postgres:16` |
| `spring` | Backend Spring Boot 4 (login, empleados, pedidos, stock, mermas) | **8080** | se compila de `backend-spring/` |
| `django` | Backend Django 5 (catálogo, reportes, sugerencia de compra, Excel) | **8000** | se compila del repo `GastroMind-Django` |
| `web` | Web React (administrador y almacenero), servida con nginx | **5173** | se compila de `web-react/` |

La **app móvil** (mozo, cocina y almacén) no corre en Docker: se instala como APK (ver [sección 7](#7-app-móvil)).

```
Navegador ──▶ web (5173) ──┬──▶ spring (8080) ──┐
App Android ───────────────┤                    ├──▶ db (PostgreSQL)
                           └──▶ django (8000) ──┘
        Spring firma el JWT; Django lo verifica con el mismo JWT_SECRET
```

## 2. Requisitos

- Docker con Docker Compose v2 (`docker compose version`). Probado con Docker 29 y Compose 5.
- Git.
- Puertos libres: **8080**, **8000** y **5173**.
- Conexión a internet la primera vez (se descargan las imágenes y las dependencias).

## 3. Clonar los repositorios

Los dos repos que se compilan tienen que estar **uno al lado del otro**:

```bash
mkdir gastromind && cd gastromind
git clone https://github.com/diegoz-netizen/GastroMind-SpringBoot.git
git clone https://github.com/diegoz-netizen/GastroMind-Django.git
cd GastroMind-SpringBoot
```

Si la carpeta de Django tiene otro nombre o está en otro lugar, se indica en el `.env` con `DJANGO_DIR` (paso siguiente). El repo `GastroMind-Kotlin` solo hace falta para compilar la app móvil.

## 4. Variables de entorno

Se configuran en un archivo `.env` junto al `docker-compose.yml`. **No se sube al repositorio.**

```bash
cp .env.example .env
```

| Variable | Para qué | Cómo se completa |
|---|---|---|
| `DB_NAME`, `DB_USER` | Base y usuario de PostgreSQL | Ya vienen con valores por defecto |
| `DB_PASSWORD` | Clave de PostgreSQL | **Obligatoria.** Cualquier clave |
| `JWT_SECRET` | Secreto con el que Spring firma el login y Django lo verifica | **Obligatoria**, de al menos 32 caracteres y **la misma para los dos**. `openssl rand -hex 32` |
| `DJANGO_SECRET_KEY` | Clave interna de Django | **Obligatoria.** `openssl rand -hex 32` |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` | Correo de bienvenida y de alertas (HU-01-b, HU-04, HU-16) | Opcionales. Sin usuario y clave el sistema funciona pero **no envía correos**. Para Gmail: una *contraseña de aplicación*, no la clave de la cuenta |
| `DJANGO_DIR` | Carpeta del repo de Django | Solo si no está al lado con el nombre `GastroMind-Django` |

Nunca se escriben claves ni correos reales en archivos que se suben al repositorio.

## 5. Levantar el sistema

```bash
docker compose up --build -d
```

La primera vez tarda unos 6 minutos (compila Spring con Maven y la web con Vite). Lo que pasa, en orden:

1. Arranca `db`. Con el volumen vacío ejecuta `docs/script_database.sql` (esquema y roles) y después `docs/seed_demo.sql` (restaurantes, empleados, carta, mesas e insumos de demo).
2. Cuando `db` responde, arrancan `spring` y `django`. Spring verifica que las entidades coinciden con el esquema (`ddl-auto=validate`); si no coinciden, no arranca.
3. Por último, `web`.

Estado y registros:

```bash
docker compose ps
docker compose logs -f spring
```

## 6. Comprobar que funciona

1. **Servicios arriba:** `docker compose ps` muestra `spring`, `django`, `web` y `db` en *running* (y `db` *healthy*).
2. **Spring responde y emite el JWT:**
   ```bash
   curl -s -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"correo":"admin.central@gastromind.demo","password":"<clave de demo>"}'
   ```
   Debe devolver un JSON con un `token`. Las credenciales de demo están en el encabezado de [`seed_demo.sql`](seed_demo.sql).
3. **Django acepta ese mismo token:**
   ```bash
   curl -s http://localhost:8000/api/catalogo/insumos/ -H "Authorization: Bearer <token>"
   ```
   Debe devolver la lista de insumos del restaurante. Sin el token, Django responde `401`. Si responde `401` con un token recién emitido, `JWT_SECRET` no es el mismo en los dos servicios.
4. **Web:** abrir <http://localhost:5173>, entrar con el administrador de demo y ver Insumos, Carta y Reportes.

## 7. App móvil

El APK de la última versión está en los [Releases de GastroMind-Kotlin](https://github.com/diegoz-netizen/GastroMind-Kotlin/releases). Esa versión apunta al **emulador** (`10.0.2.2` es el `localhost` de la PC).

Para un celular o tablet reales, en la misma red wifi que la PC:

1. Averiguar la IP de la PC (`ip a` en Linux, `ipconfig` en Windows).
2. Compilar la app con esa IP:
   ```bash
   cd GastroMind-Kotlin
   ./gradlew assembleDebug -Pgastromind.apiUrl=http://<IP de la PC>:8080/ -Pgastromind.djangoUrl=http://<IP de la PC>:8000/
   ```
3. Instalar `app/build/outputs/apk/debug/app-debug.apk` (permitir *instalar apps de origen desconocido*).
4. Si el firewall de la PC bloquea, abrir los puertos 8080 y 8000.

## 8. Operación

| Qué | Comando |
|---|---|
| Parar sin perder datos | `docker compose stop` |
| Volver a arrancar | `docker compose start` |
| Bajar todo y **conservar** la base | `docker compose down` |
| Bajar todo y **borrar** la base (vuelve al seed) | `docker compose down -v` |
| Recompilar tras un `git pull` | `docker compose up --build -d` |
| Respaldo de la base | `docker compose exec db pg_dump -U postgres gastromind_db > respaldo.sql` |

El esquema y el seed solo se cargan cuando el volumen está vacío. Si cambian `script_database.sql` o `docs/migraciones/`, hay que usar `docker compose down -v` y volver a levantar (se pierden los datos), o aplicar la migración nueva a mano con `docker compose exec -T db psql -U postgres -d gastromind_db < docs/migraciones/<archivo>.sql`.

## 9. Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `Falta JWT_SECRET en el .env` (o `DB_PASSWORD`, `DJANGO_SECRET_KEY`) | Falta copiar `.env.example` a `.env` y completarlo |
| `port is already allocated` | Otro programa usa 8080, 8000 o 5173. Cerrarlo, o cambiar el puerto de la izquierda en `docker-compose.yml` |
| Spring se reinicia y en el registro dice `gastromind.jwt.secret` | `JWT_SECRET` tiene menos de 32 caracteres |
| La web carga pero el login falla con error de red | Se abrió desde otra dirección que no es `http://localhost:5173` (CORS solo permite esa) |
| Django devuelve `401` con un token válido de Spring | `JWT_SECRET` distinto entre los dos servicios. Corregir el `.env` y `docker compose up -d --force-recreate` |
| `build ... no such file or directory` en `django` | La carpeta de Django no está al lado. Definir `DJANGO_DIR` en el `.env` |
| No llegan correos | Faltan `MAIL_USERNAME` y `MAIL_PASSWORD`, o la cuenta no usa contraseña de aplicación |

## Lo que no cubre

- **No es un servidor en internet.** Corre en una máquina (la del equipo o la del jurado) y se abre en `localhost`.
- **Django corre con el servidor de desarrollo** (`runserver`) y `DJANGO_DEBUG=True`, suficiente para una demo local. Para producción habría que poner `gunicorn`, `DEBUG=False` y los estáticos con nginx.
- **Sin HTTPS ni dominio.** Si se pidiera una URL pública, la opción más rápida sería un servicio gratuito por componente (base, backend y web), con la desventaja de que se duermen sin uso.
