const express = require('express');
const router = express.Router();
const SalaController = require('../controllers/salaController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', SalaController.obtenerSalas);
router.get('/:id', SalaController.obtenerSala);

router.post('/crear', authMiddleware, SalaController.crearSala);
router.put('/:id', authMiddleware, SalaController.actualizarSala);
router.delete('/:id', authMiddleware, SalaController.eliminarSala);

module.exports = router;
