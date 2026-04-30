const { pool } = require('../config/database');

class EquipoModel {
  // Obtener todos los equipos
  static async getAllEquipos() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT 
          e.id,
          e.nombre,
          e.descripcion,
          e.cantidad,
          GREATEST(e.cantidad - COALESCE(reservados.en_uso, 0), 0) AS disponible
        FROM equipo e
        LEFT JOIN (
          SELECT 
            p.id_equipo,
            COUNT(*) AS en_uso
          FROM prestamo p
          INNER JOIN reserva r ON p.id_reserva = r.id
          WHERE r.estado = 'activa' AND p.estado = 'prestado'
          GROUP BY p.id_equipo
        ) reservados ON reservados.id_equipo = e.id
        ORDER BY e.id
      `);
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener equipo por ID
  static async getEquipoById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT 
          e.id,
          e.nombre,
          e.descripcion,
          e.cantidad,
          GREATEST(e.cantidad - COALESCE(reservados.en_uso, 0), 0) AS disponible
        FROM equipo e
        LEFT JOIN (
          SELECT 
            p.id_equipo,
            COUNT(*) AS en_uso
          FROM prestamo p
          INNER JOIN reserva r ON p.id_reserva = r.id
          WHERE r.estado = 'activa' AND p.estado = 'prestado'
          GROUP BY p.id_equipo
        ) reservados ON reservados.id_equipo = e.id
        WHERE e.id = ?
      `, [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  // Crear equipo
  static async createEquipo(data) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO equipo (nombre, descripcion, cantidad, disponible) VALUES (?, ?, ?, ?)',
        [data.nombre, data.descripcion || '', data.cantidad || 1, data.disponible || data.cantidad || 1]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  // Actualizar equipo
  static async updateEquipo(id, data) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE equipo SET nombre = ?, descripcion = ?, cantidad = ?, disponible = ? WHERE id = ?',
        [data.nombre, data.descripcion || '', data.cantidad || 1, data.disponible || data.cantidad || 1, id]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  // Eliminar equipo
  static async deleteEquipo(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM equipo WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }

  // Actualizar disponibilidad
  static async updateDisponible(id, cantidad) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE equipo SET disponible = ? WHERE id = ?',
        [cantidad, id]
      );
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = EquipoModel;
