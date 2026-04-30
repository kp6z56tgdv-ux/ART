const bcrypt = require('bcryptjs');
const { pool } = require('./database');

async function createTables() {
  const connection = await pool.getConnection();

  try {
    // Tabla de Salas/Oficinas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sala (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        aire_acondicionado BOOLEAN DEFAULT FALSE,
        television BOOLEAN DEFAULT FALSE,
        capacidad INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_nombre (nombre),
        INDEX idx_deleted_at (deleted_at)
      )
    `);

    // Tabla de Nombres/Usuarios
    await connection.query(`
      CREATE TABLE IF NOT EXISTS nombre (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre_persona VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        telefono VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_nombre_persona (nombre_persona),
        INDEX idx_email (email),
        INDEX idx_deleted_at (deleted_at)
      )
    `);

    // Tabla de Fechas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS fecha (
        id INT PRIMARY KEY AUTO_INCREMENT,
        fecha_reserva DATE NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_fecha_reserva (fecha_reserva),
        INDEX idx_deleted_at (deleted_at)
      )
    `);

    // Tabla de Horas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS hora (
        id INT PRIMARY KEY AUTO_INCREMENT,
        hora_inicio TIME NOT NULL,
        hora_fin TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        UNIQUE KEY uk_hora (hora_inicio, hora_fin),
        INDEX idx_deleted_at (deleted_at)
      )
    `);

    // Tabla de Equipos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipo (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        cantidad INT DEFAULT 1,
        disponible INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_nombre (nombre),
        INDEX idx_deleted_at (deleted_at)
      )
    `);

    // Tabla de Reservas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reserva (
        id INT PRIMARY KEY AUTO_INCREMENT,
        numero_reserva VARCHAR(50) UNIQUE,
        id_nombre INT NOT NULL,
        id_sala INT NOT NULL,
        id_fecha INT NOT NULL,
        id_hora INT NOT NULL,
        estado ENUM('activa', 'cancelada', 'completada') DEFAULT 'activa',
        notas TEXT,
        razon_cancelacion VARCHAR(255),
        es_recurrente BOOLEAN DEFAULT FALSE,
        frecuencia_recurrencia ENUM('semanal', 'mensual') DEFAULT NULL,
        fecha_fin_recurrencia DATE DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (id_nombre) REFERENCES nombre(id),
        FOREIGN KEY (id_sala) REFERENCES sala(id),
        FOREIGN KEY (id_fecha) REFERENCES fecha(id),
        FOREIGN KEY (id_hora) REFERENCES hora(id),
        INDEX idx_numero_reserva (numero_reserva),
        INDEX idx_estado (estado),
        INDEX idx_id_sala_fecha (id_sala, id_fecha),
        INDEX idx_created_at (created_at),
        INDEX idx_deleted_at (deleted_at)
      )
    `);

    // Tabla de Préstamos
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prestamo (
        id INT PRIMARY KEY AUTO_INCREMENT,
        id_reserva INT NOT NULL,
        id_equipo INT NOT NULL,
        id_sala INT NOT NULL,
        id_nombre INT NOT NULL,
        cantidad_prestada INT DEFAULT 1,
        estado ENUM('prestado', 'devuelto') DEFAULT 'prestado',
        fecha_prestamo DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_devolucion DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        FOREIGN KEY (id_reserva) REFERENCES reserva(id),
        FOREIGN KEY (id_equipo) REFERENCES equipo(id),
        FOREIGN KEY (id_sala) REFERENCES sala(id),
        FOREIGN KEY (id_nombre) REFERENCES nombre(id),
        INDEX idx_id_reserva (id_reserva),
        INDEX idx_id_equipo (id_equipo),
        INDEX idx_estado (estado),
        INDEX idx_deleted_at (deleted_at)
      )
    `);

    // Tabla de administradores
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Tabla de tokens de reset de contraseña
    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
      )
    `);

    // Tabla de correos para notificaciones de reservas
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_notification_emails (
        id INT PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(150) NOT NULL UNIQUE,
        nombre VARCHAR(100),
        activo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Tabla de configuración SMTP (credenciales de envío)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_smtp_config (
        id INT PRIMARY KEY AUTO_INCREMENT,
        mail_user VARCHAR(150) NOT NULL,
        mail_pass VARCHAR(255) NOT NULL,
        admin_email VARCHAR(150) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Tablas creadas exitosamente');
  } catch (err) {
    console.error('Error al crear tablas:', err);
  } finally {
    connection.release();
  }
}

async function insertInitialData() {
  const connection = await pool.getConnection();

  try {
    // Insertar salas iniciales
    await connection.query(`
      INSERT IGNORE INTO sala (id, nombre, descripcion, aire_acondicionado, television)
      VALUES 
        (1, 'Sala 1', 'Sala con aire acondicionado y televisión', TRUE, TRUE),
        (2, 'Sala 2', 'Sala disponible para videobeam', FALSE, FALSE)
    `);

    // Insertar equipos iniciales
    await connection.query(`
      INSERT IGNORE INTO equipo (id, nombre, descripcion, cantidad, disponible)
      VALUES 
        (1, 'Videobeam', 'Proyector portátil', 1, 1),
        (2, 'Aire Acondicionado', 'Sistema de aire acondicionado Sala 1', 1, 0),
        (3, 'Televisión', 'TV LED 55 pulgadas Sala 1', 1, 0)
    `);

    // Insertar admin por defecto (usuario: admin, contraseña: admin123)
    const hash = await bcrypt.hash('admin123', 10);
    await connection.query(
      'INSERT IGNORE INTO admin_users (id, username, password_hash) VALUES (1, ?, ?)',
      ['admin', hash]
    );

    // Migrar correos de notificación y configuración SMTP desde config.json si las tablas están vacías
    try {
      const cfg = require('../../config.json');

      const [emailRows] = await connection.query('SELECT COUNT(*) as total FROM admin_notification_emails');
      if (emailRows[0].total === 0) {
        const destinatarios = cfg.email?.destinatarios || [];
        for (const correo of destinatarios) {
          await connection.query(
            'INSERT IGNORE INTO admin_notification_emails (email) VALUES (?)',
            [correo]
          );
        }
        if (destinatarios.length > 0) {
          console.log(`${destinatarios.length} correo(s) de notificación migrados desde config.json`);
        }
      }

      const [smtpRows] = await connection.query('SELECT COUNT(*) as total FROM email_smtp_config');
      if (smtpRows[0].total === 0 && cfg.email?.user && cfg.email?.pass) {
        await connection.query(
          'INSERT INTO email_smtp_config (mail_user, mail_pass, admin_email) VALUES (?, ?, ?)',
          [cfg.email.user, cfg.email.pass, cfg.email.adminEmail || cfg.email.user]
        );
        console.log('Configuración SMTP migrada desde config.json');
      }
    } catch (_) { /* config.json puede no tener sección email */ }

    console.log('Datos iniciales insertados');
  } catch (err) {
    if (err.code !== 'ER_DUP_ENTRY') {
      console.error('Error al insertar datos iniciales:', err);
    }
  } finally {
    connection.release();
  }
}

module.exports = { createTables, insertInitialData };
