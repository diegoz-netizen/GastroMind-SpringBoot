# Rediseño web v1 (propuesta de Figma Make, sin modificar)

Prototipo navegable para ver cómo podría verse `web-react`. **No cambia nada del código de la web ni del backend**: es una propuesta aparte (Vite + React) para decidir qué se adopta antes de llevarla a `web-react` por HU.

## Cómo verlo
```bash
cd docs/diseno-web-v1
npm install
npm run dev
```
Entra con cualquier correo y contraseña. Los datos son de ejemplo y se guardan en el navegador; en Perfil hay "Restaurar datos iniciales" y un selector de rol para ver el menú de cada uno.

## Qué trae
Ingreso, recuperar y restablecer contraseña; Panel, Carta y recetas, Insumos y kardex, Compras, Mermas y reportes, Personal y Mesas; modo claro, oscuro y automático; escritorio con menú lateral y celular con barra inferior. Los formularios funcionan con los datos de ejemplo: una compra sube el stock y aparece en el kardex, una merma o un conteo cambian el stock y las alertas, y se pueden crear insumos, proveedores, empleados, mesas y platillos.

## Lo que no cuadra con la web actual (para revisar antes de adoptar)
1. **Motivos de merma inventados** (Preparación, Deterioro, Sobras, Otro). El sistema usa los 8 reales: Quemado, Derramado, Vencido, Mal manejo, Sobrante, Devolución, Cortesía y Plato anulado.
2. **Cifras fijas, no calculadas:** merma por motivo, ventas por semana, consumo teórico contra real y merma total del reporte.
3. **Botones mal conectados:** "Editar platillo" y tocar una mesa abren el formulario de *crear*; el filtro de periodo del Kardex no filtra; Ctrl+K solo muestra un aviso; "Nuevo platillo" deja solo 2 insumos fijos en la receta (la real se arma insumo por insumo).
4. **Texto inventado:** cifras en el login (−18% mermas, +7,4% margen), una tarjeta de "Centro de ayuda" y la sede "Miraflores".
5. **Nombres distintos a los del sistema:** "Compras" (en la web es "Compras y proveedores") y "Mesas" (es "Mesas del salón"). Exporta CSV, no el Excel de la API.
6. **Logo dibujado por Make**, no el archivo real de `Logo/`; y para activar o desactivar personal usa el cuadro del navegador (`confirm`).
7. **Barra inferior en celular:** la web actual usa menú lateral y hamburguesa; esto es de app móvil.
8. **Roles:** recorta el menú por rol (cocinero 3 módulos, almacenero 2, mozo 2); hoy el código solo separa administrador del resto.
9. El Kardex dentro de Insumos es nuevo: el menú dice "Insumos y kardex" pero la pantalla actual no lo trae.

## Qué se hace con esto
Si se elige este diseño, se lleva a `web-react` por HU con esos puntos corregidos. Si algo no convence, se anota en el PR.
