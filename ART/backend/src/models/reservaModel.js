const { pool } = require('../config/database');

class ReservaModel {
  // Crear reserva
  static async createReserva(data) {
    const connection = await pool.getConnection();
    try {
      const numeroReserva = `RES-${Date.now()}`;
      
      const [result] = await connection.query(
        'INSERT INTO reserva (numero_reserva, id_nombre, id_sala, id_fecha, id_hora, notas) VALUES (?, ?, ?, ?, ?, ?)',
        [numeroReserva, data.id_nombre, data.id_sala, data.id_fecha, data.id_hora, data.notas || '']
      );

      return { id: result.insertId, numeroReserva };
    } finally {
      connection.release();
    }
  }

  // Actualizar automáticamente reservas pasadas a completadas
  static async actualizarReservasPasadas() {
    const connection = await pool.getConnection();
    try {
      const ahora = new Date();
      const fechaHoy = ahora.toISOString().split('T')[0];
      const horaActual = ahora.toTimeString().split(' ')[0].substring(0, 5);
      
      // Actualizar reservas de días anteriores
      await connection.query(`
        UPDATE reserva r
        JOIN fecha f ON r.id_fecha = f.id
        SET r.estado = 'completada'
        WHERE r.estado = 'activa' 
          AND f.fecha_reserva < ?
      `, [fechaHoy]);
      
      // Actualizar reservas de hoy cuya hora ya pasó
      await connection.query(`
        UPDATE reserva r
        JOIN fecha f ON r.id_fecha = f.id
        JOIN hora h ON r.id_hora = h.id
        SET r.estado = 'completada'
        WHERE r.estado = 'activa' 
          AND f.fecha_reserva = ?
          AND h.hora_fin < ?
      `, [fechaHoy, horaActual]);
    } finally {
      connection.release();
    }
  }

  // Obtener todas las reservas
  static async getAllReservas() {
    // Primero actualizar estados
    await this.actualizarReservasPasadas();
    
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT 
          r.id, r.numero_reserva, r.id_sala, n.nombre_persona, s.nombre as sala,
          f.fecha_reserva, h.hora_inicio, h.hora_fin, r.estado, r.created_at
        FROM reserva r
        JOIN nombre n ON r.id_nombre = n.id
        JOIN sala s ON r.id_sala = s.id
        JOIN fecha f ON r.id_fecha = f.id
        JOIN hora h ON r.id_hora = h.id
        ORDER BY f.fecha_reserva DESC
      `);
      
      // Para cada reserva, obtener sus equipos
      for (let reserva of rows) {
        const [equipos] = await connection.query(`
          SELECT e.id, e.nombre
          FROM prestamo p
          JOIN equipo e ON p.id_equipo = e.id
          WHERE p.id_reserva = ?
        `, [reserva.id]);
        reserva.equipos = equipos;
      }
      
      return rows;
    } finally {
      connection.release();
    }
  }

  // Obtener reservas por sala y fecha
  static async getReservasBySalaAndFecha(id_sala, fecha) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT 
          r.id, r.numero_reserva, n.nombre_persona, s.nombre as sala,
          f.fecha_reserva, h.hora_inicio, h.hora_fin, r.estado
        FROM reserva r
        JOIN nombre n ON r.id_nombre = n.id
        JOIN sala s ON r.id_sala = s.id
        JOIN fecha f ON r.id_fecha = f.id
        JOIN hora h ON r.id_hora = h.id
        WHERE r.id_sala = ? AND f.fecha_reserva = ? AND r.estado = 'activa'
        ORDER BY h.hora_inicio
      `, [id_sala, fecha]);
      return rows;
    } finally {
      connection.release();
    }
  }

  // Verificar disponibilidad
  static async checkDisponibilidad(id_sala, id_fecha, id_hora) {
    const connection = await pool.getConnection();
    try {
      // Obtener hora_inicio y hora_fin de la reserva nueva
      const [horaNew] = await connection.query('SELECT hora_inicio, hora_fin FROM hora WHERE id = ?', [id_hora]);
      if (horaNew.length === 0) return false;

      const { hora_inicio, hora_fin } = horaNew[0];

      // Buscar reservas activas en la misma sala y fecha que se solapen con el horario
      const [rows] = await connection.query(`
        SELECT COUNT(*) as count FROM reserva r
        JOIN hora h ON r.id_hora = h.id
        WHERE r.id_sala = ? AND r.id_fecha = ? AND r.estado = 'activa'
          AND h.hora_inicio < ? AND h.hora_fin > ?
      `, [id_sala, id_fecha, hora_fin, hora_inicio]);
      return rows[0].count === 0;
    } finally {
      connection.release();
    }
  }

  // Cancelar reserva
  static async cancelarReserva(id) {
    const connection = await pool.getConnection();
    try {
      await connection.query('UPDATE reserva SET estado = ? WHERE id = ?', ['cancelada', id]);
      return true;
    } finally {
      connection.release();
    }
  }

  // Obtener reserva por ID
  static async getReservaById(id) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT 
          r.id, r.numero_reserva, n.nombre_persona, s.nombre as sala,
          f.fecha_reserva, h.hora_inicio, h.hora_fin, r.estado
        FROM reserva r
        JOIN nombre n ON r.id_nombre = n.id
        JOIN sala s ON r.id_sala = s.id
        JOIN fecha f ON r.id_fecha = f.id
        JOIN hora h ON r.id_hora = h.id
        WHERE r.id = ?
      `, [id]);
      return rows[0] || null;
    } finally {
      connection.release();
    }
  }
}

module.exports = ReservaModel;
