const { pool } = require('../config/database');

class NombreModel {
  // Obtener todas las personas
  static async getAllPersonas() {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM nombre ORDER BY id');
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener persona por ID
  static async getPersonaById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query('SELECT * FROM nombre WHERE id = ?', [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }

  // Crear persona
  static async createPersona(data) {
    const connection = await pool.getConnection();
    try {
      const [result] = await connection.query(
        'INSERT INTO nombre (nombre_persona, email, telefono) VALUES (?, ?, ?)',
        [data.nombre_persona, data.email || '', data.telefono || '']
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  // Actualizar persona
  static async updatePersona(id, data) {
    const connection = await pool.getConnection();
    try {
      await connection.query(
        'UPDATE nombre SET nombre_persona = ?, email = ?, telefono = ? WHERE id = ?',
        [data.nombre_persona, data.email || '', data.telefono || '', id]
      );
      return true;
    } finally {
      connection.release();
    }
  }
}

module.exports = NombreModel;
