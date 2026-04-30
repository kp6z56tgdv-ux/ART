const express = require('express');
const router = express.Router();
const ReservaController = require('../controllers/reservaController');
const authMiddleware = require('../middleware/authMiddleware');

// Rutas públicas (usadas por la página de reservas)
router.post('/crear', ReservaController.crearReserva);
router.get('/sala-fecha', ReservaController.obtenerReservasSalaFecha);

// Rutas protegidas (solo admin)
router.get('/', authMiddleware, ReservaController.obtenerReservas);
router.get('/buscar', authMiddleware, ReservaController.buscarReservas);
router.get('/reportes/sala/:id', authMiddleware, ReservaController.obtenerReporteSala);
router.get('/:id', authMiddleware, ReservaController.obtenerReserva);
router.delete('/:id', authMiddleware, ReservaController.cancelarReserva);

module.exports = router;
