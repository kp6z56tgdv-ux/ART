// Redirigir si ya tiene sesión activa
if (localStorage.getItem('adminToken')) {
  window.location.replace('/admin');
}

async function handleLogin(e) {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('loginError');

  errorDiv.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Verificando...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('adminUsername', data.username);
      window.location.replace('/admin');
    } else {
      errorDiv.textContent = data.error || 'Credenciales inválidas';
      errorDiv.style.display = 'block';
      document.getElementById('password').value = '';
    }
  } catch {
    errorDiv.textContent = 'Error de conexión. Intenta nuevamente.';
    errorDiv.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Iniciar Sesión';
  }
}

function abrirModalReset() {
  document.getElementById('formReset').reset();
  document.getElementById('resetAlerta').style.display = 'none';
  document.getElementById('modalReset').style.display = 'flex';
}

function cerrarModalReset() {
  document.getElementById('modalReset').style.display = 'none';
}

async function solicitarReset(e) {
  e.preventDefault();

  const username = document.getElementById('resetUsername').value.trim();
  const alerta = document.getElementById('resetAlerta');

  alerta.style.display = 'none';

  if (!username) {
    alerta.className = 'alert alert-danger';
    alerta.textContent = 'Ingresa tu usuario';
    alerta.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await res.json();

    if (res.ok) {
      alerta.className = 'alert alert-success';
      alerta.textContent = 'Se ha enviado un enlace de restablecimiento a tu email';
      alerta.style.display = 'block';
      document.getElementById('formReset').reset();
    } else {
      alerta.className = 'alert alert-danger';
      alerta.textContent = data.error || 'Error al solicitar restablecimiento';
      alerta.style.display = 'block';
    }
  } catch {
    alerta.className = 'alert alert-danger';
    alerta.textContent = 'Error de conexión';
    alerta.style.display = 'block';
  }
}
