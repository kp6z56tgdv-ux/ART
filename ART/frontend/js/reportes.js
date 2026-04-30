/**
 * Módulo de Reportes y Estadísticas
 */

let reportesData = null;
let chartEstadoInstance = null;
let chartDiasInstance = null;
let chartEquiposInstance = null;

// Agregar Chart.js desde CDN
function cargarChartLibrary() {
  if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    script.async = true;
    script.onload = () => {
      console.log('Chart.js cargado exitosamente');
    };
    document.head.appendChild(script);
  }
}

// Cargar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', cargarChartLibrary);

async function abrirModalReportes() {
  // Obtener datos de reservas
  const reservas = window.todasLasReservas || [];
  
  // Crear modal de reportes
  let modal = document.getElementById('reportesModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'reportesModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 1100px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h2>📊 Reportes y Estadísticas</h2>
          <button class="close-btn" onclick="cerrarReportes()">&times;</button>
        </div>
        
        <div style="padding: 20px;">
          <!-- Tabs de reportes -->
          <div class="tabs" style="margin-bottom: 30px;">
            <button class="tab-btn active" onclick="cambiarTabReportes('general')">General</button>
            <button class="tab-btn" onclick="cambiarTabReportes('salas')">Por Salas</button>
            <button class="tab-btn" onclick="cambiarTabReportes('estadisticas')">Estadísticas</button>
          </div>

          <!-- TAB: REPORTES GENERALES -->
          <div id="reports-general" class="tab-content active" style="display: block;">
            <div style="background: var(--white); padding: 25px; border-radius: 12px; border: 1px solid var(--border);">
              <h3 style="color: var(--primary); margin-bottom: 20px;">📈 Resumen General</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px;">
                <div style="background: var(--primary-lighter); padding: 20px; border-radius: 10px; text-align: center;">
                  <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Total de Reservas</p>
                  <p id="totalReservas" style="color: var(--primary); font-size: 32px; font-weight: 800; margin: 10px 0;">--</p>
                </div>
                <div style="background: #d4edda; padding: 20px; border-radius: 10px; text-align: center;">
                  <p style="color: #155724; font-size: 13px; margin: 0;">Activas</p>
                  <p id="reservasActivas" style="color: #155724; font-size: 32px; font-weight: 800; margin: 10px 0;">--</p>
                </div>
                <div style="background: #f8d7da; padding: 20px; border-radius: 10px; text-align: center;">
                  <p style="color: #721c24; font-size: 13px; margin: 0;">Canceladas</p>
                  <p id="reservasCanceladas" style="color: #721c24; font-size: 32px; font-weight: 800; margin: 10px 0;">--</p>
                </div>
                <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; text-align: center;">
                  <p style="color: #0c5460; font-size: 13px; margin: 0;">Completadas</p>
                  <p id="reservasCompletadas" style="color: #0c5460; font-size: 32px; font-weight: 800; margin: 10px 0;">--</p>
                </div>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                <h4 style="color: var(--primary); margin-top: 0;">Reservas por Estado</h4>
                <canvas id="chartEstado" style="max-height: 300px;"></canvas>
              </div>
            </div>
          </div>

          <!-- TAB: REPORTES POR SALAS -->
          <div id="reports-salas" class="tab-content" style="display: none;">
            <div style="background: var(--white); padding: 25px; border-radius: 12px; border: 1px solid var(--border);">
              <h3 style="color: var(--primary); margin-bottom: 20px;">🏢 Uso por Sala</h3>
              
              <div id="reportesSalasContainer">
                <!-- Se llenará con JavaScript -->
              </div>
            </div>
          </div>

          <!-- TAB: ESTADÍSTICAS -->
          <div id="reports-estadisticas" class="tab-content" style="display: none;">
            <div style="background: var(--white); padding: 25px; border-radius: 12px; border: 1px solid var(--border);">
              <h3 style="color: var(--primary); margin-bottom: 20px;">📉 Estadísticas Detalladas</h3>
              <canvas id="chartReservasPorDia" style="max-height: 300px; margin-bottom: 30px;"></canvas>
              <canvas id="chartEquiposMasUsados" style="max-height: 300px;"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.add('active');
  
  // Cargar datos
  await cargarDatosReportes();
}

function cerrarReportes() {
  const modal = document.getElementById('reportesModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function cambiarTabReportes(tab) {
  // Remover active de todos
  document.querySelectorAll('#reportesModal .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelectorAll('#reportesModal .tab-content').forEach(content => {
    content.style.display = 'none';
  });

  // Activar el seleccionado
  event.target.classList.add('active');
  document.getElementById(`reports-${tab}`).style.display = 'block';
  
  // Renderizar gráficos si es necesario
  setTimeout(() => {
    if (tab === 'general') renderizarChartEstado();
    else if (tab === 'salas') renderizarReportesSalas();
    else if (tab === 'estadisticas') {
      renderizarChartReservasPorDia();
      renderizarChartEquiposMasUsados();
    }
  }, 100);
}

async function cargarDatosReportes() {
  try {
    const reservas = window.todasLasReservas || [];
    
    // Calcular estadísticas
    const total = reservas.length;
    const activas = reservas.filter(r => r.estado === 'activa').length;
    const canceladas = reservas.filter(r => r.estado === 'cancelada').length;
    const completadas = reservas.filter(r => r.estado === 'completada').length;

    // Actualizar números
    document.getElementById('totalReservas').textContent = total;
    document.getElementById('reservasActivas').textContent = activas;
    document.getElementById('reservasCanceladas').textContent = canceladas;
    document.getElementById('reservasCompletadas').textContent = completadas;

    // Renderizar gráfico de estado
    setTimeout(() => renderizarChartEstado(), 100);
  } catch (error) {
    console.error('Error al cargar reportes:', error);
  }
}

function renderizarChartEstado() {
  if (typeof Chart === 'undefined') return;

  const ctx = document.getElementById('chartEstado')?.getContext('2d');
  if (!ctx) return;

  const reservas = window.todasLasReservas || [];
  const estados = {
    'activa': reservas.filter(r => r.estado === 'activa').length,
    'cancelada': reservas.filter(r => r.estado === 'cancelada').length,
    'completada': reservas.filter(r => r.estado === 'completada').length
  };

  // Destruir gráfico existente
  if (chartEstadoInstance) {
    chartEstadoInstance.destroy();
  }

  chartEstadoInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Activas', 'Canceladas', 'Completadas'],
      datasets: [{
        data: [estados.activa, estados.cancelada, estados.completada],
        backgroundColor: [
          '#27ae60',
          '#e74c3c',
          '#3498db'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function renderizarReportesSalas() {
  const container = document.getElementById('reportesSalasContainer');
  container.innerHTML = '';

  const reservas = window.todasLasReservas || [];
  const salas = window.todasLasSalas || [];

  // Agrupar reservas por sala
  const reporteSalas = {};
  
  salas.forEach(sala => {
    reporteSalas[sala.nombre] = {
      total: 0,
      activas: 0,
      completadas: 0,
      canceladas: 0
    };
  });

  reservas.forEach(reserva => {
    const sala = reserva.sala || 'Sin sala';
    if (!reporteSalas[sala]) {
      reporteSalas[sala] = {
        total: 0,
        activas: 0,
        completadas: 0,
        canceladas: 0
      };
    }
    
    reporteSalas[sala].total++;
    if (reserva.estado === 'activa') reporteSalas[sala].activas++;
    else if (reserva.estado === 'completada') reporteSalas[sala].completadas++;
    else if (reserva.estado === 'cancelada') reporteSalas[sala].canceladas++;
  });

  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">';
  
  for (const [sala, stats] of Object.entries(reporteSalas)) {
    const porcentajeUso = stats.total > 0 ? ((stats.completadas / stats.total) * 100).toFixed(1) : 0;
    
    html += `
      <div style="background: var(--white); border: 1px solid var(--border); padding: 18px; border-radius: 10px;">
        <h4 style="color: var(--primary); margin-top: 0; border-bottom: 2px solid var(--primary-lighter); padding-bottom: 10px;">${sala}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div>
            <span style="color: var(--text-secondary); font-size: 12px;">Total</span>
            <p style="color: var(--primary); font-size: 24px; font-weight: 700; margin: 5px 0;">${stats.total}</p>
          </div>
          <div>
            <span style="color: var(--text-secondary); font-size: 12px;">Uso Completado</span>
            <p style="color: #27ae60; font-size: 24px; font-weight: 700; margin: 5px 0;">${porcentajeUso}%</p>
          </div>
        </div>
        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; font-size: 13px;">
          <div>✓ Activas: <strong>${stats.activas}</strong></div>
          <div>✔ Completadas: <strong>${stats.completadas}</strong></div>
          <div>✗ Canceladas: <strong>${stats.canceladas}</strong></div>
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  container.innerHTML = html;
}

function renderizarChartReservasPorDia() {
  if (typeof Chart === 'undefined') return;

  const ctx = document.getElementById('chartReservasPorDia')?.getContext('2d');
  if (!ctx) return;

  const reservas = window.todasLasReservas || [];

  // Agrupar por fecha
  const reservasPorDia = {};
  reservas.forEach(reserva => {
    const fecha = reserva.fecha_reserva;
    if (!reservasPorDia[fecha]) {
      reservasPorDia[fecha] = 0;
    }
    reservasPorDia[fecha]++;
  });

  const fechas = Object.keys(reservasPorDia).sort();
  const cantidades = fechas.map(f => reservasPorDia[f]);

  // Destruir gráfico existente
  if (chartDiasInstance) {
    chartDiasInstance.destroy();
  }

  chartDiasInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: fechas.slice(-30), // Últimos 30 días
      datasets: [{
        label: 'Reservas por Día',
        data: cantidades.slice(-30),
        borderColor: '#2c5aa0',
        backgroundColor: 'rgba(44, 90, 160, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderizarChartEquiposMasUsados() {
  if (typeof Chart === 'undefined') return;

  const ctx = document.getElementById('chartEquiposMasUsados')?.getContext('2d');
  if (!ctx) return;

  const reservas = window.todasLasReservas || [];

  // Contar uso de equipos
  const equiposUsados = {};
  reservas.forEach(reserva => {
    if (reserva.equipos && Array.isArray(reserva.equipos)) {
      reserva.equipos.forEach(equipo => {
        const nombre = equipo.nombre || 'Desconocido';
        equiposUsados[nombre] = (equiposUsados[nombre] || 0) + 1;
      });
    }
  });

  const equipos = Object.keys(equiposUsados).sort((a, b) => equiposUsados[b] - equiposUsados[a]);
  const usos = equipos.map(e => equiposUsados[e]);

  // Destruir gráfico existente
  if (chartEquiposInstance) {
    chartEquiposInstance.destroy();
  }

  chartEquiposInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: equipos,
      datasets: [{
        label: 'Veces Utilizados',
        data: usos,
        backgroundColor: '#b08a5b',
        borderColor: '#8a6b45',
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  });
}
