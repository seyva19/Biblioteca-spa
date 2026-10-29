const BASE_URL = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(typeof localStorage !== 'undefined' && localStorage.getItem('biblioteca_token')
        ? { Authorization: `Bearer ${localStorage.getItem('biblioteca_token')}` }
        : {}),
      ...options.headers
    }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Ocurrió un error al comunicarse con el servidor.');
  return data;
}

export const api = {
  registrar: (datos) => request('/auth/register', { method: 'POST', body: JSON.stringify(datos) }),
  iniciarSesion: (datos) => request('/auth/login', { method: 'POST', body: JSON.stringify(datos) }),
  sesionActual: () => request('/auth/me'),
  catalogo: () => request('/catalogo'),
  solicitudes: () => request('/solicitudes'),
  crearSolicitud: (datos) => request('/solicitudes', { method: 'POST', body: JSON.stringify(datos) }),
  aprobarSolicitud: (id) => request(`/solicitudes/${encodeURIComponent(id)}/aprobar`, { method: 'PATCH', body: JSON.stringify({}) }),
  rechazarSolicitud: (id) => request(`/solicitudes/${encodeURIComponent(id)}/rechazar`, { method: 'PATCH', body: JSON.stringify({}) }),
  materiales: () => request('/materiales'),
  crearMaterial: (datos) => request('/materiales', { method: 'POST', body: JSON.stringify(datos) }),
  lectores: () => request('/lectores'),
  crearLector: (datos) => request('/lectores', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarLector: (id, datos) => request(`/lectores/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(datos) }),
  eliminarLector: (id) => request(`/lectores/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  prestamos: (estado = 'TODOS') => request(`/prestamos?estado=${encodeURIComponent(estado)}`),
  prestamo: (id) => request(`/prestamos/${encodeURIComponent(id)}`),
  crearPrestamo: (datos) => request('/prestamos', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarPrestamo: (id, datos) => request(`/prestamos/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(datos) }),
  devolverPrestamo: (id) => request(`/prestamos/${encodeURIComponent(id)}/devolver`, { method: 'PATCH', body: JSON.stringify({}) }),
  eliminarPrestamo: (id) => request(`/prestamos/${encodeURIComponent(id)}`, { method: 'DELETE' })
};

export function hoyLocal() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
}

export function fechaMasDias(dias = 7) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

export function mostrarFecha(fecha) {
  if (!fecha) return '—';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}
