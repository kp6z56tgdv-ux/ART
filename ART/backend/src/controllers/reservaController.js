const ReservaModel = require('../models/reservaModel');
const NombreModel = require('../models/nombreModel');
const { pool } = require('../config/database');
const { enviarCorreoReserva } = require('../utils/emailService');

class ReservaController {
  // Crear reserva
  static async crearReserva(req, res) {
    try {
      const { nombre_persona, id_sala, fecha_reserva, hora_inicio, hora_fin, email, telefono, notas, equipos, razon_cancelacion } = req.body;

      // Validaciones exhaustivas
      if (!nombre_persona || nombre_persona.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Nombre de persona es requerido',
          field: 'nombre_persona'
        });
      }

      if (nombre_persona.length > 100) {
        return res.status(400).json({ 
          success: false,
          error: 'Nombre no puede exceder 100 caracteres',
          field: 'nombre_persona'
        });
      }

      if (!id_sala || isNaN(parseInt(id_sala))) {
        return res.status(400).json({ 
          success: false,
          error: 'ID de sala inválido',
          field: 'id_sala'
        });
      }

      if (!fecha_reserva) {
        return res.status(400).json({ 
          success: false,
          error: 'Fecha de reserva es requerida',
          field: 'fecha_reserva'
        });
      }

      // Validar que la fecha sea futura o hoy
      // Parsear correctamente la fecha (YYYY-MM-DD) para evitar problemas de zona horaria
      const [year, month, day] = fecha_reserva.split('-');
      const fechaReserva = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      fechaReserva.setHours(0, 0, 0, 0);
      
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      if (fechaReserva < hoy) {
        return res.status(400).json({ 
          success: false,
          error: 'La fecha debe ser igual o posterior a hoy',
          field: 'fecha_reserva'
        });
      }

      if (!hora_inicio || !/^\d{2}:\d{2}$/.test(hora_inicio)) {
        return res.status(400).json({ 
          success: false,
          error: 'Hora de inicio inválida (formato: HH:MM)',
          field: 'hora_inicio'
        });
      }

      if (!hora_fin || !/^\d{2}:\d{2}$/.test(hora_fin)) {
        return res.status(400).json({ 
          success: false,
          error: 'Hora de fin inválida (formato: HH:MM)',
          field: 'hora_fin'
        });
      }

      // Validar rango horario
      const inicio = new Date(`2000-01-01 ${hora_inicio}`);
      const fin = new Date(`2000-01-01 ${hora_fin}`);
      
      if (fin <= inicio) {
        return res.status(400).json({ 
          success: false,
          error: 'La hora de fin debe ser posterior a la de inicio',
          field: 'hora_fin'
        });
      }

      // Si la reserva es para hoy, validar que la hora no haya pasado
      if (fechaReserva.getTime() === hoy.getTime()) {
        const ahora = new Date();
        const horaActualMinutos = ahora.getHours() * 60 + ahora.getMinutes();
        
        const [horaInicioH, horaInicioM] = hora_inicio.split(':').map(Number);
        const horaInicioMinutos = horaInicioH * 60 + horaInicioM;
        
        if (horaInicioMinutos <= horaActualMinutos) {
          return res.status(400).json({ 
            success: false,
            error: 'No se puede reservar para una hora que ya ha pasado hoy',
            field: 'hora_inicio'
          });
        }
      }

      // Validar email si se proporciona
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ 
          success: false,
          error: 'Formato de email inválido',
          field: 'email'
        });
      }

      // Validar teléfono si se proporciona
      if (telefono && telefono.length < 7) {
        return res.status(400).json({ 
          success: false,
          error: 'Teléfono inválido',
          field: 'telefono'
        });
      }

      if (notas && notas.length > 500) {
        return res.status(400).json({ 
          success: false,
          error: 'Notas no pueden exceder 500 caracteres',
          field: 'notas'
        });
      }

      // Crear o obtener persona
      let id_nombre;
      const connection = await pool.getConnection();
      
      try {
        const [personas] = await connection.query(
          'SELECT id FROM nombre WHERE nombre_persona = ?',
          [nombre_persona]
        );

        if (personas.length > 0) {
          id_nombre = personas[0].id;
        } else {
          const [result] = await connection.query(
            'INSERT INTO nombre (nombre_persona, email, telefono) VALUES (?, ?, ?)',
            [nombre_persona, email || '', telefono || '']
          );
          id_nombre = result.insertId;
        }

        // Crear o obtener fecha
        const [fechas] = await connection.query(
          'SELECT id FROM fecha WHERE fecha_reserva = ?',
          [fecha_reserva]
        );

        let id_fecha;
        if (fechas.length > 0) {
          id_fecha = fechas[0].id;
        } else {
          const [resultFecha] = await connection.query(
            'INSERT INTO fecha (fecha_reserva) VALUES (?)',
            [fecha_reserva]
          );
          id_fecha = resultFecha.insertId;
        }

        // Crear o obtener hora
        const [horas] = await connection.query(
          'SELECT id FROM hora WHERE hora_inicio = ? AND hora_fin = ?',
          [hora_inicio, hora_fin]
        );

        let id_hora;
        if (horas.length > 0) {
          id_hora = horas[0].id;
        } else {
          const [resultHora] = await connection.query(
            'INSERT INTO hora (hora_inicio, hora_fin) VALUES (?, ?)',
            [hora_inicio, hora_fin]
          );
          id_hora = resultHora.insertId;
        }

        // Verificar disponibilidad de sala
        const disponible = await ReservaModel.checkDisponibilidad(id_sala, id_fecha, id_hora);
        
        if (!disponible) {
          const reservaExistente = await ReservaModel.getReservasBySalaAndFecha(id_sala, fecha_reserva);
          const horaConflicto = reservaExistente.find(r => {
            const inicio1 = new Date(`2000-01-01 ${r.hora_inicio}`);
            const fin1 = new Date(`2000-01-01 ${r.hora_fin}`);
            const inicio2 = new Date(`2000-01-01 ${hora_inicio}`);
            const fin2 = new Date(`2000-01-01 ${hora_fin}`);
            return !(fin1 <= inicio2 || fin2 <= inicio1);
          });
          
          return res.status(409).json({ 
            error: 'La sala está ocupada en ese horario',
            ocupada_por: horaConflicto ? horaConflicto.nombre_persona : 'Desconocido'
          });
        }

        // Verificar disponibilidad de equipos si se solicitaron
        if (equipos && equipos.length > 0) {
          for (const idEquipo of equipos) {
            // Verificar si el equipo está reservado en ese horario
            const [equiposReservados] = await connection.query(`
              SELECT p.id_equipo, COUNT(*) as cantidad_reservada
              FROM prestamo p
              INNER JOIN reserva r ON p.id_reserva = r.id
              INNER JOIN fecha f ON r.id_fecha = f.id
              INNER JOIN hora h ON r.id_hora = h.id
              WHERE p.id_equipo = ? 
                AND f.fecha_reserva = ?
                AND NOT (h.hora_fin <= ? OR h.hora_inicio >= ?)
                AND r.estado = 'activa'
              GROUP BY p.id_equipo
            `, [idEquipo, fecha_reserva, hora_inicio, hora_fin]);

            // Obtener información del equipo
            const [equipo] = await connection.query('SELECT nombre, cantidad, disponible FROM equipo WHERE id = ?', [idEquipo]);
            
            if (equipo.length === 0) {
              return res.status(404).json({ error: 'Equipo no encontrado' });
            }

            const cantidadTotal = equipo[0].cantidad;
            const cantidadReservada = equiposReservados.length > 0 ? equiposReservados[0].cantidad_reservada : 0;
            const disponible = cantidadTotal - cantidadReservada;

            if (disponible <= 0) {
              return res.status(409).json({ 
                error: `El equipo "${equipo[0].nombre}" no está disponible en ese horario. Ya está reservado.`
              });
            }
          }
        }

        // Crear reserva
        const reserva = await ReservaModel.createReserva({
          id_nombre,
          id_sala,
          id_fecha,
          id_hora,
          notas: notas || ''
        });

        // Si hay equipos, crear los préstamos
        if (equipos && equipos.length > 0) {
          for (const idEquipo of equipos) {
            await connection.query(
              'INSERT INTO prestamo (id_reserva, id_equipo, id_sala, id_nombre) VALUES (?, ?, ?, ?)',
              [reserva.id, idEquipo, id_sala, id_nombre]
            );
          }
        }

        // Obtener nombre de la sala
        const [salaInfo] = await connection.query('SELECT nombre FROM sala WHERE id = ?', [id_sala]);
        const nombreSala = salaInfo.length > 0 ? salaInfo[0].nombre : 'Sala desconocida';

        // Obtener nombres de equipos solicitados
        let equiposInfo = [];
        if (equipos && equipos.length > 0) {
          const [rows] = await connection.query('SELECT nombre FROM equipo WHERE id IN (?)', [equipos]);
          equiposInfo = rows;
        }

        // Enviar correo de notificación (no bloquea la respuesta)
        enviarCorreoReserva({
          nombre_persona,
          sala: nombreSala,
          fecha_reserva,
          hora_inicio,
          hora_fin,
          equipos: equiposInfo,
          notas: notas || '',
          numero_reserva: reserva.numeroReserva,
          email: email || '',
          telefono: telefono || ''
        });

        res.status(201).json({
          success: true,
          message: 'Reserva creada exitosamente',
          reserva_id: reserva.id,
          numero_reserva: reserva.numeroReserva
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error al crear reserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener todas las reservas
  static async obtenerReservas(req, res) {
    try {
      // Actualizar estados antes de consultar
      await ReservaModel.actualizarReservasPasadas();
      const reservas = await ReservaModel.getAllReservas();
      res.json(reservas);
    } catch (error) {
      console.error('Error al obtener reservas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener reservas de una sala en una fecha específica
  static async obtenerReservasSalaFecha(req, res) {
    try {
      const { id_sala, fecha } = req.query;
      
      if (!id_sala || !fecha) {
        return res.status(400).json({ error: 'Parámetros faltantes' });
      }

      const reservas = await ReservaModel.getReservasBySalaAndFecha(id_sala, fecha);
      res.json(reservas);
    } catch (error) {
      console.error('Error al obtener reservas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Cancelar reserva
  static async cancelarReserva(req, res) {
    try {
      const { id } = req.params;
      const { razon_cancelacion } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID de reserva requerido' });
      }

      const reserva = await ReservaModel.getReservaById(id);
      
      if (!reserva) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      if (reserva.estado !== 'activa') {
        return res.status(400).json({ 
          error: `No se puede cancelar una reserva con estado ${reserva.estado}` 
        });
      }

      // Actualizar reserva con razón de cancelación
      const connection = await pool.getConnection();
      try {
        await connection.query(
          'UPDATE reserva SET estado = ?, razon_cancelacion = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['cancelada', razon_cancelacion || '', id]
        );
      } finally {
        connection.release();
      }

      res.json({
        success: true,
        message: 'Reserva cancelada exitosamente'
      });
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener reserva por ID
  static async obtenerReserva(req, res) {
    try {
      const { id } = req.params;
      const reserva = await ReservaModel.getReservaById(id);
      
      if (!reserva) {
        return res.status(404).json({ error: 'Reserva no encontrada' });
      }

      res.json(reserva);
    } catch (error) {
      console.error('Error al obtener reserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Búsqueda avanzada con filtros y paginación
  static async buscarReservas(req, res) {
    try {      // Actualizar estados antes de buscar
      await ReservaModel.actualizarReservasPasadas();
            const { 
        nombre, 
        id_sala, 
        estado, 
        fecha_inicio, 
        fecha_fin, 
        pagina = 1, 
        limite = 10 
      } = req.query;

      const offset = (parseInt(pagina) - 1) * parseInt(limite);
      
      let query = 'SELECT r.*, n.nombre_persona, s.nombre as sala FROM reserva r JOIN nombre n ON r.id_nombre = n.id JOIN sala s ON r.id_sala = s.id WHERE 1=1';
      const params = [];

      if (nombre) {
        query += ' AND n.nombre_persona LIKE ?';
        params.push(`%${nombre}%`);
      }

      if (id_sala) {
        query += ' AND r.id_sala = ?';
        params.push(id_sala);
      }

      if (estado) {
        query += ' AND r.estado = ?';
        params.push(estado);
      }

      if (fecha_inicio) {
        query += ' AND r.fecha_reserva >= ?';
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        query += ' AND r.fecha_reserva <= ?';
        params.push(fecha_fin);
      }

      query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limite), offset);

      const [reservas] = await pool.query(query, params);
      
      // Contar total de registros
      let countQuery = 'SELECT COUNT(*) as total FROM reserva r JOIN nombre n ON r.id_nombre = n.id JOIN sala s ON r.id_sala = s.id WHERE 1=1';
      const countParams = [];

      if (nombre) {
        countQuery += ' AND n.nombre_persona LIKE ?';
        countParams.push(`%${nombre}%`);
      }

      if (id_sala) {
        countQuery += ' AND r.id_sala = ?';
        countParams.push(id_sala);
      }

      if (estado) {
        countQuery += ' AND r.estado = ?';
        countParams.push(estado);
      }

      if (fecha_inicio) {
        countQuery += ' AND r.fecha_reserva >= ?';
        countParams.push(fecha_inicio);
      }

      if (fecha_fin) {
        countQuery += ' AND r.fecha_reserva <= ?';
        countParams.push(fecha_fin);
      }

      const [countResult] = await pool.query(countQuery, countParams);
      const total = countResult[0].total;

      res.json({
        success: true,
        data: reservas,
        pagination: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total,
          total_paginas: Math.ceil(total / parseInt(limite))
        }
      });
    } catch (error) {
      console.error('Error al buscar reservas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener reporte de uso por sala
  static async obtenerReporteSala(req, res) {
    try {
      const { id } = req.params;
      const { fecha_inicio, fecha_fin } = req.query;

      if (!id || isNaN(parseInt(id))) {
        return res.status(400).json({ error: 'ID de sala inválido' });
      }

      let query = `
        SELECT 
          s.id, s.nombre, s.descripcion,
          COUNT(r.id) as total_reservas,
          SUM(TIMESTAMPDIFF(HOUR, h.hora_inicio, h.hora_fin)) as total_horas,
          COUNT(CASE WHEN r.estado = 'completada' THEN 1 END) as completadas,
          COUNT(CASE WHEN r.estado = 'cancelada' THEN 1 END) as canceladas,
          COUNT(CASE WHEN r.estado = 'activa' THEN 1 END) as activas
        FROM sala s
        LEFT JOIN reserva r ON s.id = r.id_sala AND r.deleted_at IS NULL
        LEFT JOIN fecha f ON r.id_fecha = f.id
        LEFT JOIN hora h ON r.id_hora = h.id
        WHERE s.id = ?
      `;

      const params = [id];

      if (fecha_inicio) {
        query += ' AND f.fecha_reserva >= ?';
        params.push(fecha_inicio);
      }

      if (fecha_fin) {
        query += ' AND f.fecha_reserva <= ?';
        params.push(fecha_fin);
      }

      query += ' GROUP BY s.id';

      const [result] = await pool.query(query, params);

      if (result.length === 0) {
        return res.status(404).json({ error: 'Sala no encontrada' });
      }

      res.json({
        success: true,
        data: result[0]
      });
    } catch (error) {
      console.error('Error al obtener reporte:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = ReservaController;
