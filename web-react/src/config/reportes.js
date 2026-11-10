import axios from 'axios';
import { DJANGO_URL, SPRING_URL } from './api';

export const CATALOGO = `${DJANGO_URL}/api/catalogo`;
export const API_SPRING = `${SPRING_URL}/api`;
export const conToken = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

const soles = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const solesEnteros = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 3 });

export const enSoles = (valor) => `S/ ${soles.format(valor ?? 0)}`;
export const enSolesEnteros = (valor) => `S/ ${solesEnteros.format(valor ?? 0)}`;
export const cantidadDe = (valor) => numero.format(valor ?? 0);
export const conSigno = (valor) => `${valor > 0 ? '+' : ''}${numero.format(valor)}`;

// "MAL_MANEJO" → "Mal manejo"
export const nombreMotivo = (nombre) => {
  const texto = nombre.replaceAll('_', ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

const iso = (fecha) => {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

// Últimos N días, sin contar hoy: el día en curso todavía no está completo
export const ultimosDias = (dias) => {
  const hasta = new Date();
  hasta.setDate(hasta.getDate() - 1);
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - (dias - 1));
  return { desde: iso(desde), hasta: iso(hasta) };
};

// "2026-11-10" en hora de Perú; del 1 del mes a hoy, como el periodo por defecto de la API
export const hoyEnPeru = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
export const periodoDelMes = () => {
  const hoy = hoyEnPeru();
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy };
};
// dias = 0 → el mes en curso
export const periodo = (dias) => (dias === 0 ? periodoDelMes() : ultimosDias(dias));

// null → "—" (un platillo sin receta no tiene % de costo)
export const enPorcentaje = (valor) => (valor === null || valor === undefined ? '—' : `${valor} %`);

export const fechaCorta =(texto) => texto.split('-').reverse().join('/');

export const mensajeError = (err, porDefecto = 'No se pudo completar la acción.') => {
  if (!err.response) return 'No se pudo conectar con el servidor.';
  const { data } = err.response;
  const campo = data?.campos && Object.values(data.campos)[0];
  return campo || data?.mensaje || porDefecto;
};

// HU-24: pide el Excel con el token y lo entrega como descarga
export const descargarExcel = async (token, parametros) => {
  const response = await axios.get(`${CATALOGO}/reportes/exportar/`, {
    ...conToken(token),
    params: parametros,
    responseType: 'blob',
  });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(response.data);
  enlace.download = `gastromind_${parametros.tipo}_${parametros.desde ?? ''}_${parametros.hasta ?? ''}.xlsx`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
};
