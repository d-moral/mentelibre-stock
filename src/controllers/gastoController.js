const Gasto = require('../models/gasto');

async function listar(req, res) {
    try {
        const gastos = await Gasto.getAll();
        res.json(gastos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar gastos' });
    }
}

async function crear(req, res) {
    try {
        const { descripcion, monto, fecha } = req.body;
        if (!descripcion || !monto) {
            return res.status(400).json({ error: 'Descripción y monto son obligatorios' });
        }
        const gasto = await Gasto.crear({ descripcion, monto, fecha });
        res.status(201).json(gasto);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear gasto' });
    }
}

async function eliminar(req, res) {
    try {
        const { id } = req.params;
        await Gasto.eliminar(id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar gasto' });
    }
}

async function totalEnRango(req, res) {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) return res.status(400).json({ error: 'Faltan los parámetros desde y hasta' });
        const total = await Gasto.totalEnRango(desde, hasta);
        res.json({ total });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al calcular el total de gastos' });
    }
}

module.exports = { listar, crear, eliminar, totalEnRango };