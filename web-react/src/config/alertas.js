import { DJANGO_URL } from './api';

// HU-16: las alertas las calcula Django con el mismo token del login de Spring
export const ALERTAS_URL = `${DJANGO_URL}/api/catalogo/alertas/`;
export const ROLES_CON_ALERTAS = ['ADMINISTRADOR', 'ALMACENERO'];

// "2.100" → "2.1": la API manda los decimales como texto
export const cantidad = (valor) => String(Number(valor));

// "2026-10-31" → "31/10", sin pasar por Date para que la zona horaria no cambie el día
export const diaMes = (fecha) => fecha.split('-').reverse().slice(0, 2).join('/');

// Texto del lote según cuánto le falta para vencer (CA-16: 3 días antes)
export const cuandoVence = (lote) => {
  if (lote.vencido) return 'ya venció';
  if (lote.dias_restantes === 0) return 'vence hoy';
  if (lote.dias_restantes === 1) return 'en 1 día';
  return `en ${lote.dias_restantes} días`;
};
