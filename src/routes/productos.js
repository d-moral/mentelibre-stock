const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');

router.get('/', productoController.listar);
router.get('/mas-vendidos', productoController.masVendidos);
router.get('/rotacion', productoController.rotacion);
router.get('/:id', productoController.obtenerUno);
router.post('/', productoController.crear);
router.put('/:id', productoController.actualizar);
router.delete('/:id', productoController.eliminar);

router.patch('/:id/stock', productoController.reponerStock);
module.exports = router;