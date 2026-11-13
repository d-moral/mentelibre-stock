const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

router.get('/', clienteController.listar);
router.get('/dni/:dni', clienteController.obtenerPorDni);
router.get('/:id', clienteController.obtenerUno);
router.put('/:id/revendedor', clienteController.actualizarRevendedor);
router.get('/:id/historial', clienteController.obtenerHistorial);

module.exports = router;