const express = require('express');
const router = express.Router();
const productoDetalleController = require('../controllers/productoDetalleController');

router.get('/', productoDetalleController.listarActivos);
router.get('/historial', productoDetalleController.listarHistorial);
router.get('/producto/:id', productoDetalleController.listarPorProducto);
router.post('/producto/:id', productoDetalleController.crear);
router.get('/:id', productoDetalleController.obtenerPorId);
router.put('/:id', productoDetalleController.actualizar);
router.delete('/:id', productoDetalleController.cancelar);

module.exports = router;