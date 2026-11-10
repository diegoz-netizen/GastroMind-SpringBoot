#!/usr/bin/env bash
# ============================================================
# GASTROMIND — Ensayo de la demo completa (Sprints 1 a 4, por HTTP)
#
# Prueba contra el backend lo mismo que se muestra en la Sprint Review:
#   1. Login admin  2. Registrar mozo (HU-01)  3. Login del mozo del seed
#   4. Desactivarlo (HU-03)  5. Pierde acceso con su token  6. Reactivarlo
#   7. Aislamiento entre restaurantes  (+ CORS desde localhost:5173)
#   Sprint 2 (Django): 8. Insumos, carta, receta y costo
#   Sprint 3: 9. Mesas  10. Pedido de punta a punta (mozo, cocina, descuento,
#             anulación con merma, cierre)  11. Almacén (compra, kardex, merma, conteo)
#   Sprint 4 (Django): 12. Reportes, sugerencia, proveedores, alertas y Excel
#
# Requisitos:
#   - BD cargada con docs/script_database.sql + docs/seed_demo.sql
#   - Spring corriendo (por defecto http://localhost:8080) y Django
#     (por defecto http://localhost:8000), p. ej. con docker compose (docs/DESPLIEGUE.md)
#   - HU-01, HU-02 y HU-03 integradas (el paso 2 usa POST /api/empleados)
#   - bash (Git Bash en Windows), curl y python
#
# Uso:
#   bash docs/ensayo_demo.sh
#   API=http://otro-host:8080 DJ=http://otro-host:8000 bash docs/ensayo_demo.sh
#
# HU-01-b: el mozo nuevo crea su contraseña con el enlace del correo, que este
# guion no puede leer; por eso los pasos 3 a 6 usan mozo.central del seed.
# Cada corrida registra un mozo nuevo (correo con marca de tiempo). Para
# volver a una BD limpia antes de la demo, recrearla y cargar los 2 SQL.
# ============================================================
API=${API:-http://localhost:8080}
DJ=${DJ:-http://localhost:8000}
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

reqd() { local b=$API; API=$DJ/api/catalogo; req "$@"; API=$b; }  # lo mismo contra Django
pin() { req POST /api/auth/login-pin - "{\"correo\":\"$1\",\"pin\":\"1234\"}"; }
campo() { python -I -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

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

echo "Paso 8 · Insumos, carta, receta y costo (HU-05 a HU-08, Django)"
r=$(reqd GET /insumos/ "$ADMIN"); check "admin lista insumos" 200 "${r%%|*}"
INS=${r#*|}
r=$(reqd GET /insumos/ -); check "Django sin token" 401 "${r%%|*}"
r=$(reqd POST /insumos/ "$ADMIN" '{"nombre":"Arroz","unidad_medida":"kg","stock_actual":"1","stock_minimo":"1","costo_unitario":"1"}')
check "insumo con nombre repetido" 400 "${r%%|*}"
r=$(reqd GET /productos/ "$ADMIN"); check "admin lista la carta" 200 "${r%%|*}"
LOMO=$(echo "${r#*|}" | campo "next(p['id'] for p in d if p['nombre']=='Lomo saltado')")
COSTO=$(echo "${r#*|}" | campo "next(p['costo'] for p in d if p['nombre']=='Lomo saltado')")
if [ -n "$COSTO" ] && [ "$COSTO" != "None" ]; then check "Lomo saltado tiene costo por receta (S/ $COSTO)" "sí" "sí"; else check "Lomo saltado tiene costo por receta" "sí" "no"; fi
r=$(reqd GET "/productos/$LOMO/receta/" "$ADMIN"); check "receta del Lomo saltado" 200 "${r%%|*}"
r=$(reqd GET /categorias/ "$ADMIN"); check "categorías de la carta" 200 "${r%%|*}"

echo "Paso 9 · Mesas (HU-26)"
r=$(pin mozo.central@gastromind.demo); check "mozo entra con PIN (HU-27)" 200 "${r%%|*}"
MOZO_TOKEN=$(echo "${r#*|}" | json "['token']")
r=$(pin cocina.central@gastromind.demo); check "cocina entra con PIN" 200 "${r%%|*}"
COCINA=$(echo "${r#*|}" | json "['token']")
r=$(pin almacen.central@gastromind.demo); check "almacén entra con PIN" 200 "${r%%|*}"
ALMACEN=$(echo "${r#*|}" | json "['token']")
r=$(req POST /api/auth/login-pin - '{"correo":"mozo.central@gastromind.demo","pin":"0000"}'); check "PIN incorrecto" 401 "${r%%|*}"
r=$(req GET /api/mesas "$MOZO_TOKEN"); check "mozo ve las mesas" 200 "${r%%|*}"
MESA=$(echo "${r#*|}" | campo "next(m['id'] for m in d if m['estado']=='LIBRE')")
NUM=$(echo "${r#*|}" | campo "d[0]['numero']")
r=$(req POST /api/mesas "$ADMIN" "{\"numero\":$NUM,\"capacidad\":4,\"zona\":\"Salón\"}"); check "mesa con número repetido" 409 "${r%%|*}"

echo "Paso 10 · Pedido de punta a punta (HU-09 a HU-13 y HU-18)"
stock() { reqd GET /insumos/ "$ADMIN" | cut -d'|' -f2- | campo "next(i['stock_actual'] for i in d if i['nombre']=='$1')"; }
ANTES=$(stock 'Lomo de res')
r=$(req POST /api/pedidos "$MOZO_TOKEN" "{\"mesaId\":$MESA,\"items\":[{\"productoId\":$LOMO,\"cantidad\":2}]}")
check "mozo toma el pedido (2 Lomo saltado)" 201 "${r%%|*}" "${r#*|}"
PED=$(echo "${r#*|}" | json "['id']")
D1=$(echo "${r#*|}" | json "['detalles'][0]['id']")
r=$(req GET /api/pedidos "$COCINA"); if echo "${r#*|}" | campo "any(p['id']==$PED for p in d)" | grep -q True; then check "cocina ve la comanda (HU-10)" "sí" "sí"; else check "cocina ve la comanda (HU-10)" "sí" "no"; fi
r=$(req PATCH "/api/pedidos/$PED/detalles/$D1/estado" "$MOZO_TOKEN" '{"estado":"EN_PREPARACION"}'); check "el mozo no puede cocinar" 403 "${r%%|*}"
r=$(req PATCH "/api/pedidos/$PED/detalles/$D1/estado" "$COCINA" '{"estado":"SERVIDO"}'); check "no se salta estados" 409 "${r%%|*}"
for e in EN_PREPARACION LISTO; do r=$(req PATCH "/api/pedidos/$PED/detalles/$D1/estado" "$COCINA" "{\"estado\":\"$e\"}"); check "cocina lo pasa a $e (HU-11)" 200 "${r%%|*}" "${r#*|}"; done
r=$(req PATCH "/api/pedidos/$PED/detalles/$D1/estado" "$MOZO_TOKEN" '{"estado":"SERVIDO"}'); check "mozo lo sirve" 200 "${r%%|*}" "${r#*|}"
DESPUES=$(stock 'Lomo de res')
if python -I -c "import sys; sys.exit(0 if float('$DESPUES')<float('$ANTES') else 1)"; then check "baja el Lomo de res al servir (HU-13: $ANTES → $DESPUES)" "sí" "sí"; else check "baja el Lomo de res al servir (HU-13)" "sí" "no" "$ANTES → $DESPUES"; fi
r=$(req POST "/api/pedidos/$PED/detalles" "$MOZO_TOKEN" "{\"items\":[{\"productoId\":$LOMO,\"cantidad\":1}]}"); check "segunda ronda (se agrega al mismo pedido)" 200 "${r%%|*}" "${r#*|}"
D2=$(echo "${r#*|}" | campo "[x['id'] for x in d['detalles'] if x['estado']=='PENDIENTE'][-1]")
r=$(req PATCH "/api/pedidos/$PED/detalles/$D2/estado" "$COCINA" '{"estado":"EN_PREPARACION"}'); check "cocina empieza la segunda ronda" 200 "${r%%|*}"
QUEMADO=$(req GET /api/mermas/motivos "$COCINA" | cut -d'|' -f2- | campo "next(m['id'] for m in d if m['nombre']=='QUEMADO')")
r=$(req POST "/api/pedidos/$PED/detalles/$D2/anular" "$COCINA" "{\"motivoId\":$QUEMADO}"); check "anular un platillo quemado → merma (HU-18)" 200 "${r%%|*}" "${r#*|}"
r=$(req POST "/api/pedidos/$PED/cerrar" "$MOZO_TOKEN"); check "mozo cierra la mesa y saca la cuenta (HU-12)" 200 "${r%%|*}" "${r#*|}"
echo "     cuenta: $(echo "${r#*|}" | campo "d.get('total', d)")"
r=$(req GET /api/mesas "$MOZO_TOKEN"); check "la mesa vuelve a LIBRE" LIBRE "$(echo "${r#*|}" | campo "next(m['estado'] for m in d if m['id']==$MESA)")"

echo "Paso 11 · Almacén: compra, kardex, merma y conteo (HU-14, 15, 17 y 30)"
r=$(req GET /api/compras/opciones "$ALMACEN"); check "opciones de compra" 200 "${r%%|*}"
PROV=$(echo "${r#*|}" | json "['proveedores'][0]['id']")
TOM=$(echo "$INS" | campo "next(i['id'] for i in d if i['nombre']=='Tomate')")
VENCE=$(date -d '+20 days' +%F 2>/dev/null || python -I -c "import datetime;print(datetime.date.today()+datetime.timedelta(20))")
r=$(req POST /api/compras "$ALMACEN" "{\"proveedorId\":$PROV,\"ingredienteId\":$TOM,\"cantidad\":5,\"costoTotal\":21.50,\"lote\":\"ENSAYO\",\"fechaVencimiento\":\"$VENCE\"}")
check "registrar compra de 5 kg de tomate" 201 "${r%%|*}" "${r#*|}"
r=$(req POST /api/compras "$ALMACEN" "{\"proveedorId\":$PROV,\"ingredienteId\":$TOM,\"cantidad\":0,\"costoTotal\":1}"); check "compra con cantidad 0" 400 "${r%%|*}"
r=$(reqd GET "/insumos/$TOM/kardex/" "$ALMACEN"); check "kardex del tomate (HU-15)" 200 "${r%%|*}"
r=$(req POST /api/mermas "$ALMACEN" "{\"ingredienteId\":$TOM,\"cantidad\":0.2,\"motivoId\":$QUEMADO}"); check "registrar merma (HU-17)" 201 "${r%%|*}" "${r#*|}"
r=$(req POST /api/conteos "$ALMACEN" "{\"ingredienteId\":$TOM,\"cantidad\":1}"); check "conteo físico (HU-30)" 201 "${r%%|*}" "${r#*|}"
r=$(req POST /api/compras "$MOZO_TOKEN" "{\"proveedorId\":$PROV,\"ingredienteId\":$TOM,\"cantidad\":1,\"costoTotal\":1}"); check "el mozo no registra compras" 403 "${r%%|*}"

echo "Paso 12 · Reportes y alertas (HU-16 y HU-19 a HU-24, Django)"
for x in "merma/:merma por insumo y motivo (HU-19)" "consumo/:teórico vs. real (HU-20)" "sugerencia/:sugerencia de compra (HU-21)" "panel/:panel de ventas, costo y merma (HU-23)"; do
  r=$(reqd GET "/reportes/${x%%:*}" "$ADMIN"); check "${x#*:}" 200 "${r%%|*}" "${r#*|}"; done
r=$(reqd GET "/reportes/proveedores/?insumo=$TOM&cantidad=10" "$ADMIN"); check "proveedor de menor costo (HU-22)" 200 "${r%%|*}" "${r#*|}"
r=$(reqd GET /alertas/ "$ADMIN"); check "alertas de stock mínimo y vencimiento (HU-16)" 200 "${r%%|*}"
for t in merma consumo inventario; do
  c=$(curl -s -o "$BODY" -w '%{http_code}|%{content_type}' "$DJ/api/catalogo/reportes/exportar/?tipo=$t" -H "Authorization: Bearer $ADMIN")
  check "exportar $t a Excel (HU-24)" "200|xlsx" "${c%%|*}|$(echo "${c#*|}" | grep -q spreadsheet && echo xlsx || echo "${c#*|}")"; done
r=$(reqd GET /reportes/panel/ "$MOZO_TOKEN"); check "el mozo no ve reportes" 403 "${r%%|*}"
r=$(reqd GET /insumos/ "$NORTE"); if echo "${r#*|}" | campo "any(i['id']==$TOM for i in d)" | grep -q False; then check "Norte no ve los insumos de Central" "no" "no"; else check "Norte no ve los insumos de Central" "no" "sí"; fi

echo; echo "Resultado: $OK OK · $FAIL fallos"
[ "$FAIL" -eq 0 ]
