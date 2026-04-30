/**
 * Sistema de diálogos de confirmación
 */

let confirmCallback = null;

function mostrarConfirm(titulo, mensaje, callback, labelBoton = 'Confirmar') {
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmTitle');
  const messageEl = document.getElementById('confirmMessage');
  const btnEl = document.getElementById('confirmBtn');

  titleEl.textContent = titulo;
  messageEl.textContent = mensaje;
  btnEl.textContent = labelBoton;
  confirmCallback = callback;

  modal.classList.add('active');
}

function cerrarConfirm() {
  const modal = document.getElementById('confirmModal');
  modal.classList.remove('active');
  confirmCallback = null;
}

function ejecutarConfirm() {
  if (confirmCallback && typeof confirmCallback === 'function') {
    confirmCallback();
  }
  cerrarConfirm();
}

// Listener para el botón confirmar
document.addEventListener('DOMContentLoaded', () => {
  const confirmBtn = document.getElementById('confirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', ejecutarConfirm);
  }
  
  const confirmModal = document.getElementById('confirmModal');
  if (confirmModal) {
    confirmModal.addEventListener('click', (e) => {
      if (e.target.id === 'confirmModal') {
        cerrarConfirm();
      }
    });
  }
});

// Función para eliminar con confirmación
function confirmarEliminar(titulo, mensaje, onConfirm) {
  mostrarConfirm(titulo, mensaje, onConfirm, 'Eliminar');
}

// Función para cancelar con confirmación
function confirmarCancelar(titulo, mensaje, onConfirm) {
  mostrarConfirm(titulo, mensaje, onConfirm, 'Cancelar');
}
