<div align="center">

# 🔑 HU-04 · Recuperar contraseña desde el correo

**GastroMind** — Sprint 2 · Épica EP-01 *Acceso y seguridad*

<img src="https://skillicons.dev/icons?i=java,spring,postgres,react&theme=dark" alt="Java, Spring Boot, PostgreSQL y React" />

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-6DB33F)
![Tests](https://img.shields.io/badge/tests-49%20passing-brightgreen)

</div>

> *"Yo como usuario debo poder recuperar mi contraseña desde mi correo para volver a entrar si la olvidé."*

| | |
|---|---|
| **Responsable** | Victor Santamaría |
| **Sprint** | 2 · 12/10 – 25/10 |
| **Rama** | `feature/HU-04-recuperar-contrasena` (desde `main`) |
| **Estimación** | 9 h (Sprint Backlog) |
| **Actualizado** | 12/10/2026 |

---

## 🎯 Criterio de aceptación

**CA-04** — El enlace de recuperación caduca y solo puede usarse una vez.

Reglas que cumple la implementación:

- ⏱️ El enlace caduca a los **15 min** (decidido el 12/10; el Excel decía 5 y el backlog maestro 15). Se cambia solo en properties: `gastromind.recuperacion.expiracion-minutos`.
- 1️⃣ **Un solo uso**: al restablecer se marca `usado_en`. Si se pide otro enlace, los anteriores dejan de servir.
- 🔒 En la BD se guarda el **hash SHA-256** del token, nunca el token.
- 🙈 `POST /recuperar` responde **lo mismo** exista o no el correo: no revela qué correos están registrados.
- 🚫 Un empleado **INACTIVO** (HU-03) no recibe enlace, y si lo desactivan después de pedirlo, el enlace ya no sirve.
- 🔐 La nueva contraseña se guarda con BCrypt y sigue la regla de HU-01 (mínimo 6 caracteres).

## ✅ Tareas del Sprint Backlog

| # | Tarea | h | Estado |
|---|---|:-:|---|
| 1 | Crear el formulario "Olvidé mi contraseña" | 2 | ✅ `OlvideContrasena.jsx` + `RestablecerContrasena.jsx` + enlace en el Login |
| 2 | Configurar el servicio de envío de correos (SMTP) | 2 | ✅ `CorreoService` (Mailtrap en desarrollo) |
| 3 | Generar y validar un token temporal de un solo uso | 2 | ✅ Tabla `token_recuperacion` |
| 4 | Implementar el cambio de contraseña y actualizarla en la BD | 3 | ✅ `POST /api/auth/restablecer` |

## 🔌 Endpoints (públicos, bajo `/api/auth/**`)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/api/auth/recuperar` | `{"correo": "..."}` | `200` siempre (mismo mensaje) · `400` si el formato del correo es inválido |
| POST | `/api/auth/restablecer` | `{"token": "...", "nuevaContrasena": "..."}` | `200` contraseña cambiada · `400` enlace inválido, vencido o ya usado, o contraseña corta |

El enlace que llega al correo es `http://localhost:5173/restablecer?token=...` (`gastromind.recuperacion.url-restablecer`).

## ✉️ Correo en desarrollo: Mailtrap

1. Crear cuenta gratis en [mailtrap.io](https://mailtrap.io) → *Email Testing* → *Inboxes* → *SMTP*.
2. Exportar las credenciales (no van en el repo):
   ```bash
   export MAIL_USERNAME=tu_usuario_mailtrap
   export MAIL_PASSWORD=tu_password_mailtrap
   ```
3. Levantar el backend: los correos aparecen en la bandeja de Mailtrap, no llegan a nadie real.

Sin credenciales el backend arranca igual; el envío falla, se registra en el log y la respuesta no cambia. Para la entrega final se cambia a Brevo/SendGrid solo con variables (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`).

`CorreoService.enviar(para, asunto, cuerpo)` es común: lo puede usar el correo de bienvenida de HU-01.

## 🗃️ Base de datos

Tabla nueva `token_recuperacion`, incluida en [`docs/script_database.sql`](../script_database.sql). Para una BD creada antes del 14/10: [`docs/migraciones/002_tablas_HU03_HU04.sql`](../migraciones/002_tablas_HU03_HU04.sql) (HL-037). No depender de `ddl-auto=update`: `EsquemaScriptTest` falla si una entidad no tiene su tabla en el script.

## 🧪 Pruebas

```bash
cd backend-spring
./mvnw clean verify -Dspring.profiles.active=test   # 49/49
```

- `RecuperacionServiceTest` (10, unitario): guarda solo el hash · anula enlaces anteriores · correo inexistente o inactivo → no envía nada · SMTP caído no rompe la respuesta · token vigente cambia la clave · inexistente, vencido, usado o empleado desactivado → 400.
- `RecuperacionIntegrationTest` (5, H2 + MockMvc, correo simulado): flujo completo hasta el login con la clave nueva · el mismo enlace dos veces → el segundo 400 · pedir otro enlace anula el primero · correo inexistente → mismo mensaje · contraseña corta → 400 y la clave vieja sigue.
