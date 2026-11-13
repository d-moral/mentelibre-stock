const express = require('express');
const router = express.Router();
const busquedaController = require('../controllers/busquedaController');

router.get('/', busquedaController.buscarGlobal);

module.exports = router;