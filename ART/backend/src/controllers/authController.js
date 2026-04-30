const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { pool } = require('../config/database');
const config = require('../../config.json');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin_users WHERE username = ? AND activo = TRUE',
      [username]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiresIn }
    );

    res.json({ token, username: user.username });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function cambiarPassword(req, res) {
  const { passwordActual, passwordNuevo } = req.body;

  if (!passwordActual || !passwordNuevo) {
    return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
  }

  if (passwordNuevo.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM admin_users WHERE id = ? AND activo = TRUE',
      [req.admin.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = rows[0];
    const passwordValid = await bcrypt.compare(passwordActual, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const nuevoHash = await bcrypt.hash(passwordNuevo, 10);
    await pool.query(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [nuevoHash, req.admin.id]
    );

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    console.error('Error al cambiar contraseña:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function solicitarResetPassword(req, res) {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Usuario es requerido' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id, username FROM admin_users WHERE username = ? AND activo = TRUE',
      [username]
    );

    if (rows.length === 0) {
      // Por seguridad, no revelamos si el usuario existe o no
      return res.json({ message: 'Si el usuario existe, se ha enviado un enlace de restablecimiento' });
    }

    const user = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hora

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // Enviar email (aquí necesitarías implementar el envío)
    const resetLink = `${config.app.baseUrl}/admin/reset-password?token=${token}`;
    const emailService = require('../utils/emailService');
    await emailService.enviarEmailReset(user.username, resetLink);

    res.json({ message: 'Se ha enviado un enlace de restablecimiento a tu email' });
  } catch (err) {
    console.error('Error al solicitar reset:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function resetPassword(req, res) {
  const { token, passwordNuevo } = req.body;

  if (!token || !passwordNuevo) {
    return res.status(400).json({ error: 'Token y nueva contraseña son requeridos' });
  }

  if (passwordNuevo.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT prt.*, au.username FROM password_reset_tokens prt JOIN admin_users au ON prt.user_id = au.id WHERE prt.token = ? AND prt.used = FALSE AND prt.expires_at > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }

    const resetToken = rows[0];
    const nuevoHash = await bcrypt.hash(passwordNuevo, 10);

    await pool.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [nuevoHash, resetToken.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = ?', [resetToken.id]);

    res.json({ message: 'Contraseña restablecida exitosamente' });
  } catch (err) {
    console.error('Error al resetear contraseña:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { login, cambiarPassword, solicitarResetPassword, resetPassword };
