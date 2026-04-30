const express = require('express');
const router = express.Router();
const { listar, crear, actualizar, eliminar } = require('../controllers/adminEmailController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', listar);
router.post('/', crear);
router.put('/:id', actualizar);
router.delete('/:id', eliminar);

module.exports = router;
