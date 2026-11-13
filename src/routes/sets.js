const express = require('express');
const router = express.Router();
const setController = require('../controllers/setController');

router.get('/', setController.listar);
router.get('/:id', setController.obtenerUno);
router.post('/', setController.crear);
router.put('/:id', setController.actualizar);
router.patch('/:id/cancelar', setController.cancelar);
router.patch('/:id/stock', setController.reponerStock);

module.exports = router;