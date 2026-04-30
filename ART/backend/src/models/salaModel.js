const { pool } = require('../config/database');

class SalaModel {
  // Obtener todas las salas
  static async getAllSalas() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM sala ORDER BY id');
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener sala por ID
  static async getSalaById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM sala WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  // Crear sala
  static async createSala(data) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO sala (nombre, descripcion, aire_acondicionado, television) VALUES (?, ?, ?, ?)',
        [data.nombre, data.descripcion || '', data.aire_acondicionado || false, data.television || false]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  // Actualizar sala
  static async updateSala(id, data) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE sala SET nombre = ?, descripcion = ?, aire_acondicionado = ?, television = ? WHERE id = ?',
        [data.nombre, data.descripcion || '', data.aire_acondicionado || false, data.television || false, id]
      );
      return true;
    } finally {
      connection.release();
    }
  }

  // Eliminar sala
  static async deleteSala(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('DELETE FROM sala WHERE id = ?', [id]);
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = SalaModel;
