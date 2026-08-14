const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');

router.get('/', pedidoController.listar);
router.get('/:id', pedidoController.obtenerUno);
router.post('/', pedidoController.crear);
router.put('/:id/estado', pedidoController.cambiarEstado);
router.get('/:id/boleta', pedidoController.descargarBoleta);
router.put('/:id', pedidoController.actualizar);

module.exports = router;