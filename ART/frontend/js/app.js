const API_BASE = '/api';

let salas = [];
let salaSeleccionada = null;
let todasLasReservas = [];
let equiposDisponibles = [];
let equiposSeleccionados = [];
let paginaHistorial = 1;
let reservasHistorialTotales = 0;
let limiteHistorial = 10;

// Inicializar aplicación
async function inicializar() {
  await cargarHistorial(); // Primero cargar reservas
  await cargarSalas(); // Luego mostrar salas con reservas de hoy
  await cargarEquipos();
  document.getElementById('reservaModal').addEventListener('click', cerrarModalAlHacerClick);
  document.getElementById('closeBtn').addEventListener('click', cerrarModal);
  document.getElementById('historialModal').addEventListener('click', cerrarHistorialAlHacerClick);
  document.getElementById('closeHistorialBtn').addEventListener('click', cerrarHistorial);
  
  // Cargar selectores de hora
  llenarSelectoresHora();
  
  // Event listeners para duración
  document.getElementById('horaInicioH')?.addEventListener('change', actualizarDuracion);
  document.getElementById('horaInicioM')?.addEventListener('change', actualizarDuracion);
  document.getElementById('horaFinH')?.addEventListener('change', actualizarDuracion);
  document.getElementById('horaFinM')?.addEventListener('change', actualizarDuracion);
}

// Cargar equipos disponibles
async function cargarEquipos() {
  try {
    const response = await fetch(`${API_BASE}/equipos`);
    equiposDisponibles = await response.json();
  } catch (error) {
    console.error('Error al cargar equipos:', error);
  }
}

// Cargar salas disponibles
async function cargarSalas() {
  try {
    const response = await fetch(`${API_BASE}/salas`);
    salas = await response.json();
    mostrarSalas();
    mostrarReservasFuturas();
  } catch (error) {
    console.error('Error al cargar salas:', error);
    mostrarAlerta('Error al cargar las salas', 'danger');
  }
}

// Cargar historial de reservas
async function cargarHistorial() {
  try {
    const response = await fetch(`${API_BASE}/reservas`);
    todasLasReservas = await response.json();
    mostrarHistorial();
    mostrarReservasFuturas();
  } catch (error) {
    console.error('Error al cargar historial:', error);
    todasLasReservas = [];
    mostrarReservasFuturas();
  }
}

function normalizarFecha(fechaStr) {
  return (fechaStr || '').toString().split('T')[0];
}

function obtenerNombreSalaReserva(reserva) {
  if (reserva.sala) return reserva.sala;
  const sala = salas.find(s => s.id == reserva.id_sala);
  return sala ? sala.nombre : 'Sala';
}

function mostrarReservasFuturas() {
  const container = document.getElementById('reservasFuturasContainer');
  if (!container) return;

  if (!Array.isArray(todasLasReservas) || todasLasReservas.length === 0) {
    container.innerHTML = '<div class="futura-empty">No hay reservas futuras registradas.</div>';
    return;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const futuras = todasLasReservas
    .map(reserva => ({
      ...reserva,
      _fecha: normalizarFecha(reserva.fecha_reserva)
    }))
    .filter(reserva => reserva._fecha)
    .filter(reserva => {
      const fechaReserva = new Date(`${reserva._fecha}T00:00:00`);
      return fechaReserva >= hoy;
    })
    .sort((a, b) => {
      if (a._fecha !== b._fecha) return a._fecha.localeCompare(b._fecha);
      return (a.hora_inicio || '').localeCompare(b.hora_inicio || '');
    });

  if (futuras.length === 0) {
    container.innerHTML = '<div class="futura-empty">No hay reservas futuras registradas.</div>';
    return;
  }

  const agrupadas = new Map();
  futuras.forEach(reserva => {
    if (!agrupadas.has(reserva._fecha)) agrupadas.set(reserva._fecha, []);
    agrupadas.get(reserva._fecha).push(reserva);
  });

  let html = '';
  Array.from(agrupadas.keys()).sort().forEach(fecha => {
    const fechaLabel = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    html += `
      <div class="futura-card">
        <div class="futura-date">${fechaLabel}</div>
        <div class="futura-items">
    `;

    agrupadas.get(fecha).forEach(reserva => {
      const nombreSala = obtenerNombreSalaReserva(reserva);
      const horaInicio = (reserva.hora_inicio || '').substring(0, 5);
      const horaFin = (reserva.hora_fin || '').substring(0, 5);
      html += `
        <div class="futura-item">
          <div class="futura-main">
            <div class="futura-name">${reserva.nombre_persona}</div>
            <div class="futura-meta">${nombreSala}</div>
          </div>
          <div class="futura-time">${horaInicio} - ${horaFin}</div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Mostrar salas
function mostrarSalas() {
  const grid = document.getElementById('salasGrid');
  grid.innerHTML = '';

  salas.forEach(async sala => {
    const salaCard = document.createElement('div');
    salaCard.className = 'sala-card';

    // Features basadas en datos reales de la sala
    let featuresHtml = '<ul class="sala-features-inline">';
    if (sala.aire_acondicionado) {
      featuresHtml += '<li>❄️ Aire Acondicionado</li>';
    }
    if (sala.television) {
      featuresHtml += '<li>📺 Televisión</li>';
    }
    featuresHtml += '</ul>';

    // Obtener reservas de hoy para esta sala (máximo 5 y opción de ver más)
    const hoy = new Date().toISOString().split('T')[0];
    // Comparaciones tolerantes: puede venir como string o con diferentes formatos
    const reservasSalaHoy = todasLasReservas.filter(r => {
      try {
        const idSalaMatch = r.id_sala == sala.id;
        const fecha = (r.fecha_reserva || '').toString().split('T')[0];
        const fechaMatch = fecha === hoy;
        return idSalaMatch && fechaMatch;
      } catch (e) { return false; }
    });
    const reservasHoy = reservasSalaHoy.slice(0, 5);

    let reservasHtml = '';
    if (reservasHoy.length > 0) {
      reservasHtml = '<div class="sala-reservas-hoy"><h4>📅 Uso de Hoy</h4>';
      reservasHoy.forEach(r => {
        // Mostrar equipos si existen
        let equiposTexto = '';
        if (r.equipos && r.equipos.length > 0) {
          const nombresEquipos = r.equipos.map(eq => eq.nombre).join(', ');
          equiposTexto = ` <span style="font-size: 11px; color: #6c757d;">+ ${nombresEquipos}</span>`;
        }
        
        reservasHtml += `
          <div class="reserva-hoy-item">
            <span class="persona-nombre">${r.nombre_persona}${equiposTexto}</span>
            <span class="hora-reserva">${r.hora_inicio.substring(0,5)} - ${r.hora_fin.substring(0,5)}</span>
          </div>
        `;
      });
      
      if (reservasSalaHoy.length > 5) {
        reservasHtml += `<button class="btn btn-secondary" style="width:100%; margin-top:10px;" onclick="event.stopPropagation(); abrirHistorialSala(${sala.id});">Ver más (${reservasSalaHoy.length - 5} adicionales)</button>`;
      }
      reservasHtml += '</div>';
    }

    salaCard.innerHTML = `
      <div class="sala-header">
        <div class="sala-number">SALA ${sala.id}</div>
      </div>
      <div class="sala-content-grid">
        <div class="sala-info-left">
          <h3>${sala.nombre}</h3>
          <p>${sala.descripcion || 'Sala disponible para reservar'}</p>
        </div>
        <div class="sala-info-right">
          ${featuresHtml}
        </div>
      </div>
      ${reservasHtml}
      <button class="btn-reservar">Reservar Ahora</button>
    `;
    // Asignar evento solo al botón
    salaCard.querySelector('.btn-reservar').onclick = (e) => {
      e.stopPropagation();
      abrirModalReserva(sala);
    };
    grid.appendChild(salaCard);
  });
}

// Mostrar historial de reservas con paginación
function mostrarHistorial(reservasFiltradas = null, pagina = 1) {
  const container = document.getElementById('historialContainer');
  const reservasAMostrar = reservasFiltradas || todasLasReservas;
  
  if (!reservasAMostrar || reservasAMostrar.length === 0) {
    container.innerHTML = `
      <div class="historial-empty">
        <p style="font-size: 16px; margin-bottom: 10px;">📅 No hay reservas registradas</p>
        <p style="font-size: 14px; color: var(--text-secondary);">Las reservas aparecerán aquí una vez sean creadas</p>
      </div>
    `;
    return;
  }

  // Ordenar reservas por fecha más reciente
  const reservasOrdenadas = [...reservasAMostrar].sort((a, b) => {
    return new Date(b.fecha_reserva) - new Date(a.fecha_reserva);
  });

  // Calcular paginación
  const totalReservas = reservasOrdenadas.length;
  reservasHistorialTotales = totalReservas;
  const totalPaginas = Math.ceil(totalReservas / limiteHistorial);
  paginaHistorial = Math.min(pagina, totalPaginas);
  
  const inicio = (paginaHistorial - 1) * limiteHistorial;
  const fin = inicio + limiteHistorial;
  const reservasPagina = reservasOrdenadas.slice(inicio, fin);

  let html = '';
  reservasPagina.forEach((reserva) => {
    const fecha = new Date(reserva.fecha_reserva).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const nombreSala = reserva.sala || 'Sala Desconocida';
    const estado = reserva.estado || 'activa';
    
    // Color de estado
    let badgeClass = 'badge-success';
    if (estado === 'cancelada') badgeClass = 'badge-danger';
    else if (estado === 'completada') badgeClass = 'badge-info';

    let equiposHtml = '';
    if (reserva.equipos && reserva.equipos.length > 0) {
      const nombresEquipos = reserva.equipos.map(eq => eq.nombre).join(', ');
      equiposHtml = `
        <div class="reserva-info-item">
          <span class="reserva-label">Equipos</span>
          <span class="reserva-value">${nombresEquipos}</span>
        </div>
      `;
    }

    html += `
      <div class="reserva-item">
        <div class="reserva-numero">Reserva #${reserva.id}</div>
        <div class="reserva-head">
          <span class="reserva-person">${reserva.nombre_persona}</span>
          <span class="badge ${badgeClass}" style="margin-left: auto;">${estado.charAt(0).toUpperCase() + estado.slice(1)}</span>
        </div>
        <div class="reserva-info">
          <div class="reserva-info-item">
            <span class="reserva-label">Sala</span>
            <span class="reserva-value">${nombreSala}</span>
          </div>
          <div class="reserva-info-item">
            <span class="reserva-label">Fecha</span>
            <span class="reserva-value">${fecha}</span>
          </div>
          <div class="reserva-info-item">
            <span class="reserva-label">Inicio</span>
            <span class="reserva-value">${reserva.hora_inicio}</span>
          </div>
          <div class="reserva-info-item">
            <span class="reserva-label">Fin</span>
            <span class="reserva-value">${reserva.hora_fin}</span>
          </div>
          ${equiposHtml}
          ${reserva.razon_cancelacion ? `<div class="reserva-info-item"><span class="reserva-label">Razón cancelación</span><span class="reserva-value">${reserva.razon_cancelacion}</span></div>` : ''}
        </div>
      </div>
    `;
  });

  // Agregar controles de paginación
  if (totalPaginas > 1) {
    html += `
      <div class="pagination-controls">
        <button class="page-btn" onclick="irAPaginaHistorial(1)" ${paginaHistorial === 1 ? 'disabled' : ''}>First</button>
        <button class="page-btn" onclick="irAPaginaHistorial(${paginaHistorial - 1})" ${paginaHistorial === 1 ? 'disabled' : ''}>← Anterior</button>
        <span class="page-info">Página ${paginaHistorial} de ${totalPaginas}</span>
        <button class="page-btn" onclick="irAPaginaHistorial(${paginaHistorial + 1})" ${paginaHistorial === totalPaginas ? 'disabled' : ''}>Siguiente →</button>
        <button class="page-btn" onclick="irAPaginaHistorial(${totalPaginas})" ${paginaHistorial === totalPaginas ? 'disabled' : ''}>Last</button>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Navegar a página del historial
function irAPaginaHistorial(pagina) {
  const busqueda = document.getElementById('historialBusqueda')?.value.toLowerCase().trim();
  
  if (busqueda) {
    const reservasFiltradas = todasLasReservas.filter(reserva => {
      const fecha = new Date(reserva.fecha_reserva).toLocaleDateString('es-ES');
      const nombreSala = reserva.sala || '';
      
      return (
        reserva.nombre_persona.toLowerCase().includes(busqueda) ||
        nombreSala.toLowerCase().includes(busqueda) ||
        fecha.toLowerCase().includes(busqueda) ||
        reserva.fecha_reserva.includes(busqueda)
      );
    });
    mostrarHistorial(reservasFiltradas, pagina);
  } else {
    mostrarHistorial(null, pagina);
  }
}

// Filtrar historial de reservas
function filtrarHistorial() {
  const busqueda = document.getElementById('historialBusqueda').value.toLowerCase().trim();
  
  if (!busqueda) {
    mostrarHistorial(null, 1);
    return;
  }
  
  const reservasFiltradas = todasLasReservas.filter(reserva => {
    const fecha = new Date(reserva.fecha_reserva).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const nombreSala = reserva.sala || '';
    
    return (
      reserva.nombre_persona.toLowerCase().includes(busqueda) ||
      nombreSala.toLowerCase().includes(busqueda) ||
      fecha.toLowerCase().includes(busqueda) ||
      reserva.fecha_reserva.includes(busqueda)
    );
  });
  
  mostrarHistorial(reservasFiltradas, 1);
}

// Abrir modal de reserva
async function abrirModalReserva(sala) {
  salaSeleccionada = sala;
  document.getElementById('salaReservarNombre').textContent = sala.nombre;
  
  // Limpiar formulario
  document.getElementById('formularioReserva').reset();
  equiposSeleccionados = [];
  // Establecer fecha mínima como hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fechaReserva').min = hoy;
  // Resetear selectores de hora
  document.getElementById('horaInicioH').value = '';
  document.getElementById('horaInicioM').value = '';
  document.getElementById('horaFinH').value = '';
  document.getElementById('horaFinM').value = '';
  document.getElementById('duracionReserva').textContent = '--';
  // Mostrar equipos disponibles (dinámico)
  mostrarEquiposEnModal();
  // Deshabilitar el botón confirmar hasta que fecha/hora sean válidas y sin conflicto
  const confirmBtn = document.getElementById('confirmReservaBtn');
  if (confirmBtn) confirmBtn.disabled = true;
  // Listeners para actualizar equipos según fecha/hora
  const fechaInput = document.getElementById('fechaReserva');
  const horaInicioH = document.getElementById('horaInicioH');
  const horaInicioM = document.getElementById('horaInicioM');
  const horaFinH = document.getElementById('horaFinH');
  const horaFinM = document.getElementById('horaFinM');
  [fechaInput, horaInicioH, horaInicioM, horaFinH, horaFinM].forEach(el => {
    el.onchange = actualizarEquiposDisponiblesDinamico;
  });
  // Mostrar modal
  document.getElementById('reservaModal').classList.add('active');
}

// Cerrar modal
function cerrarModal() {
  document.getElementById('reservaModal').classList.remove('active');
  salaSeleccionada = null;
}

// Cerrar modal al hacer click en el fondo
function cerrarModalAlHacerClick(e) {
  if (e.target.id === 'reservaModal') {
    cerrarModal();
  }
}

// Abrir historial modal
function abrirHistorial() {
  lazyLoadOffset = 0;
  lazyLoadActive = false;
  document.getElementById('historialModal').classList.add('active');
  setTimeout(() => {
    initLazyLoad();
  }, 100);
}

// Abrir historial filtrado por sala
function abrirHistorialSala(idSala) {
  const sala = salas.find(s => s.id === idSala);
  abrirHistorial();
  if (sala) {
    const input = document.getElementById('historialBusqueda');
    input.value = sala.nombre;
  }
  filtrarHistorial();
}

// Cerrar historial modal
function cerrarHistorial() {
  document.getElementById('historialModal').classList.remove('active');
}

// Cerrar historial modal al hacer click en el fondo
function cerrarHistorialAlHacerClick(e) {
  if (e.target.id === 'historialModal') {
    cerrarHistorial();
  }
}

// Llenar selectores de hora
function llenarSelectoresHora() {
  const horas = document.querySelectorAll('[id$="H"]');
  const minutos = document.querySelectorAll('[id$="M"]');
  
  horas.forEach(select => {
    for (let h = 6; h <= 18; h++) {
      const option = document.createElement('option');
      option.value = String(h).padStart(2, '0');
      const periodo = h < 12 ? 'AM' : 'PM';
      const hora12 = h > 12 ? h - 12 : (h === 0 ? 12 : h);
      option.textContent = `${hora12}:00 ${periodo}`;
      select.appendChild(option);
    }
  });
  
  minutos.forEach(select => {
    for (let m = 0; m < 60; m += 30) {
      const option = document.createElement('option');
      option.value = String(m).padStart(2, '0');
      option.textContent = `${String(m).padStart(2, '0')} min`;
      select.appendChild(option);
    }
  });
}

// Actualizar duración de la reserva
function actualizarDuracion() {
  const horaInicioH = document.getElementById('horaInicioH').value;
  const horaInicioM = document.getElementById('horaInicioM').value;
  const horaFinH = document.getElementById('horaFinH').value;
  const horaFinM = document.getElementById('horaFinM').value;
  
  if (!horaInicioH || !horaFinH) return;
  
  const inicio = parseInt(horaInicioH) * 60 + (parseInt(horaInicioM) || 0);
  const fin = parseInt(horaFinH) * 60 + (parseInt(horaFinM) || 0);
  
  if (fin > inicio) {
    const horas = Math.floor((fin - inicio) / 60);
    const minutos = (fin - inicio) % 60;
    
    let duracion = '';
    if (horas > 0) duracion += `${horas}h `;
    if (minutos > 0) duracion += `${minutos}min`;
    
    document.getElementById('duracionReserva').textContent = duracion || '--';
  } else {
    document.getElementById('duracionReserva').textContent = '--';
  }
  
  // Actualizar campos time ocultos
  document.getElementById('horaInicio').value = `${horaInicioH || '00'}:${horaInicioM || '00'}`;
  document.getElementById('horaFin').value = `${horaFinH || '00'}:${horaFinM || '00'}`;
}

// Mostrar equipos en el modal
function mostrarEquiposEnModal() {
  const container = document.getElementById('equiposContainer');
  // Mostrar placeholder hasta que seleccionen fecha y hora
  container.innerHTML = '';
  if (!equiposDisponibles || equiposDisponibles.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No hay equipos registrados</p>';
    return;
  }
  const placeholder = document.createElement('div');
  placeholder.id = 'equiposPlaceholder';
  placeholder.style.gridColumn = '1/-1';
  placeholder.style.color = 'var(--text-secondary)';
  placeholder.textContent = 'Selecciona fecha y hora para ver los equipos disponibles.';
  container.appendChild(placeholder);
}

// Actualiza la disponibilidad de equipos dinámicamente según fecha/hora
function actualizarEquiposDisponiblesDinamico() {
  const fecha = document.getElementById('fechaReserva').value;
  const horaInicioH = document.getElementById('horaInicioH').value;
  const horaInicioM = document.getElementById('horaInicioM').value;
  const horaFinH = document.getElementById('horaFinH').value;
  const horaFinM = document.getElementById('horaFinM').value;
  const confirmBtn = document.getElementById('confirmReservaBtn');

  // Si falta info, mostrar placeholder y deshabilitar confirm
  if (!fecha || !horaInicioH || !horaFinH) {
    const container = document.getElementById('equiposContainer');
    const placeholder = document.getElementById('equiposPlaceholder');
    if (!placeholder) {
      container.innerHTML = '';
      const ph = document.createElement('div');
      ph.id = 'equiposPlaceholder';
      ph.style.gridColumn = '1/-1';
      ph.style.color = 'var(--text-secondary)';
      ph.textContent = 'Selecciona fecha y hora para ver los equipos disponibles.';
      container.appendChild(ph);
    }
    // limpiar mensaje de conflicto
    const conflictEl = document.getElementById('conflictMessage');
    if (conflictEl) { conflictEl.style.display = 'none'; conflictEl.textContent = ''; }
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  const horaInicio = `${horaInicioH}:${horaInicioM || '00'}`;
  const horaFin = `${horaFinH}:${horaFinM || '00'}`;

  // Verificar conflicto de la sala
  const conflictoSala = todasLasReservas.find(r => {
    try {
      if (r.id_sala != salaSeleccionada.id) return false;
      const fechaR = (r.fecha_reserva || '').toString().split('T')[0];
      if (fechaR !== fecha) return false;
      return !(horaFin <= r.hora_inicio || horaInicio >= r.hora_fin);
    } catch (e) { return false; }
  });

  const conflictEl = document.getElementById('conflictMessage');
  if (conflictoSala) {
    if (conflictEl) {
      conflictEl.style.display = 'block';
      conflictEl.textContent = `Sala ocupada por ${conflictoSala.nombre_persona} — ${conflictoSala.hora_inicio} - ${conflictoSala.hora_fin}`;
    }
    if (confirmBtn) confirmBtn.disabled = true;
  } else {
    if (conflictEl) { conflictEl.style.display = 'none'; conflictEl.textContent = ''; }
    // Solo habilitar más adelante si no hay conflictos y horas válidas
  }

  // Construir lista de equipos y marcar su disponibilidad
  const container = document.getElementById('equiposContainer');
  container.innerHTML = '';
  if (!equiposDisponibles || equiposDisponibles.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); font-size: 14px;">No hay equipos registrados</p>';
    if (confirmBtn && !conflictoSala) confirmBtn.disabled = false;
    return;
  }

  equiposDisponibles.forEach(equipo => {
    const label = document.createElement('label');
    label.className = 'equipo-checkbox';
    label.innerHTML = `
      <input type="checkbox" id="equipo-${equipo.id}" value="${equipo.id}" onchange="actualizarEquiposSeleccionados()">
      <div class="equipo-info">
        <span class="equipo-nombre">${equipo.nombre}</span>
        <span class="equipo-desc">${equipo.descripcion || 'Equipo disponible'}</span>
        <span class="equipo-disponible">📦 ${equipo.disponible}/${equipo.cantidad} disponibles</span>
      </div>
    `;

    // Determinar si el equipo está ocupado en ese rango
    const ocupado = todasLasReservas.some(r => {
      if (!r.equipos) return false;
      const fechaR = (r.fecha_reserva || '').toString().split('T')[0];
      if (fechaR !== fecha) return false;
      if (!(horaFin <= r.hora_inicio || horaInicio >= r.hora_fin)) {
        return r.equipos.some(eq => eq.id === equipo.id || eq.id == equipo.id);
      }
      return false;
    });

    container.appendChild(label);
    const input = label.querySelector('input');
    const disponibleEl = label.querySelector('.equipo-disponible');
    if (ocupado) {
      label.classList.add('no-disponible');
      input.disabled = true;
      if (disponibleEl && !disponibleEl.textContent.includes('No disponible')) disponibleEl.textContent += ' (No disponible)';
      input.checked = false;
    } else {
      label.classList.remove('no-disponible');
      input.disabled = false;
      if (disponibleEl) disponibleEl.textContent = disponibleEl.textContent.replace(' (No disponible)', '');
    }
  });

  // Habilitar botón confirmar si no hay conflicto de sala
  if (confirmBtn && !conflictoSala) {
    // adicional: validar que horaFin > horaInicio
    confirmBtn.disabled = !(horaFin > horaInicio);
  }

}

// Actualizar equipos seleccionados
function actualizarEquiposSeleccionados() {
  equiposSeleccionados = [];
  document.querySelectorAll('.equipo-checkbox input:checked').forEach(checkbox => {
    const equipo = equiposDisponibles.find(e => e.id == checkbox.value);
    if (equipo) {
      equiposSeleccionados.push(equipo);
    }
  });
}

// Crear reserva
async function crearReserva(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombrePersona').value.trim();
  const email = document.getElementById('emailPersona').value.trim();
  const telefono = document.getElementById('telefonoPersona').value.trim();
  const fecha = document.getElementById('fechaReserva').value;
  const horaInicio = document.getElementById('horaInicio').value;
  const horaFin = document.getElementById('horaFin').value;

  // Validaciones
  if (!nombre) {
    mostrarAlerta('Por favor ingresa tu nombre', 'warning');
    return;
  }

  if (!fecha) {
    mostrarAlerta('Por favor selecciona una fecha', 'warning');
    return;
  }

  if (!horaInicio || !horaFin) {
    mostrarAlerta('Por favor selecciona las horas de inicio y finalización', 'warning');
    return;
  }

  // Validar que hora fin sea posterior a hora inicio
  if (horaFin <= horaInicio) {
    mostrarAlerta('La hora de finalización debe ser posterior a la de inicio', 'warning');
    return;
  }

  // Validar conflictos localmente
  const conflicto = todasLasReservas.find(r => {
    if (r.id_sala !== salaSeleccionada.id) return false;
    if (r.fecha_reserva !== fecha) return false;
    
    return !(horaFin <= r.hora_inicio || horaInicio >= r.hora_fin);
  });

  if (conflicto) {
    mostrarAlertaConflicto(conflicto, salaSeleccionada.nombre);
    return;
  }

  // Validar conflictos de equipos
  if (equiposSeleccionados.length > 0) {
    for (const equipo of equiposSeleccionados) {
      const equipoEnUso = todasLasReservas.find(r => {
        if (r.fecha_reserva !== fecha) return false;
        if (!(horaFin <= r.hora_inicio || horaInicio >= r.hora_fin)) {
          // Hay overlap de tiempo, verificar si usa el mismo equipo
          // Aquí necesitarías verificar en la BD si esta reserva tiene el equipo
          // Por ahora lo validamos en el backend
          return false;
        }
        return false;
      });
    }
  }

  // Mostrar spinner de carga
  const btn = document.querySelector('#formularioReserva [type="submit"]');
  const btnTextoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Procesando...';

  try {
    const response = await fetch(`${API_BASE}/reservas/crear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nombre_persona: nombre,
        email: email,
        telefono: telefono,
        id_sala: salaSeleccionada.id,
        fecha_reserva: fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        equipos: equiposSeleccionados.map(e => e.id),
        notas: document.getElementById('notasReserva').value
      })
    });

    const data = await response.json();

    if (response.ok) {
      const equiposTexto = equiposSeleccionados.length > 0 ? ` + ${equiposSeleccionados.length} equipo(s)` : '';
      mostrarPopup(`✓ Reserva creada exitosamente. Número: ${data.numero_reserva}${equiposTexto}`, 'success');
      
      // Recargar datos inmediatamente
      await cargarHistorial();
      await cargarSalas();
      await cargarEquipos();
      cerrarModal();
      cerrarHistorial();
    } else {
      mostrarPopup(data.error || 'Error al crear la reserva', 'danger');
      cerrarModal();
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarPopup('Error de conexión. Verifica que el servidor esté activo.', 'danger');
    cerrarModal();
  } finally {
    btn.disabled = false;
    btn.textContent = btnTextoOriginal;
  }
}

// Mostrar alerta de conflicto con detalles
function mostrarAlertaConflicto(conflicto, nombreSala) {
  const detalle = `Sala ${nombreSala} ocupada por ${conflicto.nombre_persona}. Horario: ${conflicto.hora_inicio} - ${conflicto.hora_fin}`;
  mostrarPopup(detalle, 'warning');
}

// Popup modal rápido
let popupTimeout;
function mostrarPopup(mensaje, tipo = 'info') {
  let backdrop = document.getElementById('popupBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'popupBackdrop';
    backdrop.className = 'popup-backdrop';
    backdrop.innerHTML = `
      <div class="popup" id="popupDialog">
        <div class="popup-icon" id="popupIcon">ℹ</div>
        <div class="popup-message" id="popupMessage"></div>
        <button class="btn btn-primary" id="popupCloseBtn">Cerrar</button>
      </div>
    `;
    document.body.appendChild(backdrop);
    document.getElementById('popupCloseBtn').addEventListener('click', cerrarPopup);
    backdrop.addEventListener('click', (e) => {
      if (e.target.id === 'popupBackdrop') cerrarPopup();
    });
  }

  const dialog = document.getElementById('popupDialog');
  const icon = document.getElementById('popupIcon');
  const messageEl = document.getElementById('popupMessage');

  const iconos = { success: '✓', danger: '✗', warning: '⚠', info: 'ℹ' };
  icon.textContent = iconos[tipo] || 'ℹ';
  dialog.className = `popup popup-${tipo}`;
  messageEl.textContent = mensaje;

  backdrop.classList.add('show');

  // Cerrar modales para volver al menú principal
  cerrarModal();
  cerrarHistorial();

  clearTimeout(popupTimeout);
  popupTimeout = setTimeout(() => cerrarPopup(), 2600);
}

function cerrarPopup() {
  const backdrop = document.getElementById('popupBackdrop');
  if (backdrop) {
    backdrop.classList.remove('show');
  }
}

// Mostrar alerta
function mostrarAlerta(mensaje, tipo = 'info') {
  const alertasContainer = document.getElementById('alertas');
  
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo}`;
  
  let icono = 'ℹ';
  if (tipo === 'success') icono = '✓';
  if (tipo === 'danger') icono = '✗';
  if (tipo === 'warning') icono = '⚠';
  
  alerta.innerHTML = `
    <div class="alert-icon">${icono}</div>
    <div class="alert-content">
      <div style="font-size: 14px;">${mensaje}</div>
    </div>
  `;

  alertasContainer.appendChild(alerta);

  // Auto-eliminar alerta después de 5 segundos
  setTimeout(() => {
    alerta.style.opacity = '0';
    alerta.style.transition = 'opacity 0.3s ease';
    setTimeout(() => alerta.remove(), 300);
  }, 5000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializar);
