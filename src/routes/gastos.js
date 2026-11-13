const express = require('express');
const router = express.Router();
const gastoController = require('../controllers/gastoController');

router.get('/total', gastoController.totalEnRango);
router.get('/', gastoController.listar);
router.post('/', gastoController.crear);
router.delete('/:id', gastoController.eliminar);

module.exports = router;