const { pool } = require('../config/database');

async function getAll() {
  const [rows] = await pool.query(
    'SELECT id, email, nombre, activo, created_at, updated_at FROM admin_notification_emails ORDER BY id'
  );
  return rows;
}

async function getActive() {
  const [rows] = await pool.query(
    'SELECT email FROM admin_notification_emails WHERE activo = TRUE ORDER BY id'
  );
  return rows.map(r => r.email);
}

async function create(email, nombre) {
  const [result] = await pool.query(
    'INSERT INTO admin_notification_emails (email, nombre) VALUES (?, ?)',
    [email, nombre || null]
  );
  return result.insertId;
}

async function update(id, email, nombre, activo) {
  const [result] = await pool.query(
    'UPDATE admin_notification_emails SET email = ?, nombre = ?, activo = ? WHERE id = ?',
    [email, nombre || null, activo, id]
  );
  return result.affectedRows > 0;
}

async function deleteById(id) {
  const [result] = await pool.query(
    'DELETE FROM admin_notification_emails WHERE id = ?',
    [id]
  );
  return result.affectedRows > 0;
}

async function getSmtpConfig() {
  const [rows] = await pool.query(
    'SELECT mail_user, mail_pass, admin_email FROM email_smtp_config LIMIT 1'
  );
  return rows[0] || null;
}

async function updateSmtpConfig(mailUser, mailPass, adminEmail) {
  const [existing] = await pool.query('SELECT id FROM email_smtp_config LIMIT 1');
  if (existing.length > 0) {
    await pool.query(
      'UPDATE email_smtp_config SET mail_user = ?, mail_pass = ?, admin_email = ? WHERE id = ?',
      [mailUser, mailPass, adminEmail, existing[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO email_smtp_config (mail_user, mail_pass, admin_email) VALUES (?, ?, ?)',
      [mailUser, mailPass, adminEmail]
    );
  }
}

module.exports = { getAll, getActive, create, update, delete: deleteById, getSmtpConfig, updateSmtpConfig };
