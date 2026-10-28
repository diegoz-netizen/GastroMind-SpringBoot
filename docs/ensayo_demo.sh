#!/usr/bin/env bash
# ============================================================
# GASTROMIND — Ensayo de la demo del Sprint 1 (7 pasos por HTTP)
#
# Prueba contra el backend lo mismo que se muestra en la Sprint Review:
#   1. Login admin  2. Registrar mozo (HU-01)  3. Login del mozo del seed
#   4. Desactivarlo (HU-03)  5. Pierde acceso con su token  6. Reactivarlo
#   7. Aislamiento entre restaurantes  (+ CORS desde localhost:5173)
#
# Requisitos:
#   - BD cargada con docs/script_database.sql + docs/seed_demo.sql
#   - Backend corriendo (por defecto http://localhost:8080)
#   - HU-01, HU-02 y HU-03 integradas (el paso 2 usa POST /api/empleados)
#   - bash (Git Bash en Windows), curl y python
#
# Uso:
#   bash docs/ensayo_demo.sh
#   API=http://otro-host:8080 bash docs/ensayo_demo.sh
#
# HU-01-b: el mozo nuevo crea su contraseña con el enlace del correo, que este
# guion no puede leer; por eso los pasos 3 a 6 usan mozo.central del seed.
# Cada corrida registra un mozo nuevo (correo con marca de tiempo). Para
# volver a una BD limpia antes de la demo, recrearla y cargar los 2 SQL.
# ============================================================
API=${API:-http://localhost:8080}
CLAVE='Demo2026!'
MOZO="mozo.ensayo.$(date +%s)@gastromind.demo"
OK=0; FAIL=0
BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT

json() { python -I -c "import sys,json; d=json.load(sys.stdin); print(d$1)"; }

check() {  # check <descripcion> <esperado> <obtenido> [cuerpo]
  if [ "$2" = "$3" ]; then OK=$((OK+1)); printf '  ✅ %-58s esperado %s · obtenido %s\n' "$1" "$2" "$3"
  else FAIL=$((FAIL+1)); printf '  ❌ %-58s esperado %s · obtenido %s  %s\n' "$1" "$2" "$3" "$4"; fi
}

req() {  # req <metodo> <ruta> <token|-> [json]  -> imprime "codigo|cuerpo"
  local args=(-s -o "$BODY" -w '%{http_code}' -X "$1" "$API$2" -H 'Content-Type: application/json')
  [ "$3" != "-" ] && args+=(-H "Authorization: Bearer $3")
  [ -n "$4" ] && args+=(-d "$4")
  local code; code=$(curl "${args[@]}")
  echo "$code|$(cat "$BODY")"
}

login() { req POST /api/auth/login - "{\"correo\":\"$1\",\"password\":\"$2\"}"; }

echo "Paso 1 · Login del admin"
r=$(login admin.central@gastromind.demo "$CLAVE"); check "admin Central con clave correcta" 200 "${r%%|*}" "${r#*|}"
ADMIN=$(echo "${r#*|}" | json "['token']")
r=$(login admin.central@gastromind.demo 'malaclave'); check "admin Central con clave incorrecta" 401 "${r%%|*}"
r=$(req GET /api/empleados -); check "sin token en ruta protegida" 401 "${r%%|*}"

echo "Paso 2 · El admin registra un mozo (HU-01)"
r=$(req POST /api/empleados "$ADMIN" "{\"nombreCompleto\":\"Mozo Ensayo\",\"correo\":\"$MOZO\",\"rolId\":4}")
check "registrar mozo" 201 "${r%%|*}" "${r#*|}"
MOZO_ID=$(echo "${r#*|}" | json "['id']")
PIN=$(echo "${r#*|}" | json "['pinAcceso']")
if [[ "$PIN" =~ ^[0-9]{4}$ ]]; then check "el registro muestra un PIN de 4 dígitos" "sí" "sí"; else check "el registro muestra un PIN de 4 dígitos" "sí" "no" "$PIN"; fi
r=$(req POST /api/empleados "$ADMIN" "{\"nombreCompleto\":\"X\",\"correo\":\"p$MOZO\",\"rolId\":4,\"pinAcceso\":\"12a\"}")
check "PIN que no es de 4 dígitos" 400 "${r%%|*}"
r=$(req POST /api/empleados "$ADMIN" "{\"nombreCompleto\":\"Mozo Ensayo\",\"correo\":\"$MOZO\",\"rolId\":4}")
check "mismo correo otra vez" 409 "${r%%|*}"
r=$(req POST /api/empleados "$ADMIN" "{\"nombreCompleto\":\"X\",\"correo\":\"x$MOZO\",\"rolId\":99}")
check "rol inexistente" 400 "${r%%|*}"

echo "Paso 3 · Login del mozo del seed"
SEED=mozo.central@gastromind.demo
SEED_ID=$(req GET /api/empleados "$ADMIN" | cut -d'|' -f2- | python -I -c "import sys,json; print(next(e['id'] for e in json.load(sys.stdin) if e['correo']=='$SEED'))")
r=$(login "$SEED" "$CLAVE"); check "login del mozo" 200 "${r%%|*}" "${r#*|}"
MOZO_TOKEN=$(echo "${r#*|}" | json "['token']")
r=$(req GET /api/empleados "$MOZO_TOKEN"); check "mozo intenta listar personal" 403 "${r%%|*}"

echo "Paso 4 · El admin desactiva al mozo (HU-03)"
r=$(req PATCH "/api/empleados/$SEED_ID/estado" "$ADMIN" '{"estado":"INACTIVO"}'); check "desactivar mozo" 200 "${r%%|*}" "${r#*|}"

echo "Paso 5 · El mozo pierde acceso"
r=$(req GET /api/empleados "$MOZO_TOKEN"); check "mozo usa su token anterior" 401 "${r%%|*}"
r=$(login "$SEED" "$CLAVE"); check "mozo intenta volver a entrar" 401 "${r%%|*}"
echo "     mensaje: ${r#*|}"

echo "Paso 6 · El admin lo reactiva"
r=$(req PATCH "/api/empleados/$SEED_ID/estado" "$ADMIN" '{"estado":"ACTIVO"}'); check "reactivar mozo" 200 "${r%%|*}"
r=$(login "$SEED" "$CLAVE"); check "mozo vuelve a entrar" 200 "${r%%|*}"

echo "Paso 7 · Aislamiento entre restaurantes"
r=$(login admin.norte@gastromind.demo "$CLAVE"); check "login admin Norte" 200 "${r%%|*}"
NORTE=$(echo "${r#*|}" | json "['token']")
r=$(req GET /api/empleados "$NORTE"); check "admin Norte lista su personal" 200 "${r%%|*}"
if echo "${r#*|}" | grep -q "$MOZO"; then check "Norte NO ve al mozo de Central" "no" "sí"; else check "Norte NO ve al mozo de Central" "no" "no"; fi
r=$(req PATCH "/api/empleados/$MOZO_ID/estado" "$NORTE" '{"estado":"INACTIVO"}'); check "Norte intenta desactivar al mozo de Central" 404 "${r%%|*}"

echo "Extra · CORS desde el frontend"
c=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$API/api/empleados" -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: authorization')
check "preflight OPTIONS desde localhost:5173" 200 "$c"

echo; echo "Resultado: $OK OK · $FAIL fallos"
[ "$FAIL" -eq 0 ]
