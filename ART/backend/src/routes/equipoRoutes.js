const express = require('express');
const router = express.Router();
const EquipoController = require('../controllers/equipoController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', EquipoController.obtenerEquipos);
router.get('/:id', EquipoController.obtenerEquipo);

router.post('/crear', authMiddleware, EquipoController.crearEquipo);
router.put('/:id', authMiddleware, EquipoController.actualizarEquipo);
router.delete('/:id', authMiddleware, EquipoController.eliminarEquipo);

module.exports = router;
