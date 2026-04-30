const SalaModel = require('../models/salaModel');

class SalaController {
  // Obtener todas las salas
  static async obtenerSalas(req, res) {
    try {
      const salas = await SalaModel.getAllSalas();
      res.json(salas);
    } catch (error) {
      console.error('Error al obtener salas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener sala por ID
  static async obtenerSala(req, res) {
    try {
      const { id } = req.params;
      const sala = await SalaModel.getSalaById(id);
      
      if (!sala) {
        return res.status(404).json({ error: 'Sala no encontrada' });
      }

      res.json(sala);
    } catch (error) {
      console.error('Error al obtener sala:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear sala
  static async crearSala(req, res) {
    try {
      const { nombre, descripcion, aire_acondicionado, television, capacidad } = req.body;

      // Validaciones
      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Nombre de sala es requerido',
          field: 'nombre'
        });
      }

      if (nombre.length > 100) {
        return res.status(400).json({ 
          success: false,
          error: 'Nombre no puede exceder 100 caracteres',
          field: 'nombre'
        });
      }

      if (descripcion && descripcion.length > 500) {
        return res.status(400).json({ 
          success: false,
          error: 'Descripción no puede exceder 500 caracteres',
          field: 'descripcion'
        });
      }

      if (capacidad && (isNaN(parseInt(capacidad)) || parseInt(capacidad) < 1)) {
        return res.status(400).json({ 
          success: false,
          error: 'Capacidad debe ser un número mayor a 0',
          field: 'capacidad'
        });
      }

      const id = await SalaModel.createSala({
        nombre: nombre.trim(),
        descripcion: descripcion || '',
        aire_acondicionado: aire_acondicionado === true,
        television: television === true,
        capacidad: parseInt(capacidad) || 1
      });

      res.status(201).json({
        success: true,
        message: 'Sala creada exitosamente',
        id
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: 'Ya existe una sala con este nombre'
        });
      }
      console.error('Error al crear sala:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar sala
  static async actualizarSala(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, aire_acondicionado, television } = req.body;

      const sala = await SalaModel.getSalaById(id);
      if (!sala) {
        return res.status(404).json({ error: 'Sala no encontrada' });
      }

      await SalaModel.updateSala(id, {
        nombre: nombre || sala.nombre,
        descripcion: descripcion !== undefined ? descripcion : sala.descripcion,
        aire_acondicionado: aire_acondicionado !== undefined ? aire_acondicionado : sala.aire_acondicionado,
        television: television !== undefined ? television : sala.television
      });

      res.json({
        success: true,
        message: 'Sala actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar sala:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar sala
  static async eliminarSala(req, res) {
    try {
      const { id } = req.params;

      const sala = await SalaModel.getSalaById(id);
      if (!sala) {
        return res.status(404).json({ error: 'Sala no encontrada' });
      }

      await SalaModel.deleteSala(id);

      res.json({
        success: true,
        message: 'Sala eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar sala:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = SalaController;
