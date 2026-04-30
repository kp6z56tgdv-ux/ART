const AdminEmailModel = require('../models/adminEmailModel');

async function listar(req, res) {
  try {
    const emails = await AdminEmailModel.getAll();
    res.json(emails);
  } catch (err) {
    console.error('Error al listar correos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function crear(req, res) {
  const { email, nombre } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }

  try {
    const id = await AdminEmailModel.create(email.trim().toLowerCase(), nombre?.trim());
    res.status(201).json({ id, message: 'Correo agregado correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este correo ya está registrado' });
    }
    console.error('Error al crear correo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function actualizar(req, res) {
  const { id } = req.params;
  const { email, nombre, activo } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Correo electrónico inválido' });
  }

  try {
    const ok = await AdminEmailModel.update(parseInt(id), email.trim().toLowerCase(), nombre?.trim(), activo !== false);
    if (!ok) return res.status(404).json({ error: 'Correo no encontrado' });
    res.json({ message: 'Correo actualizado correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este correo ya está registrado' });
    }
    console.error('Error al actualizar correo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function eliminar(req, res) {
  const { id } = req.params;

  try {
    const ok = await AdminEmailModel.delete(parseInt(id));
    if (!ok) return res.status(404).json({ error: 'Correo no encontrado' });
    res.json({ message: 'Correo eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar correo:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { listar, crear, actualizar, eliminar };
