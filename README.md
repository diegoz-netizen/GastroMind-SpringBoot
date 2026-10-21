# GastroMind
Sistema B2B de optimización de costos, control de mermas y gestión de almacén.

## Repositorios

El proyecto usa **tres repositorios** (desde el 12/10/2026) y **una sola base de datos PostgreSQL compartida**.

| Repositorio | Contenido |
|---|---|
| **GastroMind** (este) | `backend-spring/` (Spring Boot: login, empleados, pedidos, stock) · `web-react/` (web) · `docs/` · CI |
| [GastroMind-Django](https://github.com/diegoz-netizen/GastroMind-Django) | Backend analítico: catálogo, mermas, reportes e IA |
| [GastroMind-Kotlin](https://github.com/diegoz-netizen/GastroMind-Kotlin) | App móvil (mozo, cocinero, almacenero) |

Este repo es la **fuente común** de los otros dos:
- La **estructura de la BD** está en [`docs/script_database.sql`](docs/script_database.sql).
- El **login (JWT)** lo emite este backend, en `POST /api/auth/login`.

Detalle en la sección 7 del [Documento Técnico](docs/GastroMind%20—%20Documento%20Técnico%20y%20de%20Proceso%20(2).md).

## Arquitectura

```mermaid
flowchart LR
  subgraph Clientes
    WEB["web-react (este repo)"]
    APP["App Kotlin (desde el Sprint 3)"]
  end
  subgraph Backends
    SPR["backend-spring<br/>login, empleados, pedidos, stock"]
    DJ["GastroMind-Django<br/>catálogo, mermas, reportes, IA"]
  end
  DB[("PostgreSQL<br/>una sola BD")]

  WEB -->|"HTTP/JSON + JWT"| SPR
  WEB -->|"HTTP/JSON + JWT"| DJ
  APP -->|"HTTP/JSON + JWT"| SPR
  DJ -.->|"valida el JWT de Spring"| SPR
  SPR --> DB
  DJ --> DB
```

- **Un solo login:** Spring emite el JWT (`POST /api/auth/login`) y Django lo valida con el mismo secreto.
- **Un solo esquema:** las tablas se crean con `docs/script_database.sql` y `docs/migraciones/`; ningún backend las crea ni las altera.
- **Modelo de datos (MER, 18 tablas):** [`docs/modelo_datos.md`](docs/modelo_datos.md).

## Cómo correrlo

- **Base de datos:** cargar `docs/script_database.sql` y luego `docs/seed_demo.sql`.
- **Backend:** `cd backend-spring` y `./mvnw spring-boot:run`. Copiar antes `application-local.properties.example` a `application-local.properties` con tus credenciales.
- **Web:** ver [`web-react/README.md`](web-react/README.md).
- **Ensayo de la demo:** `bash docs/ensayo_demo.sh`.

## Formato de errores (HL-014)

Spring y Django responden todos los errores igual (`GlobalExceptionHandler` aquí, `config/errores.py` en GastroMind-Django):

```json
{"error": "VALIDACION", "mensaje": "Hay campos con errores.", "campos": {"correo": "El formato del correo es inválido"}}
```

`error` es uno de: `VALIDACION` (400, con `campos`) · `SOLICITUD_INVALIDA` (400) · `NO_AUTENTICADO` (401) · `SIN_PERMISO` (403) · `NO_ENCONTRADO` (404) · `METODO_NO_PERMITIDO` (405) · `CONFLICTO` (409) · `DEMASIADAS_SOLICITUDES` (429, límite de `/api/auth/recuperar`) · `ERROR_INTERNO` (500, sin detalles internos). Las pantallas muestran `mensaje` y, en los de validación, cada texto de `campos` debajo de su campo.

## Flujo de trabajo

Una rama por tarea (`feature/HU-xx-...`), Pull Request a `main` con 1 aprobación de otro integrante y merge con *Create a merge commit*. `main` está protegida en los tres repos.
