/**
 * Sistema de Lazy Loading para el historial
 */

let lazyLoadActive = false;
let lazyLoadOffset = 0;
const lazyLoadLimit = 20;

function initLazyLoad() {
  const container = document.getElementById('historialContainer');
  
  if (!container) return;
  
  // Observer para detectar cuando el usuario scrollea hacia el final
  const observerOptions = {
    root: container,
    rootMargin: '50px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !lazyLoadActive) {
        cargarMasReservas();
      }
    });
  }, observerOptions);

  // Crear elemento sentinel al final
  const sentinel = document.createElement('div');
  sentinel.id = 'lazyLoadSentinel';
  sentinel.style.height = '50px';
  
  observer.observe(sentinel);
}

async function cargarMasReservas() {
  if (lazyLoadActive) return;
  
  lazyLoadActive = true;
  const container = document.getElementById('historialContainer');
  
  // Mostrar spinner de carga
  const spinner = document.createElement('div');
  spinner.className = 'lazy-load-spinner';
  spinner.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Cargando más reservas...</p>';
  container.appendChild(spinner);

  try {
    const pagina = Math.floor(lazyLoadOffset / lazyLoadLimit) + 1;
    
    const response = await fetch(`${API_BASE}/reservas/buscar?pagina=${pagina}&limite=${lazyLoadLimit}`);
    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      // Agregar nuevas reservas
      result.data.forEach(reserva => {
        if (!todasLasReservas.find(r => r.id === reserva.id)) {
          todasLasReservas.push(reserva);
        }
      });

      lazyLoadOffset += lazyLoadLimit;
      
      // Remover el spinner anterior
      const spinnerOld = container.querySelector('.lazy-load-spinner');
      if (spinnerOld) spinnerOld.remove();
      
      // Re-renderizar historial
      mostrarHistorial();
    } else {
      // No hay más reservas
      const spinnerOld = container.querySelector('.lazy-load-spinner');
      if (spinnerOld) {
        spinnerOld.innerHTML = '<p style="text-align: center; color: var(--text-secondary); margin-top: 20px;">Sin más reservas para cargar</p>';
      }
    }
  } catch (error) {
    console.error('Error en lazy load:', error);
    const spinnerOld = container.querySelector('.lazy-load-spinner');
    if (spinnerOld) {
      spinnerOld.innerHTML = '<p style="text-align: center; color: var(--danger);">Error al cargar más reservas</p>';
    }
  } finally {
    lazyLoadActive = false;
  }
}

// Estilos para el lazy loading
const lazylLoadStyles = `
.lazy-load-spinner {
  padding: 20px;
  text-align: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

// Inyectar estilos
if (document.head) {
  const style = document.createElement('style');
  style.textContent = lazylLoadStyles;
  document.head.appendChild(style);
}
