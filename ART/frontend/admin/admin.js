const API_BASE = '/api';

let salas = [];
let equipos = [];
let reservas = [];

// ===================== AUTENTICACIÓN =====================

function getToken() {
  return localStorage.getItem('adminToken');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

function cerrarSesion() {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUsername');
  window.location.replace('/admin/login.html');
}

function verificarAuth() {
  const token = getToken();
  if (!token) {
    window.location.replace('/admin/login.html');
    return false;
  }

  // Mostrar nombre de usuario en el header
  const username = localStorage.getItem('adminUsername');
  if (username) {
    const el = document.getElementById('adminUsernameDisplay');
    if (el) el.textContent = `Hola, ${username}`;
  }
  return true;
}

// Wrapper de fetch con auth y manejo de 401
async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) }
  });

  if (res.status === 401) {
    cerrarSesion();
    return null;
  }
  return res;
}

// ===================== INICIALIZAR =====================

// Inicializar aplicación
async function inicializarAdmin() {
  if (!verificarAuth()) return;

  await cargarDatos();
  
  // Event listeners para tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', cambiarTab);
  });

  // Event listeners para modales
  document.getElementById('adminModalClose').addEventListener('click', cerrarModal);
  document.getElementById('adminModal').addEventListener('click', cerrarModalAlHacerClick);
}

// Cambiar tab
function cambiarTab(e) {
  const tabName = e.target.dataset.tab;

  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  e.target.classList.add('active');
  document.getElementById(tabName).classList.add('active');

  if (tabName === 'emails-tab') {
    cargarAdminEmails();
  }
}

// Cargar todos los datos
async function cargarDatos() {
  try {
    const [salasRes, equiposRes, reservasRes] = await Promise.all([
      fetch(`${API_BASE}/salas`),
      fetch(`${API_BASE}/equipos`),
      authFetch(`${API_BASE}/reservas`)
    ]);

    if (!salasRes || !equiposRes || !reservasRes) return;

    salas = await salasRes.json();
    equipos = await equiposRes.json();
    reservas = await reservasRes.json();

    // Compartir datos con reportes.js
    if (typeof window !== 'undefined') {
      window.todasLasReservas = reservas;
      window.todasLasSalas = salas;
      window.todosLosEquipos = equipos;
    }

    actualizarVistas();
  } catch (error) {
    mostrarAlertaAdmin('Error al cargar los datos', 'danger');
  }
}

// Actualizar todas las vistas
function actualizarVistas() {
  mostrarSalasAdmin();
  mostrarEquiposAdmin();
  mostrarReservasAdmin();
}

// ===================== GESTIÓN DE SALAS =====================

function mostrarSalasAdmin() {
  const container = document.getElementById('salasAdminList');
  container.innerHTML = '';

  if (salas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay salas registradas</p>';
    return;
  }

  salas.forEach(sala => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="flex-between">
        <div>
          <h4 style="color: var(--primary-color); margin-bottom: 10px;">${sala.nombre}</h4>
          <p style="color: #7f8c8d; margin-bottom: 10px;">${sala.descripcion || 'Sin descripción'}</p>
          <div style="font-size: 12px; color: #7f8c8d;">
            ${sala.aire_acondicionado ? '✓ Aire Acondicionado | ' : ''}
            ${sala.television ? '✓ Televisión' : ''}
          </div>
        </div>
        <div class="flex gap-10">
          <button class="btn btn-warning" onclick="abrirModalEditarSala(${sala.id})">Editar</button>
          <button class="btn btn-danger" onclick="eliminarSala(${sala.id})">Eliminar</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function abrirModalCrearSala() {
  document.getElementById('formSalaTitle').textContent = 'Crear Nueva Sala';
  document.getElementById('salaId').value = '';
  document.getElementById('formSala').reset();
  
  // Cambiar los formularios mostrados
  document.getElementById('formSala').style.display = 'block';
  document.getElementById('formEquipo').style.display = 'none';
  
  document.getElementById('adminModal').classList.add('active');
}

async function abrirModalEditarSala(id) {
  const sala = salas.find(s => s.id === id);
  if (!sala) return;

  document.getElementById('formSalaTitle').textContent = 'Editar Sala';
  document.getElementById('salaId').value = id;
  document.getElementById('salaNombre').value = sala.nombre;
  document.getElementById('salaDescripcion').value = sala.descripcion || '';
  document.getElementById('salaAire').checked = sala.aire_acondicionado;
  document.getElementById('salaTV').checked = sala.television;
  
  // Cambiar los formularios mostrados
  document.getElementById('formSala').style.display = 'block';
  document.getElementById('formEquipo').style.display = 'none';
  
  document.getElementById('adminModal').classList.add('active');
}

async function guardarSala(e) {
  e.preventDefault();

  const id = document.getElementById('salaId').value;
  const nombre = document.getElementById('salaNombre').value.trim();
  const descripcion = document.getElementById('salaDescripcion').value.trim();
  const aire = document.getElementById('salaAire').checked;
  const tv = document.getElementById('salaTV').checked;

  if (!nombre) {
    mostrarAlertaAdmin('El nombre de la sala es requerido', 'warning');
    return;
  }

  try {
    const url = id ? `${API_BASE}/salas/${id}` : `${API_BASE}/salas/crear`;
    const method = id ? 'PUT' : 'POST';

    const response = await authFetch(url, {
      method: method,
      body: JSON.stringify({
        nombre,
        descripcion,
        aire_acondicionado: aire,
        television: tv
      })
    });

    if (!response) return;
    if (response.ok) {
      mostrarAlertaAdmin(id ? 'Sala actualizada exitosamente' : 'Sala creada exitosamente', 'success');
      cerrarModal();
      await cargarDatos();
    } else {
      mostrarAlertaAdmin('Error al guardar la sala', 'danger');
    }
  } catch (error) {
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

async function eliminarSala(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta sala?')) return;

  try {
    const response = await authFetch(`${API_BASE}/salas/${id}`, {
      method: 'DELETE'
    });

    if (!response) return;
    if (response.ok) {
      mostrarAlertaAdmin('Sala eliminada exitosamente', 'success');
      await cargarDatos();
    } else {
      mostrarAlertaAdmin('Error al eliminar la sala', 'danger');
    }
  } catch (error) {
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

// ===================== GESTIÓN DE EQUIPOS =====================

function mostrarEquiposAdmin() {
  const container = document.getElementById('equiposAdminList');
  container.innerHTML = '';

  if (equipos.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay equipos registrados</p>';
    return;
  }

  equipos.forEach(equipo => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="flex-between">
        <div>
          <h4 style="color: var(--primary-color); margin-bottom: 10px;">${equipo.nombre}</h4>
          <p style="color: #7f8c8d; margin-bottom: 10px;">${equipo.descripcion || 'Sin descripción'}</p>
          <div style="font-size: 12px;">
            <span class="badge badge-info">Total: ${equipo.cantidad}</span>
            <span class="badge badge-success">Disponibles: ${equipo.disponible}</span>
          </div>
        </div>
        <div class="flex gap-10">
          <button class="btn btn-warning" onclick="abrirModalEditarEquipo(${equipo.id})">Editar</button>
          <button class="btn btn-danger" onclick="eliminarEquipo(${equipo.id})">Eliminar</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function abrirModalCrearEquipo() {
  document.getElementById('formSalaTitle').textContent = 'Crear Nuevo Equipo';
  document.getElementById('equipoId').value = '';
  document.getElementById('formEquipo').reset();
  
  // Cambiar los formularios mostrados
  document.getElementById('formSala').style.display = 'none';
  document.getElementById('formEquipo').style.display = 'block';
  
  document.getElementById('adminModal').classList.add('active');
}

async function abrirModalEditarEquipo(id) {
  const equipo = equipos.find(e => e.id === id);
  if (!equipo) return;

  document.getElementById('formSalaTitle').textContent = 'Editar Equipo';
  document.getElementById('equipoId').value = id;
  document.getElementById('equipoNombre').value = equipo.nombre;
  document.getElementById('equipoDescripcion').value = equipo.descripcion || '';
  document.getElementById('equipoCantidad').value = equipo.cantidad;
  document.getElementById('equipoDisponible').value = equipo.disponible;
  
  // Cambiar los formularios mostrados
  document.getElementById('formSala').style.display = 'none';
  document.getElementById('formEquipo').style.display = 'block';
  
  document.getElementById('adminModal').classList.add('active');
}

async function guardarEquipo(e) {
  e.preventDefault();

  const id = document.getElementById('equipoId').value;
  const nombre = document.getElementById('equipoNombre').value.trim();
  const descripcion = document.getElementById('equipoDescripcion').value.trim();
  const cantidad = parseInt(document.getElementById('equipoCantidad').value) || 1;
  const disponible = parseInt(document.getElementById('equipoDisponible').value) || cantidad;

  if (!nombre) {
    mostrarAlertaAdmin('El nombre del equipo es requerido', 'warning');
    return;
  }

  if (disponible > cantidad) {
    mostrarAlertaAdmin('Los disponibles no pueden ser más que el total', 'warning');
    return;
  }

  try {
    const url = id ? `${API_BASE}/equipos/${id}` : `${API_BASE}/equipos/crear`;
    const method = id ? 'PUT' : 'POST';

    const response = await authFetch(url, {
      method: method,
      body: JSON.stringify({
        nombre,
        descripcion,
        cantidad,
        disponible
      })
    });

    if (!response) return;
    if (response.ok) {
      mostrarAlertaAdmin(id ? 'Equipo actualizado exitosamente' : 'Equipo creado exitosamente', 'success');
      cerrarModal();
      await cargarDatos();
    } else {
      mostrarAlertaAdmin('Error al guardar el equipo', 'danger');
    }
  } catch (error) {
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

async function eliminarEquipo(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este equipo?')) return;

  try {
    const response = await authFetch(`${API_BASE}/equipos/${id}`, {
      method: 'DELETE'
    });

    if (!response) return;
    if (response.ok) {
      mostrarAlertaAdmin('Equipo eliminado exitosamente', 'success');
      await cargarDatos();
    } else {
      mostrarAlertaAdmin('Error al eliminar el equipo', 'danger');
    }
  } catch (error) {
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

// ===================== GESTIÓN DE RESERVAS =====================

function mostrarReservasAdmin() {
  const container = document.getElementById('reservasAdminList');
  container.innerHTML = '';

  if (reservas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay reservas registradas</p>';
    return;
  }

  reservas.forEach(reserva => {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Determinar color de estado
    let badgeClass = 'badge-success';
    let estadoTexto = 'Activa';
    
    if (reserva.estado === 'cancelada') {
      badgeClass = 'badge-danger';
      estadoTexto = 'Cancelada';
    } else if (reserva.estado === 'completada') {
      badgeClass = 'badge-info';
      estadoTexto = 'Completada';
    }
    
    const fecha = new Date(reserva.fecha_reserva).toLocaleDateString('es-ES');
    const horaInicio = reserva.hora_inicio?.substring(0, 5) || '--:--';
    const horaFin = reserva.hora_fin?.substring(0, 5) || '--:--';
    
    card.innerHTML = `
      <div class="flex-between">
        <div style="flex: 1;">
          <h4 style="color: var(--primary); margin-bottom: 10px;">
            ${reserva.numero_reserva} - ${reserva.nombre_persona}
          </h4>
          <p style="color: var(--text-secondary); margin-bottom: 12px;">
            <strong>Sala:</strong> ${reserva.sala || 'N/A'} | 
            <strong>Fecha:</strong> ${fecha} | 
            <strong>Hora:</strong> ${horaInicio} - ${horaFin}
          </p>
          ${reserva.razon_cancelacion ? `<p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;"><strong>Razón:</strong> ${reserva.razon_cancelacion}</p>` : ''}
          <span class="badge ${badgeClass}">${estadoTexto}</span>
        </div>
        <div class="flex gap-10">
          ${reserva.estado === 'activa' ? `<button class="btn btn-danger" onclick="abrirModalCancelarReserva(${reserva.id}, '${reserva.numero_reserva}', '${reserva.nombre_persona}')">Cancelar</button>` : ''}
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ===================== UTILIDADES =====================

function cerrarModal() {
  document.getElementById('adminModal').classList.remove('active');
  document.getElementById('formSala').style.display = 'block';
  document.getElementById('formEquipo').style.display = 'none';
}

function cerrarModalAlHacerClick(e) {
  if (e.target.id === 'adminModal') {
    cerrarModal();
  }
}

function mostrarAlertaAdmin(mensaje, tipo = 'info') {
  const alertasContainer = document.getElementById('alertasAdmin');
  
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo}`;
  alerta.innerHTML = `
    <strong>${tipo === 'success' ? '✓' : tipo === 'danger' ? '✗' : tipo === 'warning' ? '⚠' : 'ℹ'}</strong>
    ${mensaje}
  `;

  alertasContainer.appendChild(alerta);

  setTimeout(() => {
    alerta.style.opacity = '0';
    alerta.style.transition = 'opacity 0.3s ease';
    setTimeout(() => alerta.remove(), 300);
  }, 5000);
}

// ===================== FILTROS DE RESERVAS =====================

async function aplicarFiltrosReservas() {
  const nombre = document.getElementById('filtroNombre').value.trim();
  const estado = document.getElementById('filtroEstado').value;
  const fechaInicio = document.getElementById('filtroFechaInicio').value;
  const fechaFin = document.getElementById('filtroFechaFin').value;

  try {
    let url = `${API_BASE}/reservas/buscar?`;
    const params = new URLSearchParams();

    if (nombre) params.append('nombre', nombre);
    if (estado) params.append('estado', estado);
    if (fechaInicio) params.append('fecha_inicio', fechaInicio);
    if (fechaFin) params.append('fecha_fin', fechaFin);

    url += params.toString();

    const response = await authFetch(url);
    if (!response) return;
    const result = await response.json();

    if (result.success) {
      reservas = result.data;
      // Actualizar datos globales
      window.todasLasReservas = reservas;
      mostrarReservasAdmin();
    } else {
      mostrarAlertaAdmin('Error al filtrar reservas', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

function limpiarFiltrosReservas() {
  document.getElementById('filtroNombre').value = '';
  document.getElementById('filtroEstado').value = '';
  document.getElementById('filtroFechaInicio').value = '';
  document.getElementById('filtroFechaFin').value = '';
  
  cargarDatos();
}

// ===================== CANCELAR CON RAZÓN =====================

function abrirModalCancelarReserva(id, numeroReserva, nombrePersona) {
  const razon = prompt(`¿Razón de la cancelación para ${nombrePersona}?\n\nNúmero de reserva: ${numeroReserva}`);
  
  if (razon !== null) {
    cancelarReservaConRazon(id, razon);
  }
}

async function cancelarReservaConRazon(id, razon) {
  try {
    const response = await authFetch(`${API_BASE}/reservas/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ razon_cancelacion: razon })
    });

    if (!response) return;
    if (response.ok) {
      mostrarAlertaAdmin('Reserva cancelada exitosamente', 'success');
      await cargarDatos();
    } else {
      mostrarAlertaAdmin('Error al cancelar la reserva', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

// ===================== MI CUENTA =====================

function abrirModalCuenta() {
  document.getElementById('cuentaUsuario').value = localStorage.getItem('adminUsername') || '';
  document.getElementById('formCuenta').reset();
  document.getElementById('cuentaUsuario').value = localStorage.getItem('adminUsername') || '';
  document.getElementById('cuentaAlerta').style.display = 'none';
  document.getElementById('modalCuenta').classList.add('active');
}

function cerrarModalCuenta() {
  document.getElementById('modalCuenta').classList.remove('active');
}

async function guardarCuenta(e) {
  e.preventDefault();

  const passwordActual = document.getElementById('cuentaPasswordActual').value;
  const passwordNuevo = document.getElementById('cuentaPasswordNuevo').value;
  const passwordConfirmar = document.getElementById('cuentaPasswordConfirmar').value;
  const alerta = document.getElementById('cuentaAlerta');

  alerta.style.display = 'none';

  if (passwordNuevo !== passwordConfirmar) {
    alerta.className = 'alert alert-danger';
    alerta.textContent = 'Las contraseñas nuevas no coinciden';
    alerta.style.display = 'block';
    return;
  }

  try {
    const res = await authFetch(`${API_BASE}/auth/cuenta`, {
      method: 'PUT',
      body: JSON.stringify({ passwordActual, passwordNuevo })
    });

    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      alerta.className = 'alert alert-success';
      alerta.textContent = data.message;
      alerta.style.display = 'block';
      document.getElementById('formCuenta').reset();
      document.getElementById('cuentaUsuario').value = localStorage.getItem('adminUsername') || '';
    } else {
      alerta.className = 'alert alert-danger';
      alerta.textContent = data.error || 'Error al actualizar la contraseña';
      alerta.style.display = 'block';
    }
  } catch {
    alerta.className = 'alert alert-danger';
    alerta.textContent = 'Error de conexión';
    alerta.style.display = 'block';
  }
}

// ===================== CORREOS DE NOTIFICACIÓN =====================

let adminEmails = [];

async function cargarAdminEmails() {
  try {
    const res = await authFetch(`${API_BASE}/admin-emails`);
    if (!res) return;
    adminEmails = await res.json();
    mostrarAdminEmails();
  } catch {
    mostrarAlertaAdmin('Error al cargar los correos de notificación', 'danger');
  }
}

function mostrarAdminEmails() {
  const container = document.getElementById('emailsAdminList');
  if (!container) return;
  container.innerHTML = '';

  if (adminEmails.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay correos de notificación registrados</p>';
    return;
  }

  adminEmails.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="flex-between">
        <div>
          <h4 style="color: var(--primary); margin-bottom: 6px;">${item.email}</h4>
          ${item.nombre ? `<p style="color: #7f8c8d; margin-bottom: 8px; font-size: 14px;">${item.nombre}</p>` : ''}
          <span class="badge ${item.activo ? 'badge-success' : 'badge-danger'}" style="cursor:pointer;" onclick="toggleCorreo(${item.id}, ${item.activo})">
            ${item.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div class="flex gap-10">
          <button class="btn btn-warning" onclick="abrirFormEditarCorreo(${item.id})">Editar</button>
          <button class="btn btn-danger" onclick="eliminarCorreo(${item.id})">Eliminar</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function abrirFormCorreo() {
  document.getElementById('correoId').value = '';
  document.getElementById('correoEmail').value = '';
  document.getElementById('correoNombre').value = '';
  document.getElementById('formCorreoTitle').textContent = 'Agregar Correo';
  document.getElementById('formCorreoContainer').style.display = 'block';
}

function abrirFormEditarCorreo(id) {
  const item = adminEmails.find(e => e.id === id);
  if (!item) return;
  document.getElementById('correoId').value = id;
  document.getElementById('correoEmail').value = item.email;
  document.getElementById('correoNombre').value = item.nombre || '';
  document.getElementById('formCorreoTitle').textContent = 'Editar Correo';
  document.getElementById('formCorreoContainer').style.display = 'block';
}

function cerrarFormCorreo() {
  document.getElementById('formCorreoContainer').style.display = 'none';
}

async function guardarCorreo() {
  const id = document.getElementById('correoId').value;
  const email = document.getElementById('correoEmail').value.trim();
  const nombre = document.getElementById('correoNombre').value.trim();

  if (!email) {
    mostrarAlertaAdmin('El correo electrónico es requerido', 'warning');
    return;
  }

  try {
    const url = id ? `${API_BASE}/admin-emails/${id}` : `${API_BASE}/admin-emails`;
    const method = id ? 'PUT' : 'POST';
    const body = id
      ? JSON.stringify({ email, nombre, activo: adminEmails.find(e => e.id === parseInt(id))?.activo ?? true })
      : JSON.stringify({ email, nombre });

    const res = await authFetch(url, { method, body });
    if (!res) return;
    const data = await res.json();

    if (res.ok) {
      mostrarAlertaAdmin(id ? 'Correo actualizado correctamente' : 'Correo agregado correctamente', 'success');
      cerrarFormCorreo();
      await cargarAdminEmails();
    } else {
      mostrarAlertaAdmin(data.error || 'Error al guardar el correo', 'danger');
    }
  } catch {
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

async function eliminarCorreo(id) {
  if (!confirm('¿Eliminar este correo de la lista de notificaciones?')) return;

  try {
    const res = await authFetch(`${API_BASE}/admin-emails/${id}`, { method: 'DELETE' });
    if (!res) return;
    if (res.ok) {
      mostrarAlertaAdmin('Correo eliminado correctamente', 'success');
      await cargarAdminEmails();
    } else {
      const data = await res.json();
      mostrarAlertaAdmin(data.error || 'Error al eliminar el correo', 'danger');
    }
  } catch {
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

async function toggleCorreo(id, activoActual) {
  const item = adminEmails.find(e => e.id === id);
  if (!item) return;

  try {
    const res = await authFetch(`${API_BASE}/admin-emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ email: item.email, nombre: item.nombre, activo: !activoActual })
    });
    if (!res) return;
    if (res.ok) {
      await cargarAdminEmails();
    }
  } catch {
    mostrarAlertaAdmin('Error de conexión', 'danger');
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarAdmin);
