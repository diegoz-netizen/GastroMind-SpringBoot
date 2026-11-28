// URLs de los backends. Se leen de .env.local (copia de .env.example); si no existe, se usan las de desarrollo.
export const SPRING_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
export const DJANGO_URL = import.meta.env.VITE_DJANGO_URL ?? 'http://localhost:8000';
// Rediseño v2: la web de Operación (esta) y el panel de Catálogo (Django) se enlazan entre sí
export const CATALOGO_WEB_URL = import.meta.env.VITE_CATALOGO_WEB_URL ?? 'http://localhost:5174';
