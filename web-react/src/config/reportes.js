import axios from 'axios';
import { DJANGO_URL } from './api';

// Sprint 4: los reportes del gerente los calcula Django (HU-19 a HU-24), solo para el ADMINISTRADOR
export const REPORTES_URL = `${DJANGO_URL}/api/catalogo/reportes`;

// "2026-11-07" en hora de Perú, sin pasar por UTC
export const hoyEnPeru = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });

// El periodo por defecto, igual que la API: del 1 del mes en curso a hoy
export const periodoDelMes = () => {
  const hoy = hoyEnPeru();
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
};

// GET a un reporte con el token del login de Spring; params: { desde, hasta, ... }
export const pedirReporte = async (ruta, token, params = {}) => {
  const respuesta = await axios.get(`${REPORTES_URL}/${ruta}`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return respuesta.data;
};

// Mismo formato de error que el resto (HL-014): mensaje y, si lo hay, el primer campo
export const mensajeDeReporte = (err) => {
  if (!err.response) return `No se pudo conectar con Django (${DJANGO_URL}).`;
  if (err.response.status === 403) return 'Solo el administrador puede ver los reportes.';
  const { mensaje, campos } = err.response.data ?? {};
  const primerCampo = campos && Object.values(campos)[0];
  return primerCampo || mensaje || 'No se pudo cargar el reporte.';
};
