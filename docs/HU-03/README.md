<div align="center">

# 👥 HU-03 · Activar y desactivar empleados

**GastroMind** — Sprint 1 · Épica EP-01 *Acceso y seguridad*

<img src="https://skillicons.dev/icons?i=java,spring,postgres,maven&theme=dark" alt="Java, Spring Boot, PostgreSQL y Maven" />

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-6DB33F)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)
![Tests](https://img.shields.io/badge/tests-14%20passing-brightgreen)

</div>

> *"Yo como gerente debo poder activar o desactivar usuarios para retirar el acceso al personal que ya no labora."*

| | |
|---|---|
| **Responsable** | Victor Santamaría |
| **Sprint** | 1 · semanas 7-8 |
| **Rama** | `feature/HU-03-estado-empleados` (desde `feature/HU-02-login`) |
| **Estimación** | 9 h (Sprint Backlog) |
| **Actualizado** | 08/10/2026 |

---

## 🎯 Criterio de aceptación

**CA-03** — Un usuario desactivado no puede iniciar sesión y el sistema le informa que su cuenta está inactiva.

Reglas que cumple la implementación:

- 🔐 Solo un **ADMINISTRADOR activo** puede listar y cambiar estados.
- 🏢 Cada admin solo ve y modifica empleados de **su restaurante**: el `restaurante_id` sale del usuario autenticado, nunca del cliente.
- 🔄 Estados válidos: `ACTIVO` e `INACTIVO`.
- 🗃️ **Borrado lógico**: el empleado nunca se elimina, porque pedidos, mermas e ingresos lo referencian.
- 🙈 Las respuestas nunca exponen `password_hash` ni `pin_acceso`.
- 📝 Cada cambio queda registrado en un **historial** (quién, cuándo, de qué estado a cuál).

## ✅ Tareas del Sprint Backlog

| # | Tarea | h | Estado |
|---|---|:-:|---|
| 1 | Agregar el campo estado (activo/inactivo) al modelo de usuario | 2 | ✅ `Empleado.estado` + enum `EstadoEmpleado` |
| 2 | Crear la vista de listado con opción de activar/desactivar | 3 | 🟡 API + vista `Empleados.jsx` listas · falta la ruta y el CORS (HU-02) |
| 3 | Implementar la lógica para bloquear el acceso de usuarios inactivos | 2 | ✅ Login (HU-02) + revalidación en cada petición de HU-03 |
| 4 | Registrar el historial de cambios de estado de cada usuario | 2 | ✅ Tabla `historial_estado_empleado` |

## 🔀 Flujo de un cambio de estado

```mermaid
sequenceDiagram
    actor A as Administrador
    participant C as PersonalController
    participant S as PersonalService
    participant DB as PostgreSQL

    A->>C: PATCH /api/empleados/{id}/estado
    C->>S: cambiarEstado(id, estado, auth)
    S->>S: Valida estado (ACTIVO / INACTIVO)
    S->>DB: Busca admin por id del token
    DB-->>S: Admin (estado, rol, restaurante)
    Note over S: ¿ACTIVO y ADMINISTRADOR?<br/>si no → 401 / 403
    S->>DB: Busca empleado en SU restaurante
    Note over S: no existe ahí → 404
    S->>DB: UPDATE estado (sin borrar)
    S->>DB: INSERT historial_estado_empleado
    S-->>C: EmpleadoResumen
    C-->>A: 200 OK
```

## 🌐 Endpoints

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| `GET` | `/api/empleados` | ADMINISTRADOR | Lista el personal del restaurante del admin |
| `PATCH` | `/api/empleados/{id}/estado` | ADMINISTRADOR | Cambia el estado y registra el historial |

<details>
<summary><b>Ejemplo de petición y respuesta</b></summary>

```http
PATCH /api/empleados/2/estado
Authorization: Bearer <token>
Content-Type: application/json

{ "estado": "INACTIVO" }
```

```json
{
  "id": 2,
  "nombreCompleto": "Mozo Uno",
  "correo": "mozo@resto1.com",
  "rol": "MOZO",
  "estado": "INACTIVO"
}
```

</details>

| Código | Cuándo |
|:-:|---|
| `200` | Cambio realizado. Si ya tenía ese estado, responde igual y no duplica el historial |
| `400` | Estado vacío o distinto de `ACTIVO` / `INACTIVO` |
| `401` | El admin está inactivo |
| `403` | El usuario no es ADMINISTRADOR, o la petición llega sin token (la corta Spring Security) |
| `404` | El empleado no existe **en su restaurante** (no revela si existe en otro) |

## 🗂️ Estructura

Paquete `com.gastromind.backendspring`. **Solo se agregaron archivos nuevos**: el código de HU-02 no se modificó.

```text
backend-spring/src/main/java/com/gastromind/backendspring/
├── controller/  PersonalController.java
├── dto/         CambioEstadoRequest.java · EmpleadoResumen.java
├── entity/      EstadoEmpleado.java · HistorialEstadoEmpleado.java
├── repository/  PersonalRepository.java · HistorialEstadoEmpleadoRepository.java
└── service/     PersonalService.java

backend-spring/src/test/java/.../service/PersonalServiceTest.java
web-react/src/pages/Empleados.jsx
docs/HU-03/      README.md
```

**Decisiones de diseño**

- Reutiliza las entidades compartidas `Empleado`, `Rol` y `Restaurante` de HU-02 tal como están.
- `PersonalRepository` es independiente de `EmpleadoRepository`: cada HU mantiene sus consultas sin pisarse.
- Arquitectura en capas: `Controller → Service → Repository → PostgreSQL`.

## 🛢️ Base de datos

Nueva tabla `historial_estado_empleado`, incluida en [`docs/script_database.sql`](../script_database.sql). Para una BD creada antes del 14/10: [`docs/migraciones/002_tablas_HU03_HU04.sql`](../migraciones/002_tablas_HU03_HU04.sql) (HL-037):

```mermaid
erDiagram
    EMPLEADO ||--o{ HISTORIAL_ESTADO_EMPLEADO : "cambia de estado"
    EMPLEADO ||--o{ HISTORIAL_ESTADO_EMPLEADO : "cambiado_por"
    HISTORIAL_ESTADO_EMPLEADO {
        int id PK
        int empleado_id FK
        varchar estado_anterior
        varchar estado_nuevo
        int cambiado_por FK
        timestamp fecha_cambio
    }
```

El script también agrega el índice `idx_empleado_restaurante`, porque el listado filtra por `restaurante_id`.

## 🧪 Pruebas

```bash
cd backend-spring
./mvnw test
```

`PersonalServiceTest` (JUnit 5 + Mockito, sin base de datos):

| Caso | Esperado |
|---|---|
| Admin lista personal | Solo su restaurante |
| Admin desactiva empleado | Estado cambia, no se borra, se registra historial |
| Mismo estado | No se duplica el historial |
| Empleado de otro restaurante | `404` |
| Estado inválido | `400` |
| Usuario sin rol admin | `403` |
| Admin inactivo / sin autenticación | `401` |

**Resultado (08/10/2026):** 14 pruebas, 0 fallos (8 de HU-03 + 6 de HU-02), en local y en el CI de GitHub Actions.

### Probar con Postman

Requiere un ADMINISTRADOR activo en la BD (contraseña con hash BCrypt) y el backend corriendo en `localhost:8080`.

1. **Login** — `POST /api/auth/login` con `{ "correo": "...", "password": "..." }`. Copiar el `token` de la respuesta.
2. **Listar** — `GET /api/empleados` con el header `Authorization: Bearer <token>`. Devuelve solo el personal de su restaurante.
3. **Desactivar** — `PATCH /api/empleados/{id}/estado` con el mismo header y `{ "estado": "INACTIVO" }`.
4. **Comprobar el CA-03** — hacer login con el empleado desactivado: `401` *"Su cuenta se encuentra inactiva"*.
5. **Reactivar** — repetir el paso 3 con `{ "estado": "ACTIVO" }`; el empleado vuelve a entrar.
6. **Aislamiento** — pedir el `PATCH` de un empleado de otro restaurante: `404`.

> ⚠️ Mientras `/error` no esté en el `permitAll` de `SecurityConfig` (HU-02), los errores (`400`, `404`, `401`, `403`) llegan como **`403` sin cuerpo**. Los códigos de la tabla de arriba se verificaron con `/error` permitido.

## 🖥️ Vista web

`web-react/src/pages/Empleados.jsx`: tabla con el personal del restaurante y un botón para activar o desactivar cada empleado. Muestra el mensaje del backend cuando hay error y nunca pide ni muestra contraseñas.

Para usarla falta, en archivos de HU-02:

- La ruta `/empleados` (protegida con `PrivateRoute`) en `App.jsx`.
- CORS global en `SecurityConfig` (`.cors(...)`): el login funciona porque `/api/auth/**` es público, pero el *preflight* del navegador a `/api/empleados` hoy responde `403`.

Con esos dos cambios, aplicados en una copia local, las peticiones que hace la vista (preflight CORS, listar, desactivar y reactivar) respondieron correctamente.

## 🤝 Integración con el equipo

| Con | Punto de integración |
|---|---|
| **HU-02** · Inicio de sesión | El filtro JWT pone como principal el **id** del empleado. HU-03 lo busca en la BD en cada petición y exige que siga ACTIVO y sea ADMINISTRADOR. |
| **HU-02** · Revocación | Para que un desactivado pierda acceso a *todos* los endpoints con un token anterior, el filtro JWT debe consultar el estado en cada petición. HU-03 ya lo hace en los suyos. |
| **HU-01** · Registro | El `POST /api/empleados` puede ir en otro controlador sobre la misma ruta, sin repetir los mapeos `GET` y `PATCH`. |

## 📌 Pendiente

- [x] Vista web `Empleados.jsx` (React).
- [ ] Ruta `/empleados` y CORS global (HU-02).
- [ ] Decidir con el PO si un admin puede desactivarse a sí mismo.
- [ ] Decidir si se puede desactivar al último admin activo del restaurante.
- [ ] Acordar quién aplica los scripts del esquema compartido.
- [ ] Pull Request y revisión cruzada.

---

<div align="center">
<sub>GastroMind · Proyecto integrador · Construcción y Pruebas de Software · Tecsup 2026</sub>
</div>
