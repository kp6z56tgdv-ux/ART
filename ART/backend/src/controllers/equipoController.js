const EquipoModel = require('../models/equipoModel');

class EquipoController {
  // Obtener todos los equipos
  static async obtenerEquipos(req, res) {
    try {
      const equipos = await EquipoModel.getAllEquipos();
      res.json(equipos);
    } catch (error) {
      console.error('Error al obtener equipos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener equipo por ID
  static async obtenerEquipo(req, res) {
    try {
      const { id } = req.params;
      const equipo = await EquipoModel.getEquipoById(id);
      
      if (!equipo) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      res.json(equipo);
    } catch (error) {
      console.error('Error al obtener equipo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear equipo
  static async crearEquipo(req, res) {
    try {
      const { nombre, descripcion, cantidad, disponible } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Nombre de equipo es requerido',
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

      if (!cantidad || isNaN(parseInt(cantidad)) || parseInt(cantidad) < 1) {
        return res.status(400).json({ 
          success: false,
          error: 'Cantidad debe ser un número mayor a 0',
          field: 'cantidad'
        });
      }

      const cantidadInt = parseInt(cantidad);
      const disponibleInt = disponible ? parseInt(disponible) : cantidadInt;

      if (disponibleInt < 0 || disponibleInt > cantidadInt) {
        return res.status(400).json({ 
          success: false,
          error: 'Disponible no puede ser menor a 0 ni mayor que cantidad total',
          field: 'disponible'
        });
      }

      if (descripcion && descripcion.length > 500) {
        return res.status(400).json({ 
          success: false,
          error: 'Descripción no puede exceder 500 caracteres',
          field: 'descripcion'
        });
      }

      const id = await EquipoModel.createEquipo({
        nombre: nombre.trim(),
        descripcion: descripcion || '',
        cantidad: cantidadInt,
        disponible: disponibleInt
      });

      res.status(201).json({
        success: true,
        message: 'Equipo creado exitosamente',
        id
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          error: 'Ya existe un equipo con este nombre'
        });
      }
      console.error('Error al crear equipo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar equipo
  static async actualizarEquipo(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion, cantidad, disponible } = req.body;

      const equipo = await EquipoModel.getEquipoById(id);
      if (!equipo) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      await EquipoModel.updateEquipo(id, {
        nombre: nombre || equipo.nombre,
        descripcion: descripcion !== undefined ? descripcion : equipo.descripcion,
        cantidad: cantidad !== undefined ? cantidad : equipo.cantidad,
        disponible: disponible !== undefined ? disponible : equipo.disponible
      });

      res.json({
        success: true,
        message: 'Equipo actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar equipo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar equipo
  static async eliminarEquipo(req, res) {
    try {
      const { id } = req.params;

      const equipo = await EquipoModel.getEquipoById(id);
      if (!equipo) {
        return res.status(404).json({ error: 'Equipo no encontrado' });
      }

      await EquipoModel.deleteEquipo(id);

      res.json({
        success: true,
        message: 'Equipo eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar equipo:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}

module.exports = EquipoController;
